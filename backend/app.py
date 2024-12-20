from flask import Flask, send_from_directory, request, jsonify, send_file, make_response
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

    # System and user messages
    messages = [
        {
            "role": "system",
            "content": (
                "You are a helpful assistant. When you respond, please use Markdown formatting. "
                "For example, use **bold text**, *italic text*, `inline code`, and code blocks ```like this``` "
                "when appropriate. Also, break down complex steps into bullet points or numbered lists "
                "for clarity. End your responses with a friendly tone.\n\n"
                "If asked for a report, always provide `download://report.docx` in the final answer. "
                "Also include the report content between `---BEGIN REPORT CONTENT---` and `---END REPORT CONTENT---`.\n\n"
                "Example:\n"
                "Here is your report: download://report.docx\n"
                "---BEGIN REPORT CONTENT---\n"
                "Detailed content here\n"
                "---END REPORT CONTENT---\n\n"
                "If no references: 'References: None'"
            )
        },
        {
            "role": "user",
            "content": user_input
        }
    ]

    # If a file is uploaded, handle it (omitted for brevity, same as before)
    # ... (PDF/image/docx extraction code) ...

    try:
        response = client.chat.completions.create(
            messages=messages,
            model=AZURE_DEPLOYMENT_NAME
        )
        assistant_reply = response.choices[0].message.content
    except Exception as e:
        app.logger.error("Error calling Azure OpenAI:", exc_info=True)
        return jsonify({"reply": f"Error occurred: {str(e)}"}), 500

    # Parse references and download link
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
                        references_list.append({"name": name, "url": url, "description": desc})
    else:
        references_list = []

    # Extract download_url and report_content
    download_url = None
    report_content = None

    if 'download://report.docx' in main_content:
        main_content = main_content.replace('download://report.docx', '').strip()
        download_url = '/api/generateReport'
        # Now try to find report content between delimiters
        begin_marker = '---BEGIN REPORT CONTENT---'
        end_marker = '---END REPORT CONTENT---'

        begin_index = assistant_reply.find(begin_marker)
        end_index = assistant_reply.find(end_marker)

        if begin_index != -1 and end_index != -1 and end_index > begin_index:
            report_content = assistant_reply[begin_index+len(begin_marker):end_index].strip()
        else:
            app.logger.warning("Report content delimiters not found or malformed.")
            report_content = "No detailed content provided by the AI."
    else:
        app.logger.info("User did not request a report or AI did not provide download link.")

    return jsonify({
        "reply": main_content,
        "references": references_list,
        "downloadUrl": download_url if download_url else None,
        "reportContent": report_content if report_content else None
    })

@app.route('/api/generateReport', methods=['POST'])
def generate_report():
    data = request.get_json(force=True)
    report_text = data.get('reportContent', 'No report content provided.')

    doc = Document()
    doc.add_heading('Your Generated Detailed Report', level=1)
    doc.add_paragraph(report_text)

    byte_io = BytesIO()
    doc.save(byte_io)
    byte_io.seek(0)

    return send_file(
        byte_io,
        as_attachment=True,
        download_name='report.docx',
        mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )

@app.errorhandler(404)
def not_found(e):
    return send_from_directory('src/public', 'index.html')

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 8080))
    app.run(host="0.0.0.0", port=port, debug=True)