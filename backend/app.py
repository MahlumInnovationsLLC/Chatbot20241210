from flask import Flask, send_from_directory, request, jsonify
import os
from openai import AzureOpenAI

app = Flask(__name__, static_folder='src/public', static_url_path='')

# Configure the AzureOpenAI client
client = AzureOpenAI(
    api_key=os.environ.get("AZURE_OPENAI_KEY"),
    azure_endpoint=os.environ.get("AZURE_OPENAI_ENDPOINT"),
    # Verify the API version matches your model/deployment
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

    # Determine if the request is multipart (file + message) or JSON
    if request.content_type and 'multipart/form-data' in request.content_type:
        # Handle multipart form data
        user_input = request.form.get('userMessage', '')
        if 'file' in request.files:
            uploaded_file = request.files['file']
            # If you need to handle the file (e.g., save or process it), do so here.
            # Example: uploaded_file.save(os.path.join("uploads", uploaded_file.filename))
    else:
        # Handle JSON data
        data = request.get_json(force=True)
        user_input = data.get('userMessage', '')

    # Add a system message that instructs the assistant on formatting.
    # This message is never shown to the user but guides the assistant.
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