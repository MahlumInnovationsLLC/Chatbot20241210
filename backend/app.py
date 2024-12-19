from flask import Flask, send_from_directory, request, jsonify, send_file
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

    # Parse input
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
            app.logger.info("No file found in the request.")
    else:
        app.logger.info("Received JSON request.")
        data = request.get_json(force=True)
        user_input = data.get('userMessage', '')
        file_bytes = None

    # Very simple system message
    # Key instruction: If user asks for a report, MUST include `[Download the report](download://report.docx)`
    system_prompt = (
        "You are a helpful assistant. Always answer in a friendly tone.\n\n"
        "If the user requests a 'report' or 'downloadable report', you MUST include exactly this Markdown link in your final answer:\n"
        "`[Download the report](download://report.docx)`\n\n"
        "Do not change the wording, do not omit it. If the user does not ask for a report, do not include that link.\n"
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_input}
    ]

    # If user requests a report, add another system message to reinforce
    if "report" in user_input.lower():
        messages.append({
            "role": "system",
            "content": (
                "The user requested a report. Remember, you MUST include exactly `[Download the report](download://report.docx)` "
                "once in your final answer. No variations!"
            )
        })

    # File processing if needed (optional step)
    if file_bytes:
        if file_ext == 'pdf':
            app.logger.info("Extracting text from PDF...")
            try:
                extracted_text = extract_text_from_pdf(file_bytes)
                app.logger.info("PDF text extracted successfully.")
                messages.append({"role": "system", "content": f"Extracted PDF text:\n{extracted_text}"})
            except Exception as e:
                app.logger.error("PDF error:", exc_info=True)
                messages.append({"role": "assistant", "content": "Error reading PDF."})

        elif file_ext == 'image':
            app.logger.info("Analyzing image...")
            try:
                vision_result = analyze_image_from_bytes(file_bytes)
                desc = "No description"
                if vision_result.description and vision_result.description.captions:
                    desc = vision_result.description.captions[0].text
                messages.append({"role": "system", "content": f"Image description: {desc}"})
            except Exception as e:
                app.logger.error("Image error:", exc_info=True)
                messages.append({"role": "assistant", "content": "Error analyzing image."})

        elif file_ext == 'docx':
            app.logger.info("Extracting text from DOCX...")
            try:
                extracted_text = extract_text_from_docx(file_bytes)
                messages.append({"role": "system", "content": f"Extracted DOCX text:\n{extracted_text}"})
            except Exception as e:
                app.logger.error("DOCX error:", exc_info=True)
                messages.append({"role": "assistant", "content": "Error reading DOCX."})

    # Call Azure OpenAI
    try:
        response = client.chat.completions.create(
            messages=messages,
            model=AZURE_DEPLOYMENT_NAME
        )
        assistant_reply = response.choices[0].message.content
        app.logger.info("Assistant reply: " + assistant_reply)
    except Exception as e:
        app.logger.error("OpenAI error:", exc_info=True)
        assistant_reply = f"Error occurred: {str(e)}"

    # Check for required link
    download_url = None
    pattern = r"\[Download the report\]\(download://report\.docx\)"
    if re.search(pattern, assistant_reply):
        # Remove that link from main_content, store a separate URL
        main_content = re.sub(pattern, '', assistant_reply).strip()
        download_url = '/api/generateReport?filename=report.docx'
    else:
        main_content = assistant_reply

    # No references logic for now, just return reply and downloadUrl
    return jsonify({
        "reply": main_content,
        "downloadUrl": download_url
    })

@app.route('/api/generateReport', methods=['GET'])
def generate_report():
    filename = request.args.get('filename', 'report.docx')
    doc = Document()
    doc.add_heading('Your Generated Report', level=1)
    doc.add_paragraph('This is a dynamically generated report based on your request.')

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