import os
import fitz
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

#Groq client
client = Groq(
    api_key=os.environ.get("GROQ_API_KEY"),
)

#Function to Extract Text from PDF
def extract_text_from_pdf(pdf_path):
    """Extracts text from a given PDF file."""
    try:
        doc = fitz.open(pdf_path)
        text = ""
        for page in doc:
            text += page.get_text()
        return text
    except Exception as e:
        return f"Error reading PDF: {e}"

# Main Execution Logic 
if __name__ == "__main__":
    resume_pdf_path = "resume.pdf"
    job_description_path = "jd.txt"

    resume_text = extract_text_from_pdf(resume_pdf_path)

    with open(job_description_path, "r") as f:
        job_description_text = f.read()

    # prompt for the LLM
    prompt = f"""
    You are a meticulous and strict technical recruiter. Your task is to analyze a resume against a job description based *only* on the text provided.

    Strictly adhere to the following rules:
    1.  **Do not infer, invent, or guess any information** not explicitly stated in the resume. This includes years of experience, skill levels, or project details.
    2.  For the `justification` in the `skill_analysis`, you **must provide a direct quote or a very close paraphrase** from the resume that supports your finding.
    3.  The `summary` must be a neutral, fact-based overview.

    Provide your analysis in a single, valid JSON object with the keys "match_score", "summary", and "skill_analysis".

    ---
    JOB DESCRIPTION:
    {job_description_text}
    ---
    RESUME TEXT:
    {resume_text}
    ---
    """

    print("🤖 Calling Groq API...")
    chat_completion = client.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": prompt,
            }
        ],
        model="llama-3.1-8b-instant",
        temperature=0,
        response_format={"type": "json_object"},
    )

    # --- Print the Response ---
    print("\n✅ API Response Received:\n")
    print(chat_completion.choices[0].message.content)