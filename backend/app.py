from flask import Flask, send_from_directory, request, jsonify
import os
from openai import AzureOpenAI
from vision_api import analyze_image

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
    vision_analysis_text = ""

    if request.content_type and 'multipart/form-data' in request.content_type:
        user_input = request.form.get('userMessage', '')
        if 'file' in request.files:
            uploaded_file = request.files['file']
            image_data = uploaded_file.read()
            if image_data:
                try:
                    vision_result = analyze_image(image_data)
                    # Extract something meaningful from vision_result
                    # For example, if vision_result['description']['captions'] is available:
                    if 'description' in vision_result and 'captions' in vision_result['description'] and vision_result['description']['captions']:
                        caption = vision_result['description']['captions'][0].get('text', '')
                        vision_analysis_text = f"\n\n[Vision Analysis]: The image likely shows {caption}."
                    else:
                        # Fallback: convert entire JSON to string
                        vision_analysis_text = f"\n\n[Vision Analysis]: {vision_result}"
                except Exception as e:
                    print("Error analyzing image:", e)
                    vision_analysis_text = "\n\n[Vision Analysis]: (Error analyzing image.)"
    else:
        data = request.get_json(force=True)
        user_input = data.get('userMessage', '')

    # Append vision analysis if any
    user_input += vision_analysis_text

    # System message with instructions to use vision analysis if available
    messages = [
        {
            "role": "system",
            "content": (
                "You are a helpful assistant. Use Markdown formatting in responses. "
                "If '[Vision Analysis]:' is provided in the user's message, use that info to describe the image. "
                "If not, ask the user for a description. Be friendly and helpful."
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