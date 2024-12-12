from flask import Flask, send_from_directory, request, jsonify
import os
import openai

app = Flask(__name__, static_folder='src/public', static_url_path='')

# Configure OpenAI for Azure
openai.api_type = "azure"
openai.api_base = os.environ.get("AZURE_OPENAI_ENDPOINT")  # e.g. "https://your-resource-name.openai.azure.com/"
openai.api_version = "2023-05-15"
openai.api_key = os.environ.get("AZURE_OPENAI_KEY")

# Replace with your Azure OpenAI deployment name (the "engine" name)
AZURE_DEPLOYMENT_NAME = "gpt-deployment"  # This should match the name of your deployment in Azure OpenAI

@app.route('/')
def serve_frontend():
    return send_from_directory('src/public', 'index.html')

@app.route('/chat', methods=['POST'])
def chat_endpoint():
    data = request.get_json()
    user_input = data.get('userMessage', '')

    try:
        # Using the new ChatCompletion API with Azure
        # For Azure, use 'engine' parameter instead of 'model'
        response = openai.ChatCompletion.create(
            engine=AZURE_DEPLOYMENT_NAME,
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": user_input}
            ]
        )
        assistant_reply = response['choices'][0]['message']['content']
    except Exception as e:
        print("Error calling Azure OpenAI:", e)
        assistant_reply = "Error occurred: {}".format(str(e))

    return jsonify({"reply": assistant_reply})

@app.errorhandler(404)
def not_found(e):
    return send_from_directory('src/public', 'index.html')

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 8080))
    app.run(host="0.0.0.0", port=port)