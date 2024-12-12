from flask import Flask, send_from_directory, request, jsonify
import os
from openai import AzureOpenAI

app = Flask(__name__, static_folder='src/public', static_url_path='')

# Configure the AzureOpenAI client
client = AzureOpenAI(
    api_key=os.environ.get("AZURE_OPENAI_KEY"),
    azure_endpoint=os.environ.get("AZURE_OPENAI_ENDPOINT"),
    # Check the Azure OpenAI documentation for the correct API version
    api_version="2023-05-15"
)

# The model parameter for AzureOpenAI calls should be your deployment name
AZURE_DEPLOYMENT_NAME = "gpt-deployment"  # Replace with your actual Azure deployment name

@app.route('/')
def serve_frontend():
    return send_from_directory('src/public', 'index.html')

@app.route('/chat', methods=['POST'])
def chat_endpoint():
    data = request.get_json()
    user_input = data.get('userMessage', '')

    try:
        # Use the new interface: client.chat.completions.create
        response = client.chat.completions.create(
            messages=[{"role": "user", "content": user_input}],
            model=AZURE_DEPLOYMENT_NAME
        )
        # Access the response using the new response format
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