import os
import sys
import logging
from azure.core.credentials import AzureKeyCredential
from azure.ai.vision.imageanalysis import ImageAnalysisClient, VisualFeatures
from azure.ai.vision.imageanalysis.models import ImageAnalysisResult
from azure.core.exceptions import HttpResponseError

# Configure logging (optional)
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
        logging_enable=False  # Set True if you want non-redacted DEBUG logs
    )
    return client

def analyze_image_from_bytes(image_data, features=None):
    """
    Analyze an image provided as bytes. If no features are provided,
    default to CAPTION and READ (OCR).
    """
    if features is None:
        features = [VisualFeatures.CAPTION, VisualFeatures.READ]

    client = get_client()
    try:
        result = client.analyze(
            image_data=image_data,
            visual_features=features,
            gender_neutral_caption=True
        )
        return result
    except HttpResponseError as e:
        logger.error(f"Status code: {e.status_code}")
        logger.error(f"Reason: {e.reason}")
        if e.error:
            logger.error(f"Message: {e.error.message}")
        raise
    except Exception as e:
        logger.error("Unexpected error calling Vision API:", e)
        raise

def analyze_image_from_url(image_url, features=None):
    """
    Analyze an image provided as a URL. If no features are provided,
    default to CAPTION and READ (OCR).
    """
    if features is None:
        features = [VisualFeatures.CAPTION, VisualFeatures.READ]

    client = get_client()
    try:
        result = client.analyze_from_url(
            image_url=image_url,
            visual_features=features,
            gender_neutral_caption=True
        )
        return result
    except HttpResponseError as e:
        logger.error(f"Status code: {e.status_code}")
        logger.error(f"Reason: {e.reason}")
        if e.error:
            logger.error(f"Message: {e.error.message}")
        raise
    except Exception as e:
        logger.error("Unexpected error calling Vision API:", e)
        raise

def print_analysis_results(result: ImageAnalysisResult):
    """
    Print out the analysis results in a readable format.
    Demonstrates how to handle CAPTION and READ results.
    """
    print("Image analysis results:")

    if result.caption is not None:
        print(" Caption:")
        print(f"   '{result.caption.text}', Confidence {result.caption.confidence:.4f}")

    if result.read is not None and len(result.read.blocks) > 0:
        print(" Read (OCR):")
        for line in result.read.blocks[0].lines:
            print(f"   Line: '{line.text}', Bounding box {line.bounding_polygon}")
            for word in line.words:
                print(f"     Word: '{word.text}', Confidence {word.confidence:.4f}")

    # Add handling for other features if needed, e.g. TAGS, OBJECTS, PEOPLE, etc.

if __name__ == "__main__":
    # Example usage: analyzing a local image
    try:
        with open("sample.jpg", "rb") as f:
            image_data = f.read()
        local_result = analyze_image_from_bytes(image_data)
        print_analysis_results(local_result)
    except Exception as e:
        logger.error("Error analyzing local image:", e)
    # Example usage: analyzing an image by URL
    try:
        image_url = "https://aka.ms/azsdk/image-analysis/sample.jpg"
        url_result = analyze_image_from_url(image_url)
        print_analysis_results(url_result)
    except Exception as e:
        logger.error("Error analyzing image from URL:", e)