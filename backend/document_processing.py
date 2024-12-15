# document_processing.py
import os
from azure.ai.formrecognizer import DocumentAnalysisClient
from azure.core.credentials import AzureKeyCredential
import io
from docx import Document  # Ensure this package is installed

def get_form_recognizer_client():
    endpoint = os.environ.get("FORM_RECOGNIZER_ENDPOINT")
    key = os.environ.get("FORM_RECOGNIZER_KEY")
    if not endpoint or not key:
        raise ValueError("FORM_RECOGNIZER_ENDPOINT and FORM_RECOGNIZER_KEY must be set")
    return DocumentAnalysisClient(endpoint=endpoint, credential=AzureKeyCredential(key))

def extract_text_from_pdf(file_bytes):
    client = get_form_recognizer_client()
    poller = client.begin_analyze_document("prebuilt-read", file_bytes)
    result = poller.result()

    extracted_text = ""
    for page in result.pages:
        for line in page.lines:
            extracted_text += line.content + "\n"

    return extracted_text.strip()

def extract_text_from_docx(file_bytes):
    # file_bytes is a bytes object representing the docx file
    doc = Document(io.BytesIO(file_bytes))
    full_text = []
    for para in doc.paragraphs:
        text = para.text.strip()
        if text:
            full_text.append(text)
    return "\n".join(full_text)