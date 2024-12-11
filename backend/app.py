from flask import Flask, send_from_directory
import os

app = Flask(__name__, static_folder='src/public', static_url_path='')

@app.route('/')
def serve_frontend():
    # Serve the main frontend file (index.html)
    return send_from_directory('src/public', 'index.html')

# Optional: If your frontend is a single-page application (SPA) that uses client-side routing,
# you can redirect all unknown paths back to index.html:
@app.errorhandler(404)
def not_found(e):
    return send_from_directory('src/public', 'index.html')

if __name__ == "__main__":
    # If running locally, default to 8080. In Azure, PORT is set as an environment variable.
    port = int(os.environ.get('PORT', 8080))
    app.run(host="0.0.0.0", port=port)