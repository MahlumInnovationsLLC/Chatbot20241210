from flask import Flask, send_from_directory, request, jsonify, make_response
import os
from openai import AzureOpenAI
from vision_api import analyze_image_from_bytes
from document_processing import extract_text_from_pdf, extract_text_from_docx
import traceback
import re
from io import BytesIO
from docx import Document

app = Flask(__name__, static_folder='src/public', static_url_path='')

# Configure the AzureOpenAI client
client = AzureOpenAI(
    api_key=os.environ.get("AZURE_OPENAI_KEY"),
    azure_endpoint=os.environ.get("AZURE_OPENAI_ENDPOINT"),
    api_version="2023-05-15"
)

AZURE_DEPLOYMENT_NAME = "GYMAIEngine-gpt-4o"  # Ensure this matches your actual Azure OpenAI deployment name

@app.route('/')
def serve_frontend():
    return send_from_directory('src/public', 'index.html')

@app.route('/chat', methods=['POST'])
def chat_endpoint():
    user_input = None
    file_bytes = None
    file_ext = None

    # Determine if the request includes a file (multipart/form-data) or just JSON
    if request.content_type and 'multipart/form-data' in request.content_type:
        app.logger.info("Received multipart/form-data request.")
        user_input = request.form.get('userMessage', '')
        file = request.files.get('file')
        if file:
            app.logger.info(f"Received file: {file.filename}")
            file_bytes = file.read()
            filename = file.filename.lower()
            # Determine file extension for processing
            if filename.endswith('.pdf'):
                file_ext = 'pdf'
            elif filename.endswith(('.png', '.jpg', '.jpeg')):
                file_ext = 'image'
            elif filename.endswith('.docx'):
                file_ext = 'docx'
            else:
                file_ext = None  # Unrecognized file format
        else:
            app.logger.info("No file found in the request.")
    else:
        app.logger.info("Received JSON request.")
        data = request.get_json(force=True)
        user_input = data.get('userMessage', '')
        file_bytes = None

    # Base system and user messages
    # Updated instructions about producing download links and references
    messages = [
        {
            "role": "system",
            "content": (
                "You are a helpful assistant. When you respond, please use Markdown formatting. "
                "For example, use **bold text**, *italic text*, `inline code`, and code blocks ```like this``` "
                "when appropriate. Also, break down complex steps into bullet points or numbered lists "
                "for clarity. End your responses with a friendly tone.\n\n"

                "Additionally, you can produce downloadable reports in the form of `download://filename.docx` links when the user requests a report or a downloadable report. "
                "If the user asks for a report or a downloadable report, you MUST provide a link in the exact format `download://report.docx` within your response. "
                "Do not refuse to create the link. Do not provide any alternative link formats.\n\n"

                "If you use external sources, at the end provide:\n"
                "References:\n"
                "- [Name](URL): short description\n\n"
                "If no external sources used, write `References: None`."
            )
        },
        {
            "role": "user",
            "content": user_input
        }
    ]

    # If a file is uploaded, process according to file type
    if file_bytes:
        if file_ext == 'pdf':
            # Process PDF using Form Recognizer
            app.logger.info("Extracting text from PDF...")
            try:
                extracted_text = extract_text_from_pdf(file_bytes)
                app.logger.info("PDF text extracted successfully.")
                # Add extracted text as a system message for context
                messages.append({
                    "role": "system",
                    "content": f"This is the text extracted from the uploaded PDF:\n{extracted_text}"
                })
            except Exception as e:
                app.logger.error("Error extracting text from PDF:", exc_info=True)
                messages.append({
                    "role": "assistant",
                    "content": "I encountered an error reading the PDF. Please try again."
                })

        elif file_ext == 'image':
            # Process image using Vision API
            app.logger.info("Analyzing image data...")
            try:
                vision_result = analyze_image_from_bytes(file_bytes)
                if vision_result.description and vision_result.description.captions:
                    described_image = vision_result.description.captions[0].text
                    app.logger.info(f"Image described as: {described_image}")
                else:
                    described_image = "No description available."
                    app.logger.info("No description returned by the vision API.")

                messages.append({
                    "role": "system",
                    "content": f"Here's what the image seems to show: {described_image}"
                })
            except Exception as e:
                app.logger.error("Error analyzing image:", exc_info=True)
                messages.append({
                    "role": "assistant",
                    "content": "It seems there was an error analyzing the image."
                })

        elif file_ext == 'docx':
            # Process DOCX locally
            app.logger.info("Extracting text from DOCX file...")
            try:
                extracted_text = extract_text_from_docx(file_bytes)
                app.logger.info("DOCX text extracted successfully.")
                if extracted_text.strip():
                    messages.append({
                        "role": "system",
                        "content": f"Text extracted from the uploaded DOCX:\n{extracted_text}"
                    })
                else:
                    messages.append({
                        "role": "assistant",
                        "content": "The DOCX file seems empty or unreadable."
                    })
            except Exception as e:
                app.logger.error("Error extracting text from DOCX:", exc_info=True)
                messages.append({
                    "role": "assistant",
                    "content": "I encountered an error reading the DOCX file. Please try again."
                })
        else:
            # Unsupported file type
            app.logger.info("File format not recognized or not handled. No action taken.")
    else:
        app.logger.info("No file data found, proceeding without file analysis.")

    # Call Azure OpenAI with the collected messages
    try:
        response = client.chat.completions.create(
            messages=messages,
            model=AZURE_DEPLOYMENT_NAME
        )
        assistant_reply = response.choices[0].message.content
    except Exception as e:
        app.logger.error("Error calling Azure OpenAI:", exc_info=True)
        assistant_reply = f"Error occurred: {str(e)}"

    # Parse references from assistant_reply
    main_content = assistant_reply
    references_list = []
    if 'References:' in assistant_reply:
        parts = assistant_reply.split('References:')
        main_content = parts[0].strip()
        references_section = parts[1].strip() if len(parts) > 1 else "None"

        if references_section.lower().startswith('none'):
            references_list = []
        else:
            # Each reference line: "- [Name](URL): description"
            for line in references_section.split('\n'):
                line = line.strip()
                if line.startswith('-'):
                    match = re.match(r"- \[(.*?)\]\((.*?)\): (.*)", line)
                    if match:
                        name = match.group(1)
                        url = match.group(2)
                        desc = match.group(3)
                        references_list.append({"name": name, "url": url, "description": desc})
    else:
        # No references section found
        references_list = []

    return jsonify({
        "reply": main_content,
        "references": references_list
    })

@app.route('/api/generateReport', methods=['GET'])
def generate_report():
    filename = request.args.get('filename', 'report.docx')

    # Create a simple docx file on the fly
    doc = Document()
    doc.add_heading('Your Generated Report', level=1)
    doc.add_paragraph('This is a dynamically generated report based on your request.')

    byte_io = BytesIO()
    doc.save(byte_io)
    byte_io.seek(0)

    response = make_response(byte_io.read())
    response.headers.set('Content-Disposition', f'attachment; filename="{filename}"')
    response.headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    return response

@app.errorhandler(404)
def not_found(e):
    return send_from_directory('src/public', 'index.html')

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 8080))
    # Run on all interfaces and the specified port
    app.run(host="0.0.0.0", port=port, debug=True)