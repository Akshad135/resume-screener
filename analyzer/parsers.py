import fitz

def extract_text_from_pdf(file_content: bytes) -> str:
    """
    Extracts text from the binary content of a PDF file.

    Args:
        file_content: The raw byte content of the PDF file.

    Returns:
        A string containing all the extracted text from the PDF.
    """
    try:
        doc = fitz.open(stream=file_content, filetype="pdf")
        text = ""
        for page in doc:
            text += page.get_text()
        return text
    except Exception as e:
        print(f"Error reading PDF file: {e}")
        return ""

def extract_text_from_txt(file_content: bytes) -> str:
    """
    Decodes the binary content of a TXT file into a string.

    Args:
        file_content: The raw byte content of the TXT file.

    Returns:
        A string containing the decoded text.
    """
    try:
        return file_content.decode('utf-8')
    except Exception as e:
        print(f"Error reading TXT file: {e}")
        return ""