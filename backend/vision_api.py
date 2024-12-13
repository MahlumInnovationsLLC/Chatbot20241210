import os
import requests

def analyze_image(image_data, endpoint=None, key=None):
    if endpoint is None:
        endpoint = os.environ.get("AZURE_VISION_ENDPOINT")
    if key is None:
        key = os.environ.get("AZURE_VISION_KEY")

    if not endpoint or not key:
        raise ValueError("Vision endpoint or key is missing. Please set AZURE_VISION_ENDPOINT and AZURE_VISION_KEY.")

    # Remove trailing slash if present
    endpoint = endpoint.rstrip('/')

    analyze_url = f"{endpoint}/vision/v3.2/analyze"
    params = {
        'visualFeatures': 'Categories,Description,Color',
        'details': 'Celebrities,Landmarks'
    }

    headers = {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/octet-stream'
    }

    try:
        response = requests.post(analyze_url, headers=headers, params=params, data=image_data)
        response.raise_for_status()
        return response.json()
    except requests.HTTPError as http_err:
        print("Vision API HTTPError:", http_err)
        print("Status Code:", response.status_code)
        print("Response Content:", response.text)
    raise
    except Exception as e:
        print("Unexpected error calling Vision API:", e)
        raise