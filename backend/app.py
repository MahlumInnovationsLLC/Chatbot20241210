###############################################################################
# app.py
###############################################################################
from flask import Flask, send_from_directory, request, jsonify, send_file
import os
from openai import AzureOpenAI
from vision_api import analyze_image_from_bytes
from document_processing import extract_text_from_pdf, extract_text_from_docx
import traceback
import re
from io import BytesIO
from docx import Document
import urllib.parse  # for URL encoding if needed
import uuid
from azure.cosmos import CosmosClient, PartitionKey, exceptions
import sendgrid
from sendgrid.helpers.mail import Mail, Email, To, Content # for sending email

app = Flask(__name__, static_folder='src/public', static_url_path='')

###############################################################################
# 1. Cosmos DB Setup
###############################################################################
# Make sure you set these environment variables or define them in code
COSMOS_ENDPOINT = os.environ.get("COSMOS_ENDPOINT")  # e.g. "https://<yourcosmos>.documents.azure.com:443/"
COSMOS_KEY = os.environ.get("COSMOS_KEY")            # your primary key
COSMOS_DATABASE_ID = "GYMAIEngineDB"
COSMOS_CONTAINER_ID = "chats"

###############################################################################
# 1.2 Sendgrid Setup
###############################################################################
# Make sure you set these environment variables or define them in code
SENDGRID_API_KEY = os.environ.get("SENDGRID_API_KEY") # for sending emails

# Initialize the Cosmos client
cosmos_client = CosmosClient(COSMOS_ENDPOINT, credential=COSMOS_KEY)

try:
    # Get (or create) database
    database = cosmos_client.create_database_if_not_exists(id=COSMOS_DATABASE_ID)
    # Get (or create) container
    container = database.create_container_if_not_exists(
        id=COSMOS_CONTAINER_ID,
        partition_key=PartitionKey(path="/userKey"),
        offer_throughput=400  # optional
    )
except exceptions.CosmosHttpResponseError as e:
    app.logger.error("Cosmos DB setup error: %s", e)

# For calling AzureOpenAI
client = AzureOpenAI(
    api_key=os.environ.get("AZURE_OPENAI_KEY"),
    azure_endpoint=os.environ.get("AZURE_OPENAI_ENDPOINT"),
    api_version="2023-05-15"
)

AZURE_DEPLOYMENT_NAME = "GYMAIEngine-gpt-4o"  # Ensure this matches your actual deployment name

###############################################################################
# 2. Helper function to produce a more detailed "reportContent"
###############################################################################
def generate_detailed_report(base_content):
    detail_messages = [
        {
            "role": "system",
            "content": (
                "You are a helpful assistant that specializes in creating detailed, comprehensive reports. "
                "Given some brief content about a topic, produce a thorough, well-structured, and in-depth written report. "
                "Include headings, subheadings, bullet points, data-driven insights, best practices, examples, "
                "and potential future trends. Write as if producing a professional whitepaper or industry analysis document."
            )
        },
        {
            "role": "user",
            "content": (
                "Here is a brief summary: " + base_content + "\n\n"
                "Now please create a significantly more in-depth, expanded, and detailed report that covers the topic comprehensively."
            )
        }
    ]
    try:
        detail_response = client.chat.completions.create(
            messages=detail_messages,
            model=AZURE_DEPLOYMENT_NAME
        )
        detailed_report = detail_response.choices[0].message.content
        return detailed_report
    except Exception as e:
        app.logger.error("Error calling OpenAI for detailed report:", exc_info=True)
        return base_content + "\n\n(Additional detailed analysis could not be generated due to an error.)"

###############################################################################
@app.route('/')
def serve_frontend():
    return send_from_directory('src/public', 'index.html')

###############################################################################
# 3. Chat endpoint
###############################################################################
@app.route('/chat', methods=['POST'])
def chat_endpoint():
    user_input = None
    file_bytes = None
    file_ext = None

    # userKey from query params or JSON
    user_key = request.args.get('userKey', 'default_user')

    # If multipart, read from form + file
    if request.content_type and 'multipart/form-data' in request.content_type:
        user_input = request.form.get('userMessage', '')
        uploaded_file = request.files.get('file')
        if uploaded_file:
            file_bytes = uploaded_file.read()
            filename = uploaded_file.filename.lower()
            if filename.endswith('.pdf'):
                file_ext = 'pdf'
            elif filename.endswith(('.png', '.jpg', '.jpeg')):
                file_ext = 'image'
            elif filename.endswith('.docx'):
                file_ext = 'docx'
    else:
        # JSON request
        data = request.get_json(force=True)
        user_input = data.get('userMessage', '')
        if 'userKey' in data:
            user_key = data['userKey']

    # 3a) Create base messages
    messages = [
        {
            "role": "system",
            "content": (
                "You are a helpful assistant. When you respond, please use Markdown formatting. "
                "For example, use **bold text**, *italic text*, `inline code`, and code blocks ```like this``` "
                "when appropriate. Also, break down complex steps into bullet points or numbered lists "
                "for clarity. End your responses with a friendly tone.\n\n"
                "IMPORTANT: If the user requests a report or a downloadable report, you MUST include exactly one link "
                "in the exact format: `download://report.docx` somewhere in your final response text.\n\n"
                "If you use external sources, at the end provide:\n"
                "References:\n"
                "- [Name](URL): short description\n"
                "If no external sources, write `References: None`."
            )
        },
        {
            "role": "user",
            "content": user_input
        }
    ]

    # 3b) If a file was uploaded, transform it into a system message
    if file_bytes:
        try:
            if file_ext == 'pdf':
                extracted_text = extract_text_from_pdf(file_bytes)
                messages.append({
                    "role": "system",
                    "content": f"This is the text extracted from the PDF:\n{extracted_text}"
                })
            elif file_ext == 'image':
                vision_result = analyze_image_from_bytes(file_bytes)
                described_image = "No description available."
                if vision_result.description and vision_result.description.captions:
                    described_image = vision_result.description.captions[0].text
                messages.append({
                    "role": "system",
                    "content": f"Here's what the image seems to show: {described_image}"
                })
            elif file_ext == 'docx':
                extracted_text = extract_text_from_docx(file_bytes)
                if extracted_text.strip():
                    messages.append({
                        "role": "system",
                        "content": f"Text extracted from the DOCX:\n{extracted_text}"
                    })
                else:
                    messages.append({
                        "role": "assistant",
                        "content": "The DOCX file seems empty or unreadable."
                    })
        except Exception as e:
            app.logger.error("Error processing uploaded file:", exc_info=True)
            messages.append({
                "role": "assistant",
                "content": f"Error reading uploaded file: {str(e)}"
            })

    # 3c) Call AzureOpenAI
    try:
        response = client.chat.completions.create(
            messages=messages,
            model=AZURE_DEPLOYMENT_NAME
        )
        assistant_reply = response.choices[0].message.content
    except Exception as e:
        app.logger.error("Error calling AzureOpenAI:", exc_info=True)
        assistant_reply = f"Error occurred: {str(e)}"

    # 3d) Parse references, remove them from displayed text
    main_content = assistant_reply
    references_list = []
    if 'References:' in assistant_reply:
        parts = assistant_reply.split('References:')
        main_content = parts[0].strip()
        references_section = parts[1].strip() if len(parts) > 1 else "None"
        if references_section.lower().startswith('none'):
            references_list = []
        else:
            for line in references_section.split('\n'):
                line = line.strip()
                if line.startswith('-'):
                    match = re.match(r"- \[(.*?)\]\((.*?)\): (.*)", line)
                    if match:
                        name = match.group(1)
                        url = match.group(2)
                        desc = match.group(3)
                        references_list.append({
                            "name": name,
                            "url": url,
                            "description": desc
                        })

    # 3e) Check for downloadable report
    download_url = None
    report_content = None
    if 'download://report.docx' in main_content:
        main_content = main_content.replace('download://report.docx', '').strip()
        report_content = generate_detailed_report(main_content)
        download_url = '/api/generateReport'

    ###########################################################################
    # 4. Store chat data in Cosmos DB
    ###########################################################################
    # For simplicity, we store user & assistant messages in a single doc.
    # In a real system you might store multiple chat sessions or so.
    ###########################################################################
    
    chat_id = "singleSession_" + user_key  # Or generate a new random chatId
    partition_key = user_key               # because we set partition key to /userKey

    # Attempt to retrieve existing doc for this userKey & chatId
    try:
        chat_doc = container.read_item(item=chat_id, partition_key=partition_key)
    except exceptions.CosmosResourceNotFoundError:
        chat_doc = {
            "id": chat_id,
            "userKey": user_key,
            "messages": []
        }

    # Add the user message
    chat_doc["messages"].append({
        "role": "user",
        "content": user_input
    })

    # Add the assistant message
    chat_doc["messages"].append({
        "role": "assistant",
        "content": assistant_reply
    })

    # Upsert the doc back to Cosmos
    container.upsert_item(chat_doc)

    ###########################################################################
    # Return the JSON response
    ###########################################################################
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
    filename = data.get('filename', 'report.docx')
    report_content = data.get('reportContent', 'No content provided')

    lines = report_content.split('\n')
    lines = [l.rstrip() for l in lines]

    doc = Document()

    doc_title = "Generated Report"
    if lines and lines[0].startswith('# '):
        doc_title = lines[0][2:].strip()
        lines = lines[1:]
    doc.add_heading(doc_title, 0)

    for line in lines:
        stripped_line = line.strip()
        if not stripped_line:
            doc.add_paragraph('')
            continue

        if stripped_line.startswith('### '):
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

    # Actually send email
    try:
        sg = sendgrid.SendGridAPIClient(api_key=SENDGRID_API_KEY)
        from_email = Email("colter@mahluminnovations.com")
        to_email = To("colter@mahluminnovations.com")  # set the destination
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
        response = sg.client.mail.send.post(request_body=mail.get())

        return jsonify({
            "status": "success",
            "message": "Your message has been sent via SendGrid."
        }), 200

    except Exception as e:
        app.logger.error("Error sending email via SendGrid", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500

###############################################################################
# Return all chats for a user (READ from Cosmos)
###############################################################################
@app.route('/chats', methods=['GET'])
def get_chats():
    user_key = request.args.get('userKey', '')
    if not user_key:
        return jsonify({"chats": []}), 200

    # Query container for items matching userKey
    query = f"SELECT * FROM c WHERE c.userKey=@userKey"
    parameters = [{"name": "@userKey", "value": user_key}]

    items = list(container.query_items(
        query=query,
        parameters=parameters,
        enable_cross_partition_query=True
    ))

    chat_summaries = []
    for doc in items:
        chat_summaries.append({
            "id": doc.get("id"),
            "userKey": doc.get("userKey"),
            "messages": doc.get("messages", []),
            "title": doc.get("title", None),
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

    query = f"SELECT * FROM c WHERE c.userKey=@userKey"
    parameters = [{"name": "@userKey", "value": user_key}]
    items = list(container.query_items(query=query, parameters=parameters))

    for doc in items:
        container.delete_item(item=doc['id'], partition_key=doc['userKey'])

    return jsonify({"success": True}), 200

###############################################################################
# NEW: Rename Chat Title
###############################################################################
@app.route('/renameChat', methods=['POST'])
def rename_chat():
    """
    Expects JSON:
    {
      "userKey": "...",
      "chatId": "...",
      "newTitle": "Some short title"
    }
    """
    data = request.get_json(force=True)
    user_key = data.get('userKey', 'default_user')
    chat_id = data.get('chatId', '')
    new_title = data.get('newTitle', '')

    if not chat_id or not new_title:
        return jsonify({"error": "chatId and newTitle are required"}), 400

    try:
        # Retrieve the doc
        chat_doc = container.read_item(item=chat_id, partition_key=user_key)
        # Update/add the title field
        chat_doc['title'] = new_title
        # Upsert or replace
        container.upsert_item(chat_doc)

        return jsonify({"success": True, "message": "Title updated."}), 200
    except exceptions.CosmosResourceNotFoundError:
        return jsonify({"error": "Chat not found."}), 404
    except Exception as e:
        app.logger.error("Error renaming chat:", exc_info=True)
        return jsonify({"error": str(e)}), 500

###############################################################################
@app.errorhandler(404)
def not_found(e):
    return send_from_directory('src/public', 'index.html')

###############################################################################
if __name__ == "__main__":
    port = int(os.environ.get('PORT', 8080))
    app.run(host="0.0.0.0", port=port, debug=True)