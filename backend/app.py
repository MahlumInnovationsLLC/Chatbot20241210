from flask import Flask

app = Flask(__name__)

@app.route("/")
def hello():
    return "Hello from GYMAIEngine!"

if __name__ == "__main__":
    # Run locally on 8080; Azure will set PORT env variable, and we'll use gunicorn in production.
    app.run(host="0.0.0.0", port=8080)