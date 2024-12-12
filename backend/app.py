from flask import Flask, send_from_directory, request, jsonify
import os
import openai

app = Flask(__name__, static_folder='src/public', static_url_path='')

# Set your OpenAI API key (ensure it's in your environment variables)
openai.api_key = os.environ.get('OPENAI_API_KEY')

@app.route('/')
def serve_frontend():
    # Serve the main frontend file (index.html)
    return send_from_directory('src/public', 'index.html')

@app.route('/chat', methods=['POST'])
def chat_endpoint():
    data = request.get_json()
    user_input = data.get('userMessage', '')

    # Call the OpenAI API (ChatCompletion) to get a GPT-3.5 response
    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",  # or whichever model you prefer
            messages=[{"role": "user", "content": user_input}]
        )
        reply = response.choices[0].message["content"].strip()
    except Exception as e:
        # If there's an error, return a fallback message
        reply = f"Error occurred: {str(e)}"

    return jsonify({"reply": reply})

@app.errorhandler(404)
def not_found(e):
    # If using client-side routing, redirect unknown paths to index.html
    return send_from_directory('src/public', 'index.html')

if __name__ == "__main__":
    # If running locally, default to 8080. In Azure, PORT is set as an environment variable.
    port = int(os.environ.get('PORT', 8080))
    app.run(host="0.0.0.0", port=port)