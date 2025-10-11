import os
from dotenv import load_dotenv
load_dotenv()

# Groq API Key
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Models

STRUCTURING_MODEL = "llama-3.1-8b-instant"
# ANALYSIS_MODEL = "llama-3.3-70b-versatile"
# ANALYSIS_MODEL = "openai/gpt-oss-120b"
ANALYSIS_MODEL = "groq/compound"

TEMPERATURE = 0.3