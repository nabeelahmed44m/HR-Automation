import io
import base64
import PyPDF2
import logging

logger = logging.getLogger(__name__)

def extract_text_from_pdf_base64(base64_str: str) -> str:
    """
    Decodes a base64 encoded PDF and extracts all searchable text.
    """
    if not base64_str:
        return ""
        
    try:
        # Some base64 strings come with data URI prefix: data:application/pdf;base64,
        if "," in base64_str:
            base64_str = base64_str.split(",")[1]
            
        pdf_data = base64.b64decode(base64_str)
        pdf_file = io.BytesIO(pdf_data)
        
        reader = PyPDF2.PdfReader(pdf_file)
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        
        return text.strip()
    except Exception as e:
        logger.error(f"Failed to extract text from PDF: {str(e)}")
        return ""
