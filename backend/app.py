from flask import Flask, send_from_directory, request, jsonify
import os
from openai import AzureOpenAI
from vision_api import analyze_image_from_bytes
from document_processing import extract_text_from_pdf
import traceback

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

    # Determine request type and extract file (if any)
    if request.content_type and 'multipart/form-data' in request.content_type:
        app.logger.info("Received multipart/form-data request.")
        user_input = request.form.get('userMessage', '')
        file = request.files.get('file')
        if file:
            app.logger.info(f"Received file: {file.filename}")
            file_bytes = file.read()
            filename = file.filename.lower()
            # Determine file extension to know how to process it
            if filename.endswith('.pdf'):
                file_ext = 'pdf'
            elif filename.endswith(('.png', '.jpg', '.jpeg')):
                file_ext = 'image'
            # You can add more conditions for docx or other formats if desired
        else:
            app.logger.info("No file found in the request.")
    else:
        app.logger.info("Received JSON request.")
        data = request.get_json(force=True)
        user_input = data.get('userMessage', '')
        file_bytes = None

    messages = [
        {
            "role": "system",
            "content": (
                "You are a helpful assistant. When you respond, please use Markdown formatting. "
                "For example, use **bold text**, *italic text*, `inline code`, and code blocks ```like this``` "
                "when appropriate. Also, break down complex steps into bullet points or numbered lists "
                "for clarity. End your responses with a friendly tone."
            )
        },
        {
            "role": "user",
            "content": user_input
        }
    ]

    # If we have a file, process it accordingly
    if file_bytes:
        # If it's a PDF, use Form Recognizer to extract text
        if file_ext == 'pdf':
            app.logger.info("Extracting text from PDF using Form Recognizer...")
            try:
                extracted_text = extract_text_from_pdf(file_bytes)
                app.logger.info("PDF text extracted successfully.")
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
            app.logger.info(f"Debug: Received image of length {len(file_bytes)} bytes.")
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
        else:
            app.logger.info("File format not recognized or not handled.")
    else:
        app.logger.info("No file data found, proceeding without file analysis.")

    # Now call the Azure OpenAI model
    try:
        response = client.chat.completions.create(
            messages=messages,
            model=AZURE_DEPLOYMENT_NAME
        )
        assistant_reply = response.choices[0].message.content
    except Exception as e:
        app.logger.error("Error calling Azure OpenAI:", exc_info=True)
        assistant_reply = f"Error occurred: {str(e)}"

    return jsonify({"reply": assistant_reply})

@app.errorhandler(404)
def not_found(e):
    return send_from_directory('src/public', 'index.html')

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 8080))
    # Run on all interfaces and the specified port
    app.run(host="0.0.0.0", port=port, debug=True)