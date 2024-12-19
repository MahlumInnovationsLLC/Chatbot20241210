from flask import Flask, send_from_directory, request, jsonify, send_file
import os
from openai import AzureOpenAI
from docx import Document
from io import BytesIO
import re
import traceback

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
    data = request.get_json(force=True)
    user_input = data.get('userMessage', '')

    # Extremely simplified system instructions
    system_prompt = (
        "You are a helpful assistant. If the user asks for a report or a downloadable report, "
        "you MUST include exactly this link once in your final response: [Download the report](download://report.docx)\n\n"
        "Do not omit it, do not alter the format, do not mention other links. "
        "If the user does not ask for a report, do not include that link."
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_input}
    ]

    # If user requests a report, add a strong reminder
    if "report" in user_input.lower():
        messages.append({
            "role": "system",
            "content": "The user asked for a report. You MUST include `[Download the report](download://report.docx)` exactly once in your final answer."
        })

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
        # Remove the link from main_content and store it separately
        main_content = re.sub(pattern, '', assistant_reply).strip()
        download_url = '/api/generateReport?filename=report.docx'
    else:
        # No link found
        main_content = assistant_reply

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