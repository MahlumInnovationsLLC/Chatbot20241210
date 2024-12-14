import os
import sys
import logging
import io
from azure.cognitiveservices.vision.computervision import ComputerVisionClient
from azure.cognitiveservices.vision.computervision.models import VisualFeatureTypes
from msrest.authentication import CognitiveServicesCredentials

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
    Analyze an image provided as bytes. We will request description and tags for demonstration.
    Wrap the bytes in a BytesIO stream so analyze_image_in_stream can read it.
    """
    client = get_client()
    features = [VisualFeatureTypes.description, VisualFeatureTypes.tags]

    # Wrap the image_data bytes in a BytesIO to simulate a file-like object
    with io.BytesIO(image_data) as stream:
        try:
            result = client.analyze_image_in_stream(stream, visual_features=features)
            print("Debug: Vision API returned:", result)

            # Step 5 addition: Check if we got a caption
            if not result.description or not result.description.captions:
                print("Debug: No description (caption) available from Vision API.")
            else:
                # Print the first caption for debugging
                print(f"Debug: Caption found: {result.description.captions[0].text}")

            return result
        except Exception as e:
            logger.error(f"Error analyzing image from bytes: {e}", exc_info=True)
            raise

def analyze_image_from_url(image_url):
    """
    Analyze an image provided by URL.
    """
    client = get_client()
    features = [VisualFeatureTypes.description, VisualFeatureTypes.tags]
    try:
        result = client.analyze_image(image_url, visual_features=features)
        return result
    except Exception as e:
        logger.error(f"Error analyzing image from URL: {e}", exc_info=True)
        raise

def print_analysis_results(result):
    """
    Print out the analysis results.
    If you requested description and tags, you can print them.
    """
    print("Image analysis results:")

    if result.description and result.description.captions:
        print("Captions:")
        for caption in result.description.captions:
            print(f"  '{caption.text}', Confidence: {caption.confidence:.4f}")
    else:
        print("No captions found.")

    if result.tags:
        print("Tags:")
        for tag in result.tags:
            print(f"  {tag.name} (Confidence: {tag.confidence:.4f})")
    else:
        print("No tags found.")

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
