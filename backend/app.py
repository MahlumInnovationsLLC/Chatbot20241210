from flask import Flask, send_from_directory, request, jsonify
import os
from openai import AzureOpenAI
from vision_api import analyze_image  # <-- Import the vision analyze function

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
    uploaded_file = None

    if request.content_type and 'multipart/form-data' in request.content_type:
        user_input = request.form.get('userMessage', '')
        if 'file' in request.files:
            uploaded_file = request.files['file']
            image_data = uploaded_file.read()
            try:
                vision_result = analyze_image(image_data)
                # You could append vision analysis result to user_input or include it in the conversation:
                user_input += "\n\nImage Analysis Results:\n" + str(vision_result)
            except Exception as e:
                print("Error analyzing image:", e)
                user_input += "\n\n(Note: There was an error analyzing the image.)"
    else:
        data = request.get_json(force=True)
        user_input = data.get('userMessage', '')

    # Add a system message that instructs the assistant on formatting.
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

    try:
        response = client.chat.completions.create(
            messages=messages,
            model=AZURE_DEPLOYMENT_NAME
        )
        assistant_reply = response.choices[0].message.content
    except Exception as e:
        print("Error calling Azure OpenAI:", e)
        assistant_reply = f"Error occurred: {str(e)}"

    return jsonify({"reply": assistant_reply})

@app.errorhandler(404)
def not_found(e):
    return send_from_directory('src/public', 'index.html')

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 8080))
    app.run(host="0.0.0.0", port=port)