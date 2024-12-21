from flask import Flask, send_from_directory, request, jsonify, send_file, make_response
import os
from openai import AzureOpenAI
from vision_api import analyze_image_from_bytes
from document_processing import extract_text_from_pdf, extract_text_from_docx
import traceback
import re
from io import BytesIO
from docx import Document
import urllib.parse

app = Flask(__name__, static_folder='src/public', static_url_path='')

# Configure the AzureOpenAI client
client = AzureOpenAI(
    api_key=os.environ.get("AZURE_OPENAI_KEY"),
    azure_endpoint=os.environ.get("AZURE_OPENAI_ENDPOINT"),
    api_version="2023-05-15"
)

AZURE_DEPLOYMENT_NAME = "GYMAIEngine-gpt-4o"  # Ensure this matches your actual deployment name

def generate_detailed_report(base_content):
    """
    Make a second OpenAI call to produce a more in-depth, structured, and detailed report
    based on the main_content from the assistant.
    """
    detail_messages = [
        {
            "role": "system",
            "content": (
                "You are a helpful assistant that specializes in creating detailed, comprehensive reports. "
                "Given some brief content about a topic, produce a thorough, well-structured, and in-depth written report. "
                "Include headings, subheadings, bullet points, data-driven insights, best practices, examples, and potential future trends. "
                "Write as if producing a professional whitepaper or industry analysis document."
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
        # Fallback to just using the base_content if detailed generation fails
        return base_content + "\n\n(Additional detailed analysis could not be generated due to an error.)"

@app.route('/')
def serve_frontend():
    return send_from_directory('src/public', 'index.html')

@app.route('/chat', methods=['POST'])
def chat_endpoint():
    user_input = None
    file_bytes = None
    file_ext = None

    # Detect if there's a file in multipart/form-data or standard JSON
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
        app.logger.info("Received JSON request.")
        data = request.get_json(force=True)
        user_input = data.get('userMessage', '')
        file_bytes = None

    # Base system and user messages
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

    # If a file was uploaded, process it
    if file_bytes:
        if file_ext == 'pdf':
            app.logger.info("Extracting text from PDF...")
            try:
                extracted_text = extract_text_from_pdf(file_bytes)
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
            app.logger.info("Analyzing image data...")
            try:
                vision_result = analyze_image_from_bytes(file_bytes)
                if vision_result.description and vision_result.description.captions:
                    described_image = vision_result.description.captions[0].text
                else:
                    described_image = "No description available."
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
            app.logger.info("Extracting text from DOCX file...")
            try:
                extracted_text = extract_text_from_docx(file_bytes)
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

    # First call to OpenAI to get a short or direct answer
    try:
        response = client.chat.completions.create(
            messages=messages,
            model=AZURE_DEPLOYMENT_NAME
        )
        assistant_reply = response.choices[0].message.content
    except Exception as e:
        app.logger.error("Error calling Azure OpenAI:", exc_info=True)
        assistant_reply = f"Error occurred: {str(e)}"

    # Attempt to parse references
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
    else:
        references_list = []

    # Check if user wants a downloadable report
    download_url = None
    report_content = None
    if 'download://report.docx' in main_content:
        # Remove the placeholder from the displayed text
        main_content = main_content.replace('download://report.docx', '').strip()

        # Make a second call to produce a more in-depth, structured "reportContent"
        report_content = generate_detailed_report(main_content)
        # We'll use a POST request to /api/generateReport for final doc creation
        download_url = '/api/generateReport'

    # Return JSON with either references, normal text, or a link for doc generation
    return jsonify({
        "reply": main_content,
        "references": references_list,
        "downloadUrl": download_url,
        "reportContent": report_content
    })

@app.route('/api/generateReport', methods=['POST'])
def generate_report():
    """
    Expects JSON:
    {
      "filename": "report.docx",
      "reportContent": "some detailed content with headings etc."
    }
    Returns a Word doc with bold items handled, headings, bullet points, etc.
    """
    data = request.get_json(force=True)
    filename = data.get('filename', 'report.docx')
    report_content = data.get('reportContent', 'No content provided')

    # We'll parse lines and handle headings or bullet points
    lines = report_content.split('\n')
    lines = [l.rstrip() for l in lines]

    doc = Document()

    # Attempt to locate a first-line heading
    doc_title = "Generated Report"
    if lines and lines[0].startswith('# '):
        doc_title = lines[0][2:].strip()
        # remove that line from normal processing
        lines = lines[1:]

    # Document Title
    doc.add_heading(doc_title, 0)

    for line in lines:
        stripped_line = line.strip()
        if not stripped_line:
            # Add a blank paragraph for empty lines
            doc.add_paragraph('')
            continue

        # Check for heading tokens
        if stripped_line.startswith('### '):
            doc.add_heading(stripped_line[4:].strip(), level=3)
        elif stripped_line.startswith('## '):
            doc.add_heading(stripped_line[3:].strip(), level=2)
        elif stripped_line.startswith('# '):
            doc.add_heading(stripped_line[2:].strip(), level=1)
        # Bullet points: lines starting with '- '
        elif re.match(r'^-\s', stripped_line):
            doc.add_paragraph(stripped_line[2:].strip(), style='List Bullet')
        # Numbered list: e.g. "1. text"
        elif re.match(r'^\d+\.\s', stripped_line):
            doc.add_paragraph(re.sub(r'^\d+\.\s', '', stripped_line).strip(), style='List Number')
        else:
            # Normal paragraph
            # We can parse for bold segments using '**' pairs
            p = doc.add_paragraph()
            segments = stripped_line.split('**')
            bold_toggle = False
            for i, seg in enumerate(segments):
                run = p.add_run(seg)
                # If we are on an odd segment, that should be bold
                if i % 2 == 1:
                    run.bold = True

    # Return the doc
    byte_io = BytesIO()
    doc.save(byte_io)
    byte_io.seek(0)

    return send_file(
        byte_io,
        as_attachment=True,
        download_name=filename,
        mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )

@app.route('/contact', methods=['POST'])
def contact_endpoint():
    """
    Expects JSON:
    {
      "firstName": "...",
      "lastName": "...",
      "company": "...",
      "email": "...",
      "note": "..."
    }
    """
    data = request.get_json(force=True)
    firstName = data.get('firstName', '')
    lastName = data.get('lastName', '')
    company = data.get('company', '')
    email = data.get('email', '')
    note = data.get('note', '')

    # Log or handle sending an actual email to colter@mahluminnovations.com
    app.logger.info(
        f"Contact form submission:\n"
        f"Name: {firstName} {lastName}\n"
        f"Company: {company}\n"
        f"Email: {email}\n"
        f"Note: {note}"
    )

    # In a real scenario, you'd integrate with a mail service or SMTP here.

    return jsonify({"status": "success", "message": "Thank you for contacting us. Your message has been received."})

@app.errorhandler(404)
def not_found(e):
    return send_from_directory('src/public', 'index.html')

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 8080))
    app.run(host="0.0.0.0", port=port, debug=True)
