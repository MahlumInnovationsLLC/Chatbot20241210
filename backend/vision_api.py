import os
import sys
import logging
from msrest.authentication import CognitiveServicesCredentials
from azure.cognitiveservices.vision.computervision import ComputerVisionClient
from azure.cognitiveservices.vision.computervision.models import VisualFeatureTypes

# Configure logging (optional, helpful for troubleshooting)
logger = logging.getLogger("azure")
logger.setLevel(logging.INFO)
handler = logging.StreamHandler(stream=sys.stdout)
formatter = logging.Formatter("%(asctime)s:%(levelname)s:%(name)s:%(message)s")
handler.setFormatter(formatter)
logger.addHandler(handler)

def get_client():
    """
    Create and return a ComputerVisionClient using the endpoint and key
    from environment variables: VISION_ENDPOINT and VISION_KEY.
    """
    endpoint = os.environ.get("VISION_ENDPOINT")
    key = os.environ.get("VISION_KEY")
    if not endpoint or not key:
        raise ValueError("Missing 'VISION_ENDPOINT' or 'VISION_KEY' environment variables.")

    credentials = CognitiveServicesCredentials(key)
    return ComputerVisionClient(endpoint, credentials)

def analyze_image_from_bytes(image_data):
    """
    Analyze an image provided as bytes using the Computer Vision API.
    We request CAPTION and TAGS features.
    """
    client = get_client()
    features = [VisualFeatureTypes.description, VisualFeatureTypes.tags]

    try:
        result = client.analyze_image_in_stream(image_data, visual_features=features)
        return result
    except Exception as e:
        logger.error("Error analyzing image from bytes: %s", e)
        raise

def analyze_image_from_url(image_url):
    """
    Analyze an image provided via URL using the Computer Vision API.
    We request CAPTION and TAGS features.
    """
    client = get_client()
    features = [VisualFeatureTypes.description, VisualFeatureTypes.tags]
    try:
        result = client.analyze_image(image_url, visual_features=features)
        return result
    except Exception as e:
        logger.error("Error analyzing image from URL: %s", e)
        raise

def print_analysis_results(result):
    """
    Print out the analysis results. Demonstrates handling CAPTION and TAGS.
    """
    print("Image analysis results:")

    if result.description and result.description.captions:
        print(" Caption(s):")
        for caption in result.description.captions:
            print(f"   '{caption.text}', Confidence {caption.confidence:.4f}")

    if result.tags:
        print(" Tags:")
        for tag in result.tags:
            print(f"   {tag.name}, Confidence {tag.confidence:.4f}")

if __name__ == "__main__":
    # Example usage with a local image (if sample.jpg is present)
    try:
        with open("sample.jpg", "rb") as f:
            image_data = f.read()
        local_result = analyze_image_from_bytes(image_data)
        print_analysis_results(local_result)
    except Exception:
        pass

    # Example usage with an image URL
    try:
        image_url = "https://raw.githubusercontent.com/Azure-Samples/cognitive-services-sample-data-files/master/ComputerVision/Images/faces.jpg"
        url_result = analyze_image_from_url(image_url)
        print_analysis_results(url_result)
    except Exception:
        pass