import os
import sys
import logging
from msrest.authentication import CognitiveServicesCredentials
from azure.cognitiveservices.vision.computervision import ComputerVisionClient
from azure.cognitiveservices.vision.computervision.models import VisualFeatureTypes

logger = logging.getLogger("azure")
logger.setLevel(logging.INFO)
handler = logging.StreamHandler(stream=sys.stdout)
formatter = logging.Formatter("%(asctime)s:%(levelname)s:%(name)s:%(message)s")
handler.setFormatter(formatter)
logger.addHandler(handler)

def get_client():
    endpoint = os.environ.get("VISION_ENDPOINT")
    key = os.environ.get("VISION_KEY")
    if not endpoint or not key:
        raise ValueError("Missing 'VISION_ENDPOINT' or 'VISION_KEY' environment variables.")
    
    credentials = CognitiveServicesCredentials(key)
    return ComputerVisionClient(endpoint, credentials)

def analyze_image_from_bytes(image_data):
    client = get_client()
    # Use a stable feature, for example: description
    # VisualFeatureTypes has: Description, Tags, Objects, etc.
    results = client.analyze_image_in_stream(
        image_data,
        visual_features=[VisualFeatureTypes.description, VisualFeatureTypes.tags]
    )
    return results

def analyze_image_from_url(image_url):
    client = get_client()
    results = client.analyze_image(
        image_url,
        visual_features=[VisualFeatureTypes.description, VisualFeatureTypes.tags]
    )
    return results

def print_analysis_results(results):
    print("Image analysis results:")
    if results.description and results.description.captions:
        for caption in results.description.captions:
            print(f"Caption: '{caption.text}' (confidence: {caption.confidence:.4f})")
    if results.tags:
        print("Tags:")
        for tag in results.tags:
            print(f"   {tag.name} (confidence: {tag.confidence:.4f})")

if __name__ == "__main__":
    # Example usage with a local image:
    try:
        with open("sample.jpg", "rb") as f:
            image_data = f.read()
        local_result = analyze_image_from_bytes(image_data)
        print_analysis_results(local_result)
    except Exception:
        pass

    # Example usage with an image URL:
    try:
        image_url = "https://raw.githubusercontent.com/Azure-Samples/cognitive-services-sample-data-files/master/ComputerVision/Images/faces.jpg"
        url_result = analyze_image_from_url(image_url)
        print_analysis_results(url_result)
    except Exception:
        pass