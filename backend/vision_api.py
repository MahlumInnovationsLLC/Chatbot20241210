import os
import sys
import logging
from azure.core.credentials import AzureKeyCredential
from azure.ai.vision.imageanalysis import ImageAnalysisClient, VisualFeatures
from azure.ai.vision.imageanalysis.models import ImageAnalysisResult
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
    from environment variables.
    """
    try:
        endpoint = os.environ["VISION_ENDPOINT"]
        key = os.environ["VISION_KEY"]
    except KeyError:
        raise ValueError("Missing 'VISION_ENDPOINT' or 'VISION_KEY' environment variables.")

    # Create the Image Analysis client
    client = ImageAnalysisClient(
        endpoint=endpoint,
        credential=AzureKeyCredential(key),
        logging_enable=False  # Set True if you want non-redacted DEBUG logs
    )
    return client

def analyze_image_from_bytes(image_data, features=None):
    """
    Analyze an image provided as bytes using the specified visual features.
    By default, if no features are provided, we analyze CAPTION and READ (OCR).
    """
    if features is None:
        # Default to caption and OCR for demonstration
        features = [VisualFeatures.CAPTION, VisualFeatures.READ]

    client = get_client()
    try:
        result = client.analyze(
            image_data=image_data,
            visual_features=features,
            # Set additional options as needed
            gender_neutral_caption=True
        )
        return result
    except HttpResponseError as e:
        # Handle service errors gracefully
        print(f"Status code: {e.status_code}")
        print(f"Reason: {e.reason}")
        print(f"Message: {e.error.message}")
        raise
    except Exception as e:
        print("Unexpected error calling Vision API:", e)
        raise

def analyze_image_from_url(image_url, features=None):
    """
    Analyze an image provided as a URL using the specified visual features.
    By default, if no features are provided, we analyze CAPTION and READ (OCR).
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
        print(f"Status code: {e.status_code}")
        print(f"Reason: {e.reason}")
        print(f"Message: {e.error.message}")
        raise
    except Exception as e:
        print("Unexpected error calling Vision API:", e)
        raise

def print_analysis_results(result: ImageAnalysisResult):
    """
    Print out the analysis results in a readable format.
    Demonstrates how to handle CAPTION and READ results, and can be expanded.
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

    # You can add similar sections here for other features like TAGS, OBJECTS, PEOPLE, etc.
    # if result.tags is not None:
    #     print(" Tags:")
    #     for tag in result.tags.list:
    #         print(f"   '{tag.name}', Confidence {tag.confidence:.4f}")

    # if result.objects is not None:
    #     print(" Objects:")
    #     for obj in result.objects.list:
    #         print(f"   '{obj.tags[0].name}', {obj.bounding_box}, Confidence {obj.tags[0].confidence:.4f}")

    # Add more features as needed.

if __name__ == "__main__":
    # Example usage:
    # Analyze a local image
    try:
        with open("sample.jpg", "rb") as f:
            image_data = f.read()
        local_result = analyze_image_from_bytes(image_data)
        print_analysis_results(local_result)
    except Exception:
        pass

    # Analyze an image by URL
    try:
        image_url = "https://aka.ms/azsdk/image-analysis/sample.jpg"
        url_result = analyze_image_from_url(image_url)
        print_analysis_results(url_result)
    except Exception:
        pass