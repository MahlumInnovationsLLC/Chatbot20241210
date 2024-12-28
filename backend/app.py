###############################################################################
# app.py
###############################################################################
from flask import Flask, send_from_directory, request, jsonify, send_file
import os
import re
import uuid
import traceback
from io import BytesIO
from docx import Document

from openai import AzureOpenAI

# For reading images, DOCX, PDF (via Form Recognizer)
from vision_api import analyze_image_from_bytes
from document_processing import extract_text_from_docx
from azure.ai.formrecognizer import DocumentAnalysisClient
from azure.core.credentials import AzureKeyCredential

# Azure Cosmos + SendGrid
from azure.cosmos import CosmosClient, PartitionKey, exceptions
import sendgrid
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content

# Azure Cognitive Search
from azure.search.documents import SearchClient
from azure.core.credentials import AzureKeyCredential

# Azure Blob (temp container)
from azure.storage.blob import BlobServiceClient, ContentSettings

app = Flask(__name__, static_folder='src/public', static_url_path='')


###############################################################################
# 1. Cosmos DB Setup
###############################################################################
COSMOS_ENDPOINT = os.environ.get("COSMOS_ENDPOINT", "")
COSMOS_KEY = os.environ.get("COSMOS_KEY", "")
COSMOS_DATABASE_ID = "GYMAIEngineDB"
COSMOS_CONTAINER_ID = "chats"

try:
    cosmos_client = CosmosClient(COSMOS_ENDPOINT, credential=COSMOS_KEY)
    database = cosmos_client.create_database_if_not_exists(id=COSMOS_DATABASE_ID)
    container = database.create_container_if_not_exists(
        id=COSMOS_CONTAINER_ID,
        partition_key=PartitionKey(path="/userKey"),
        offer_throughput=400
    )
except exceptions.CosmosHttpResponseError as e:
    app.logger.error("Cosmos DB setup error: %s", e)

###############################################################################
# 1.2 SendGrid Setup
###############################################################################
SENDGRID_API_KEY = os.environ.get("SENDGRID_API_KEY", "")
if not SENDGRID_API_KEY:
    app.logger.warning("Missing SENDGRID_API_KEY (sendgrid usage might fail).")

###############################################################################
# 1.3 Azure Form Recognizer Setup
###############################################################################
FORM_RECOGNIZER_ENDPOINT = os.environ.get("FORM_RECOGNIZER_ENDPOINT", "")
FORM_RECOGNIZER_KEY = os.environ.get("FORM_RECOGNIZER_KEY", "")

###############################################################################
# 1.4 Azure Storage (Temp Container) Setup
###############################################################################
AZURE_STORAGE_CONNECTION_STRING = os.environ.get("AZURE_STORAGE_CONNECTION_STRING", "")
AZURE_TEMP_CONTAINER = os.environ.get("AZURE_TEMP_CONTAINER", "temp-uploads")

blob_service_client = None
temp_container_client = None
if AZURE_STORAGE_CONNECTION_STRING:
    try:
        blob_service_client = BlobServiceClient.from_connection_string(AZURE_STORAGE_CONNECTION_STRING)
        temp_container_client = blob_service_client.get_container_client(AZURE_TEMP_CONTAINER)
        temp_container_client.create_container()  # idempotent, no error if container exists
    except Exception as ex:
        app.logger.error("Error initializing BlobServiceClient for temp container: %s", ex)
else:
    app.logger.warning("No AZURE_STORAGE_CONNECTION_STRING found. Temp file uploads will fail.")


###############################################################################
# For calling AzureOpenAI
###############################################################################
client = AzureOpenAI(
    api_key=os.environ.get("AZURE_OPENAI_KEY"),
    azure_endpoint=os.environ.get("AZURE_OPENAI_ENDPOINT"),
    api_version="2023-05-15"
)
AZURE_DEPLOYMENT_NAME = "GYMAIEngine-gpt-4o"  # Make sure this matches your deployment name

###############################################################################
# 2. Helper: Detailed report
###############################################################################
def generate_detailed_report(base_content):
    detail_messages = [
        {
            "role": "system",
            "content": (
                "You are a helpful assistant that specializes in creating detailed, "
                "comprehensive reports."
            )
        },
        {
            "role": "user",
            "content": (
                "Here is a brief summary: " + base_content + "\n\n"
                "Please create a significantly more in-depth and expanded report."
            )
        }
    ]
    try:
        detail_response = client.chat.completions.create(
            messages=detail_messages,
            model=AZURE_DEPLOYMENT_NAME
        )
        return detail_response.choices[0].message.content
    except Exception as e:
        app.logger.error("Error calling AzureOpenAI for detailed report:", exc_info=True)
        return base_content + "\n\n(Additional detail could not be generated.)"


###############################################################################
# 2.1 PDF extraction with Form Recognizer
###############################################################################
def extract_text_from_pdf(file_bytes):
    if not FORM_RECOGNIZER_ENDPOINT or not FORM_RECOGNIZER_KEY:
        raise ValueError(
            "FORM_RECOGNIZER_ENDPOINT and FORM_RECOGNIZER_KEY must be set to use Form Recognizer."
        )
    try:
        document_client = DocumentAnalysisClient(
            endpoint=FORM_RECOGNIZER_ENDPOINT,
            credential=AzureKeyCredential(FORM_RECOGNIZER_KEY)
        )
        poller = document_client.begin_analyze_document("prebuilt-document", file_bytes)
        result = poller.result()
        all_text = []
        for page in result.pages:
            for line in page.lines:
                all_text.append(line.content)
        return "\n".join(all_text)
    except Exception as ex:
        app.logger.error("Form Recognizer PDF extraction failed:", exc_info=True)
        raise RuntimeError(f"Error extracting text with Form Recognizer: {ex}")


###############################################################################
@app.route('/')
def serve_frontend():
    return send_from_directory('src/public', 'index.html')


###############################################################################
# 3. Chat endpoint (multiple-file version)
###############################################################################
@app.route('/chat', methods=['POST'])
def chat_endpoint():
    """
    Expects either multipart/form-data with:
      - userMessage
      - file (multiple possible)  -> request.files.getlist('file')

    Or JSON with:
      - userMessage
      - userKey
      - (optionally) chatId
    """
    # 3a) parse userKey, chatId
    # default userKey to 'default_user' if none
    user_key = request.args.get('userKey', 'default_user')
    chat_id = None
    user_input = ""

    # If we get multipart, parse from form
    if request.content_type and 'multipart/form-data' in request.content_type:
        user_input = request.form.get('userMessage', '')
        # Maybe we also read a hidden 'chatId' from form
        chat_id = request.form.get('chatId')
        uploaded_files = request.files.getlist('file') or []
    else:
        # JSON approach
        data = request.get_json(force=True)
        user_input = data.get('userMessage', '')
        user_key = data.get('userKey', user_key)  # override if provided
        chat_id = data.get('chatId')  # might be None
        uploaded_files = []

    # If no chatId was provided, you can set a default approach
    # e.g. single doc per user => "singleSession_{user_key}"
    if not chat_id:
        chat_id = f"singleSession_{user_key}"

    # Prepare conversation messages
    messages = [
        {
            "role": "system",
            "content": (
                "You are a helpful assistant using Markdown. "
                "If user requests a downloadable report, must provide `download://report.docx`. "
                "If references, list them, else `References: None`."
            )
        },
        {
            "role": "user",
            "content": user_input
        }
    ]

    # 3b) Retrieve or create doc
    partition_key = user_key
    try:
        chat_doc = container.read_item(chat_id, partition_key)
    except exceptions.CosmosResourceNotFoundError:
        chat_doc = {
            "id": chat_id,
            "userKey": user_key,
            "messages": [],
            "files": []
        }

    # 3c) Loop over multiple uploaded files
    if uploaded_files and temp_container_client:
        for up_file in uploaded_files:
            try:
                if not up_file or not up_file.filename:
                    continue  # skip empty file objects

                file_bytes = up_file.read()
                filename = up_file.filename
                lower_name = filename.lower()

                # detect extension
                if lower_name.endswith('.pdf'):
                    file_ext = 'pdf'
                elif lower_name.endswith(('.png', '.jpg', '.jpeg')):
                    file_ext = 'image'
                elif lower_name.endswith('.docx'):
                    file_ext = 'docx'
                else:
                    file_ext = 'other'

                # Upload to temp container
                blob_client = temp_container_client.get_blob_client(filename)
                content_settings = None
                if file_ext == 'pdf':
                    content_settings = ContentSettings(content_type="application/pdf")
                elif file_ext == 'image':
                    content_settings = ContentSettings(content_type="image/jpeg")
                elif file_ext == 'docx':
                    content_settings = ContentSettings(
                        content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    )
                blob_client.upload_blob(file_bytes, overwrite=True, content_settings=content_settings)

                # ephemeral blob URL
                base_url = temp_container_client.url
                blob_url = f"{base_url}/{filename}"

                # parse text if relevant
                extracted_text = None
                if file_ext == 'pdf':
                    extracted_text = extract_text_from_pdf(file_bytes)
                    # Add system info
                    messages.append({
                        "role": "system",
                        "content": f"PDF '{filename}' uploaded.\nExtracted:\n{extracted_text[:1000]}..."
                    })
                elif file_ext == 'docx':
                    extracted_text = extract_text_from_docx(file_bytes)
                    messages.append({
                        "role": "system",
                        "content": f"DOCX '{filename}' uploaded.\nExtracted:\n{extracted_text[:1000]}..."
                    })
                elif file_ext == 'image':
                    vision_result = analyze_image_from_bytes(file_bytes)
                    described_image = "No description available."
                    if vision_result.description and vision_result.description.captions:
                        described_image = vision_result.description.captions[0].text
                    extracted_text = f"Image AI Description: {described_image}"
                    messages.append({
                        "role": "system",
                        "content": f"Image '{filename}' uploaded.\nAI says: {described_image}"
                    })
                else:
                    # other file, no extraction
                    pass

                # store in doc's "files" array
                chat_doc["files"].append({
                    "filename": filename,
                    "blobUrl": blob_url,
                    "fileExt": file_ext,
                    "extractedText": extracted_text or ""
                })

            except Exception as e:
                app.logger.error("Error uploading file or processing:", exc_info=True)
                messages.append({
                    "role": "assistant",
                    "content": f"Error uploading file '{up_file.filename}': {str(e)}"
                })

        # finished multiple file loop
        messages.append({
            "role": "system",
            "content": "File upload(s) successful. You can now ask questions about them."
        })

    # 3d) Add user message to doc
    chat_doc["messages"].append({
        "role": "user",
        "content": user_input
    })

    # 3e) Call AzureOpenAI
    assistant_reply = ""
    try:
        response = client.chat.completions.create(messages=messages, model=AZURE_DEPLOYMENT_NAME)
        assistant_reply = response.choices[0].message.content
    except Exception as e:
        app.logger.error("Error calling AzureOpenAI:", exc_info=True)
        assistant_reply = f"Error from AzureOpenAI: {e}"

    # parse references
    main_content = assistant_reply
    references_list = []
    if 'References:' in assistant_reply:
        parts = assistant_reply.split('References:')
        main_content = parts[0].strip()
        ref_section = parts[1].strip() if len(parts) > 1 else "None"
        if ref_section.lower().startswith('none'):
            references_list = []
        else:
            for line in ref_section.split('\n'):
                line = line.strip()
                if line.startswith('-'):
                    match = re.match(r"- \[(.*?)\]\((.*?)\): (.*)", line)
                    if match:
                        references_list.append({
                            "name": match.group(1),
                            "url": match.group(2),
                            "description": match.group(3)
                        })

    # check for downloadable report
    download_url = None
    report_content = None
    if 'download://report.docx' in main_content:
        main_content = main_content.replace('download://report.docx', '').strip()
        report_content = generate_detailed_report(main_content)
        download_url = '/api/generateReport'

    # finalize: add assistant reply
    chat_doc["messages"].append({
        "role": "assistant",
        "content": assistant_reply
    })

    # 3f) upsert doc
    # If the same id/partitionKey was previously inserted, this merges.
    container.upsert_item(chat_doc)

    return jsonify({
        "reply": main_content,
        "references": references_list,
        "downloadUrl": download_url,
        "reportContent": report_content
    })


###############################################################################
# Generate and send docx
###############################################################################
@app.route('/api/generateReport', methods=['POST'])
def generate_report():
    data = request.get_json(force=True)
    report_content = data.get('reportContent', 'No content provided')

    lines = report_content.split('\n')
    lines = [l.rstrip() for l in lines]

    # find a heading
    doc_title = "Generated Report"
    for idx, line in enumerate(lines):
        s = line.strip()
        if s.startswith('# '):
            doc_title = s[2:].strip()
            break
        elif s.startswith('## '):
            doc_title = s[3:].strip()
            break
        elif s.startswith('### '):
            doc_title = s[4:].strip()
            break

    safe_title = "".join([c if c.isalnum() else "_" for c in doc_title]) or "report"
    filename = f"{safe_title}.docx"

    doc = Document()
    doc.add_heading(doc_title, 0)

    for line in lines:
        stripped_line = line.strip()
        if not stripped_line:
            doc.add_paragraph('')
            continue

        if stripped_line.startswith('#### '):
            doc.add_heading(stripped_line[5:].strip(), level=4)
        elif stripped_line.startswith('### '):
            doc.add_heading(stripped_line[4:].strip(), level=3)
        elif stripped_line.startswith('## '):
            doc.add_heading(stripped_line[3:].strip(), level=2)
        elif stripped_line.startswith('# '):
            doc.add_heading(stripped_line[2:].strip(), level=1)
        elif re.match(r'^-\s', stripped_line):
            doc.add_paragraph(stripped_line[2:].strip(), style='List Bullet')
        elif re.match(r'^\d+\.\s', stripped_line):
            doc.add_paragraph(
                re.sub(r'^\d+\.\s', '', stripped_line).strip(),
                style='List Number'
            )
        else:
            p = doc.add_paragraph()
            segments = stripped_line.split('**')
            for i, seg in enumerate(segments):
                run = p.add_run(seg)
                if i % 2 == 1:
                    run.bold = True

    byte_io = BytesIO()
    doc.save(byte_io)
    byte_io.seek(0)

    return send_file(
        byte_io,
        as_attachment=True,
        download_name=filename,
        mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )


###############################################################################
# Contact endpoint
###############################################################################
@app.route('/contact', methods=['POST'])
def contact_endpoint():
    data = request.get_json(force=True)
    firstName = data.get('firstName', '')
    lastName = data.get('lastName', '')
    company = data.get('company', '')
    email = data.get('email', '')
    note = data.get('note', '')

    app.logger.info(
        f"Contact form submission:\n"
        f"Name: {firstName} {lastName}\n"
        f"Company: {company}\n"
        f"Email: {email}\n"
        f"Note: {note}"
    )

    try:
        sg = sendgrid.SendGridAPIClient(api_key=SENDGRID_API_KEY)
        from_email = Email("colter@mahluminnovations.com")
        to_email = To("colter@mahluminnovations.com")
        subject = f"Contact Form from {firstName} {lastName}"
        content_text = f"""
        Contact Form Submission:
        Name: {firstName} {lastName}
        Company: {company}
        Email: {email}
        Note: {note}
        """
        content = Content("text/plain", content_text)
        mail = Mail(from_email, to_email, subject, content)
        _ = sg.client.mail.send.post(request_body=mail.get())

        return jsonify({
            "status": "success",
            "message": "Your message has been sent via SendGrid."
        }), 200

    except Exception as e:
        app.logger.error("Error sending email via SendGrid", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500


###############################################################################
# Return all chats for a user
###############################################################################
@app.route('/chats', methods=['GET'])
def get_chats():
    user_key = request.args.get('userKey', '')
    if not user_key:
        return jsonify({"chats": []}), 200

    query = f"SELECT * FROM c WHERE c.userKey=@userKey"
    parameters = [{"name": "@userKey", "value": user_key}]
    items = list(container.query_items(query=query, parameters=parameters, enable_cross_partition_query=True))

    chat_summaries = []
    for doc in items:
        chat_summaries.append({
            "id": doc.get("id"),
            "userKey": doc.get("userKey"),
            "messages": doc.get("messages", []),
            "title": doc.get("title", None),
            "files": doc.get("files", []),
        })
    return jsonify({"chats": chat_summaries}), 200


###############################################################################
# Archive all
###############################################################################
@app.route('/archiveAllChats', methods=['POST'])
def archive_all_chats():
    data = request.get_json(force=True)
    user_key = data.get('userKey', '')
    if not user_key:
        return jsonify({"error": "No userKey provided"}), 400

    query = f"SELECT * FROM c WHERE c.userKey=@userKey"
    parameters = [{"name": "@userKey", "value": user_key}]
    items = list(container.query_items(query=query, parameters=parameters))

    for doc in items:
        doc['archived'] = True
        container.replace_item(doc, doc)

    return jsonify({"success": True}), 200


###############################################################################
# Delete all
###############################################################################
@app.route('/deleteAllChats', methods=['POST'])
def delete_all_chats():
    data = request.get_json(force=True)
    user_key = data.get('userKey', '')
    if not user_key:
        return jsonify({"error": "No userKey provided"}), 400

    # Connect to Azure Storage
    from azure.storage.blob import BlobServiceClient
    if not AZURE_STORAGE_CONNECTION_STRING:
        app.logger.error("AZURE_STORAGE_CONNECTION_STRING not set. Unable to delete blobs.")
        container_client = None
    else:
        try:
            blob_service_client = BlobServiceClient.from_connection_string(AZURE_STORAGE_CONNECTION_STRING)
            container_client = blob_service_client.get_container_client("gymaitempcontainer")
        except Exception as e:
            app.logger.error("Could not connect to azure storage container:", exc_info=True)
            container_client = None

    # Query all chat docs for this user
    query = f"SELECT * FROM c WHERE c.userKey=@userKey"
    parameters = [{"name": "@userKey", "value": user_key}]
    items = list(container.query_items(query=query, parameters=parameters))

    for doc in items:
        # if we have ephemeral files
        files_list = doc.get("files", [])
        if container_client is not None and files_list:
            for f in files_list:
                blob_name = f["filename"]  # or parse from f["blobUrl"]
                try:
                    container_client.delete_blob(blob_name)
                    app.logger.info(f"Deleted blob '{blob_name}' from gymaitempcontainer.")
                except Exception as ex:
                    app.logger.error(f"Error deleting blob '{blob_name}': {ex}", exc_info=True)

        # then delete doc from cosmos
        container.delete_item(item=doc['id'], partition_key=doc['userKey'])

    return jsonify({"success": True}), 200


###############################################################################
# Rename Chat
###############################################################################
@app.route('/renameChat', methods=['POST'])
def rename_chat():
    data = request.get_json(force=True)
    user_key = data.get('userKey', 'default_user')
    chat_id = data.get('chatId', '')
    new_title = data.get('newTitle', '')

    if not chat_id or not new_title:
        return jsonify({"error": "chatId and newTitle are required"}), 400

    try:
        chat_doc = container.read_item(item=chat_id, partition_key=user_key)
        chat_doc['title'] = new_title
        container.upsert_item(chat_doc)
        return jsonify({"success": True, "message": "Title updated."}), 200
    except exceptions.CosmosResourceNotFoundError:
        return jsonify({"error": "Chat not found."}), 404
    except Exception as e:
        app.logger.error("Error renaming chat:", exc_info=True)
        return jsonify({"error": str(e)}), 500


###############################################################################
# 5. Large File Upload + Chunking + Azure Cognitive Search
###############################################################################
AZURE_SEARCH_ENDPOINT = os.environ.get("AZURE_SEARCH_ENDPOINT", "")
AZURE_SEARCH_KEY = os.environ.get("AZURE_SEARCH_KEY", "")
AZURE_SEARCH_INDEX = os.environ.get("AZURE_SEARCH_INDEX", "")

def chunk_text(text, chunk_size=1000):
    words = text.split()
    chunks = []
    current_chunk = []
    current_length = 0
    for w in words:
        current_chunk.append(w)
        current_length += len(w) + 1
        if current_length >= chunk_size:
            chunks.append(" ".join(current_chunk))
            current_chunk = []
            current_length = 0
    if current_chunk:
        chunks.append(" ".join(current_chunk))
    return chunks

@app.route('/uploadLargeFile', methods=['POST'])
def upload_large_file():
    user_key = request.args.get('userKey', 'default_user')
    if request.content_type and 'multipart/form-data' in request.content_type:
        uploaded_file = request.files.get('file')
        if not uploaded_file:
            return jsonify({"error": "No file uploaded"}), 400
        try:
            file_bytes = uploaded_file.read()
            filename = uploaded_file.filename.lower()
            if filename.endswith('.pdf'):
                extracted_text = extract_text_from_pdf(file_bytes)
            elif filename.endswith('.docx'):
                extracted_text = extract_text_from_docx(file_bytes)
            else:
                return jsonify({"error": "Unsupported file type for large chunking"}), 400

            chunks = chunk_text(extracted_text, chunk_size=500)
            success_count = upsert_chunks_to_search(chunks, user_key)
            return jsonify({
                "status": "success",
                "message": f"Uploaded & chunked {len(chunks)} segments. {success_count} upserted into Azure Search.",
            }), 200
        except Exception as e:
            app.logger.error("Error reading or chunking the file:", exc_info=True)
            return jsonify({"error": str(e)}), 500
    else:
        return jsonify({"error": "Please do a multipart/form-data upload"}), 400

def upsert_chunks_to_search(chunks, user_key):
    if not (AZURE_SEARCH_ENDPOINT and AZURE_SEARCH_KEY and AZURE_SEARCH_INDEX):
        app.logger.error("Azure Search env vars not set.")
        return 0
    try:
        search_client = SearchClient(
            endpoint=AZURE_SEARCH_ENDPOINT,
            index_name=AZURE_SEARCH_INDEX,
            credential=AzureKeyCredential(AZURE_SEARCH_KEY)
        )
        actions = []
        for i, ctext in enumerate(chunks):
            doc_id = f"{user_key}-{uuid.uuid4()}"
            actions.append({
                "id": doc_id,
                "userKey": user_key,
                "content": ctext
            })
        result = search_client.upload_documents(documents=actions)
        return len(result)
    except Exception as e:
        app.logger.error("Error uploading to Azure Search:", exc_info=True)
        return 0


###############################################################################
# 6. Searching the Azure Cognitive Search Index
###############################################################################
@app.route('/askDoc', methods=['POST'])
def ask_doc():
    data = request.get_json(force=True)
    question = data.get('question', '')
    user_key = data.get('userKey', 'default_user')
    if not question:
        return jsonify({"error": "No question provided"}), 400

    top_chunks = search_in_azure_search(question, user_key, top_k=3)
    if not top_chunks:
        prompt_content = "No relevant documents found."
    else:
        prompt_content = "\n\n".join([f"Chunk: {tc}" for tc in top_chunks])

    messages = [
        {
            "role": "system",
            "content": (
                "You are an AI that uses the following doc context. "
                "If not answered by context, say not enough info.\n"
                "Context:\n" + prompt_content
            )
        },
        {"role": "user", "content": question}
    ]
    try:
        response = client.chat.completions.create(messages=messages, model=AZURE_DEPLOYMENT_NAME)
        return jsonify({"answer": response.choices[0].message.content}), 200
    except Exception as e:
        app.logger.error("Error calling AzureOpenAI with doc context:", exc_info=True)
        return jsonify({"error": str(e)}), 500

def search_in_azure_search(question, user_key, top_k=3):
    if not (AZURE_SEARCH_ENDPOINT and AZURE_SEARCH_KEY and AZURE_SEARCH_INDEX):
        app.logger.error("Azure Search env vars not set.")
        return []
    try:
        search_client = SearchClient(
            endpoint=AZURE_SEARCH_ENDPOINT,
            index_name=AZURE_SEARCH_INDEX,
            credential=AzureKeyCredential(AZURE_SEARCH_KEY)
        )
        results = search_client.search(
            search_text=question,
            filter=f"userKey eq '{user_key}'",
            top=top_k
        )
        chunks = []
        for r in results:
            ctext = r.get('content', '')
            if ctext:
                chunks.append(ctext)
        return chunks
    except Exception as e:
        app.logger.error("Error searching Azure Search:", exc_info=True)
        return []


###############################################################################
@app.errorhandler(404)
def not_found(e):
    return send_from_directory('src/public', 'index.html')


###############################################################################
if __name__ == "__main__":
    port = int(os.environ.get('PORT', 8080))
    app.run(host="0.0.0.0", port=port, debug=True)
