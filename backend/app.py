from flask import Flask, send_from_directory, request, jsonify
import os
from openai import AzureOpenAI
from vision_api import analyze_image  # Make sure this import is correct
import traceback

app = Flask(__name__, static_folder='src/public', static_url_path='')

# Configure the AzureOpenAI client
client = AzureOpenAI(
    api_key=os.environ.get("AZURE_OPENAI_KEY"),
    azure_endpoint=os.environ.get("AZURE_OPENAI_ENDPOINT"),
    api_version="2023-05-15"
)

# Update the deployment name to your actual Azure deployment name
AZURE_DEPLOYMENT_NAME = "GYMAIEngine-gpt-4o"

@app.route('/')
def serve_frontend():
    return send_from_directory('src/public', 'index.html')

@app.route('/chat', methods=['POST'])
def chat_endpoint():
    user_input = None
    uploaded_file = None

    # Check if multipart/form-data (if you have file upload in the input box)
    if request.content_type and 'multipart/form-data' in request.content_type:
        user_input = request.form.get('userMessage', '')
        file = request.files.get('file')
        if file:
            image_data = file.read()
        else:
            image_data = None
    else:
        data = request.get_json(force=True)
        user_input = data.get('userMessage', '')
        image_data = None  # no file in this scenario

    # System message for formatting:
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

    # If we have image data, attempt to analyze it:
    if image_data:
        try:
            vision_result = analyze_image(image_data)
            description = vision_result.get('description', {}).get('captions', [])
            if description:
                described_image = description[0]['text']
            else:
                described_image = "No description available."
            
            messages.append({
                "role": "system",
                "content": f"Here's what I see in the image: {described_image}"
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
    app.run(host="0.0.0.0", port=port)