import os
import requests

def analyze_image(image_data, endpoint=None, key=None):
    if endpoint is None:
        endpoint = os.environ.get("AZURE_VISION_ENDPOINT")
    if key is None:
        key = os.environ.get("AZURE_VISION_KEY")

    if not endpoint or not key:
        raise ValueError("Vision endpoint or key is missing.")

    analyze_url = f"{endpoint}/vision/v3.2/analyze"
    params = {
        'visualFeatures': 'Categories,Description,Color',
        'details': 'Celebrities,Landmarks'
    }

    headers = {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/octet-stream'  # Since we're sending image bytes
    }

    response = requests.post(analyze_url, headers=headers, params=params, data=image_data)
    response.raise_for_status()
    return response.json()