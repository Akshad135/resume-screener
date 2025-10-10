import fitz

def extract_text_from_pdf(file_content: bytes) -> str:
    """
    Extracts text from the binary content of a PDF file.
    """
    doc = None
    try:
        doc = fitz.open(stream=file_content, filetype="pdf")
        text = ""
        for page in doc:
            text += page.get_text()
        return text
    except Exception as e:
        print(f"Error reading PDF file: {e}")
        return ""
    finally:
        if doc:
            doc.close()

def extract_text_from_txt(file_content: bytes) -> str:
    """
    Decodes the binary content of a TXT file into a string, ignoring errors.
    """
    try:
        return file_content.decode('utf-8', errors='ignore')
    except Exception as e:
        print(f"Error reading TXT file: {e}")
        return ""
