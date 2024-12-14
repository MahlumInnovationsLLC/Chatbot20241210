from flask import Flask, send_from_directory, request, jsonify
import os
from openai import AzureOpenAI
from vision_api import analyze_image_from_bytes  # Import the correct function from vision_api.py
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
    image_data = None

    # Handle multipart/form-data (if a file is uploaded)
    if request.content_type and 'multipart/form-data' in request.content_type:
        user_input = request.form.get('userMessage', '')
        file = request.files.get('file')
        if file:
            image_data = file.read()
    else:
        # JSON scenario, no file
        data = request.get_json(force=True)
        user_input = data.get('userMessage', '')
        image_data = None

    # System message for formatting
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

    # If we have image data, attempt to analyze it using the azure-ai-vision approach
    if image_data:
        try:
            vision_result = analyze_image_from_bytes(image_data)
            # vision_result is an ImageAnalysisResult object, not a dict.
            # If you requested CAPTION and TAGS in vision_api.py, you can access them like this:
            if vision_result.caption is not None:
                described_image = vision_result.caption.text
            else:
                described_image = "No description available."

            # Add system message with image description
            messages.append({
                "role": "system",
                "content": f"Here's what the image seems to show: {described_image}"
            })
        except Exception as e:
            print("Vision analysis error:", e)
            traceback.print_exc()
            messages.append({
                "role": "assistant",
                "content": "It seems there was an error analyzing the image, so I don't have information about it. Could you please describe what's in the picture?"
            })

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
    # Ensure your app listens on all interfaces and on the port specified by Azure
    # If you're having trouble with port binding locally, you can also just run on 0.0.0.0:8080.
    app.run(host="0.0.0.0", port=port)
