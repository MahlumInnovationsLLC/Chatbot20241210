from flask import Flask, send_from_directory, request, jsonify
import os

app = Flask(__name__, static_folder='src/public', static_url_path='')

@app.route('/')
def serve_frontend():
    # Serve the main frontend file (index.html)
    return send_from_directory('src/public', 'index.html')

@app.route('/chat', methods=['POST'])
def chat_endpoint():
    data = request.get_json()
    user_input = data.get('userMessage', '')
    # Here you'd normally call your model or logic to process user_input
    # For now, we'll just return a placeholder response:
    reply = f"This is a response to: {user_input}"
    return jsonify({"reply": reply})

@app.errorhandler(404)
def not_found(e):
    # If using client-side routing, redirect unknown paths to index.html
    return send_from_directory('src/public', 'index.html')

if __name__ == "__main__":
    # If running locally, default to 8080. In Azure, PORT is set as an environment variable.
    port = int(os.environ.get('PORT', 8080))
    app.run(host="0.0.0.0", port=port)