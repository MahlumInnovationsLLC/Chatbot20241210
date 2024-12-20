from flask import Flask, send_from_directory, request, jsonify, send_file, make_response
import os
from openai import AzureOpenAI
from vision_api import analyze_image_from_bytes
from document_processing import extract_text_from_pdf, extract_text_from_docx
import traceback
import re
from io import BytesIO
from docx import Document
import json

app = Flask(__name__, static_folder='src/public', static_url_path='')

client = AzureOpenAI(
    api_key=os.environ.get("AZURE_OPENAI_KEY"),
    azure_endpoint=os.environ.get("AZURE_OPENAI_ENDPOINT"),
    api_version="2023-05-15"
)

AZURE_DEPLOYMENT_NAME = "GYMAIEngine-gpt-4o"

@app.route('/')
def serve_frontend():
    return send_from_directory('src/public', 'index.html')

@app.route('/chat', methods=['POST'])
def chat_endpoint():
    user_input = None
    file_bytes = None
    file_ext = None

    if request.content_type and 'multipart/form-data' in request.content_type:
        app.logger.info("Received multipart/form-data request.")
        user_input = request.form.get('userMessage', '')
        file = request.files.get('file')
        if file:
            app.logger.info(f"Received file: {file.filename}")
            file_bytes = file.read()
            filename = file.filename.lower()
            if filename.endswith('.pdf'):
                file_ext = 'pdf'
            elif filename.endswith(('.png', '.jpg', '.jpeg')):
                file_ext = 'image'
            elif filename.endswith('.docx'):
                file_ext = 'docx'
            else:
                file_ext = None
        else:
            app.logger.info("No file found in the request.")
    else:
        app.logger.info("Received JSON request.")
        data = request.get_json(force=True)
        user_input = data.get('userMessage', '')
        file_bytes = None

    # Update the system message to ask the AI to produce a structured "Report Content" section.
    # For example, instruct the AI:
    # "When producing a downloadable report, include a section marked by '---BEGIN REPORT CONTENT---' 
    # and '---END REPORT CONTENT---' containing the full, detailed text for the docx."
    messages = [
        {
            "role": "system",
            "content": (
                "You are a helpful assistant. When you respond, please use Markdown formatting. "
                "For example, use **bold text**, *italic text*, `inline code`, and code blocks ```like this``` "
                "when appropriate. Also, break down complex steps into bullet points or numbered lists "
                "for clarity. End your responses with a friendly tone.\n\n"
                "If the user requests a report or downloadable report, you MUST include `download://report.docx` in your response.\n"
                "Additionally, provide a structured 'Report Content' section between `---BEGIN REPORT CONTENT---` and `---END REPORT CONTENT---` in your response.\n"
                "This 'Report Content' should contain a detailed, comprehensive write-up suitable for a Word document, more detailed than the short summary you return.\n\n"
                "If you use external sources, at the end of the main content section (not inside the Report Content), provide:\n"
                "References:\n"
                "- [Name](URL): short description\n"
                "If none, write `References: None`."
            )
        },
        {
            "role": "user",
            "content": user_input
        }
    ]

    if file_bytes:
        # Handle file extraction similarly as before...
        if file_ext == 'pdf':
            try:
                extracted_text = extract_text_from_pdf(file_bytes)
                messages.append({
                    "role": "system",
                    "content": f"Extracted PDF text:\n{extracted_text}"
                })
            except:
                messages.append({
                    "role": "assistant",
                    "content": "Error reading PDF."
                })
        elif file_ext == 'image':
            try:
                vision_result = analyze_image_from_bytes(file_bytes)
                described_image = "No description available."
                if vision_result.description and vision_result.description.captions:
                    described_image = vision_result.description.captions[0].text
                messages.append({
                    "role": "system",
                    "content": f"Image description: {described_image}"
                })
            except:
                messages.append({
                    "role": "assistant",
                    "content": "Error analyzing image."
                })
        elif file_ext == 'docx':
            try:
                extracted_text = extract_text_from_docx(file_bytes)
                messages.append({
                    "role": "system",
                    "content": f"Extracted DOCX text:\n{extracted_text}"
                })
            except:
                messages.append({
                    "role": "assistant",
                    "content": "Error reading DOCX."
                })

    try:
        response = client.chat.completions.create(
            messages=messages,
            model=AZURE_DEPLOYMENT_NAME
        )
        assistant_reply = response.choices[0].message.content
    except Exception as e:
        assistant_reply = f"Error occurred: {str(e)}"

    # Extract references
    main_content = assistant_reply
    references_list = []
    references_index = main_content.find("References:")
    if references_index != -1:
        parts = main_content.split('References:')
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
                        references_list.append({"name": name, "url": url, "description": desc})

    else:
        references_list = []

    # Check for 'download://report.docx'
    download_url = None
    report_content = None
    if 'download://report.docx' in main_content:
        # Remove it from main_content
        main_content = main_content.replace('download://report.docx', '').strip()
        download_url = '/api/generateReport'
        # Extract the Report Content section
        rc_start = assistant_reply.find('---BEGIN REPORT CONTENT---')
        rc_end = assistant_reply.find('---END REPORT CONTENT---')
        if rc_start != -1 and rc_end != -1:
            report_content = assistant_reply[rc_start+len('---BEGIN REPORT CONTENT---'):rc_end].strip()
        else:
            report_content = "No detailed report content found."

    return jsonify({
        "reply": main_content,
        "references": references_list,
        "downloadUrl": download_url,
        "reportContent": report_content
    })

@app.route('/api/generateReport', methods=['POST'])
def generate_report():
    data = request.get_json(force=True)
    report_content = data.get('reportContent', 'No content')
    filename = 'report.docx'

    doc = Document()
    doc.add_heading('Your Detailed Fitness Report', level=1)
    doc.add_paragraph(report_content)

    byte_io = BytesIO()
    doc.save(byte_io)
    byte_io.seek(0)

    return send_file(
        byte_io,
        as_attachment=True,
        download_name=filename,
        mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )

@app.errorhandler(404)
def not_found(e):
    return send_from_directory('src/public', 'index.html')

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 8080))
    app.run(host="0.0.0.0", port=port, debug=True)