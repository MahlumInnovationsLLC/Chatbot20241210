import os
import sys
import logging
from azure.core.credentials import AzureKeyCredential
from azure.ai.vision.imageanalysis import ImageAnalysisClient, VisualFeatures
from azure.core.exceptions import HttpResponseError

# Configure logging (optional, helpful for troubleshooting)
logger = logging.getLogger("azure")
logger.setLevel(logging.INFO)
handler = logging.StreamHandler(stream=sys.stdout)
formatter = logging.Formatter("%(asctime)s:%(levelname)s:%(name)s:%(message)s")
handler.setFormatter(formatter)
logger.addHandler(handler)

def get_client():
    """
    Create and return an ImageAnalysisClient using the endpoint and key
    from environment variables: VISION_ENDPOINT and VISION_KEY.
    """
    try:
        endpoint = os.environ["VISION_ENDPOINT"]
        key = os.environ["VISION_KEY"]
    except KeyError:
        raise ValueError("Missing 'VISION_ENDPOINT' or 'VISION_KEY' environment variables.")

    client = ImageAnalysisClient(
        endpoint=endpoint,
        credential=AzureKeyCredential(key),
        logging_enable=False  # Set True for more detailed logs
    )
    return client

def analyze_image_from_bytes(image_data):
    """
    Analyze an image provided as bytes. If no features are provided,
    we default to CAPTION and TAGS for demonstration.
    """
    client = get_client()
    try:
        result = client.analyze(
            image_data=image_data,
            visual_features=[VisualFeatures.CAPTION, VisualFeatures.TAGS],
            gender_neutral_caption=True
        )
        return result
    except Exception as e:
        print("Unexpected error calling Vision API:", e)
        raise

def analyze_image_from_url(image_url):
    """
    Analyze an image provided via URL.
    """
    client = get_client()
    try:
        result = client.analyze_from_url(
            image_url=image_url,
            visual_features=[VisualFeatures.CAPTION, VisualFeatures.TAGS],
            gender_neutral_caption=True
        )
        return result
    except Exception as e:
        print("Unexpected error calling Vision API:", e)
        raise

def print_analysis_results(result):
    """
    Print out analysis results. Demonstrates handling CAPTION and TAGS.
    """
    print("Image analysis results:")

    if result.caption is not None:
        print(" Caption:")
        print(f"   '{result.caption.text}', Confidence {result.caption.confidence:.4f}")

    if result.tags:
        print(" Tags:")
        for tag in result.tags.list:
            print(f"   {tag.name}, Confidence {tag.confidence:.4f}")

if __name__ == "__main__":
    # Example usage with a local image
    try:
        with open("sample.jpg", "rb") as f:
            image_data = f.read()
        local_result = analyze_image_from_bytes(image_data)
        print_analysis_results(local_result)
    except Exception:
        pass

    # Example usage with an image URL
    try:
        image_url = "https://aka.ms/azsdk/image-analysis/sample.jpg"
        url_result = analyze_image_from_url(image_url)
        print_analysis_results(url_result)
    except Exception:
        pass
