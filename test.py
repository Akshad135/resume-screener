import json
import traceback  # Import the traceback module
from analyzer.main import run_analysis

if __name__ == "__main__":
    print("🚀 Starting Resume Analysis Test...")

    jd_file_path = "jd.txt"
    resume_file_path = "resume.pdf"

    try:
        with open(jd_file_path, "r", encoding="utf-8") as f:
            jd_text = f.read()
        with open(resume_file_path, "rb") as f:
            resume_bytes = f.read()

        print("📂 Files read successfully. Starting analysis engine...")
        final_result = run_analysis(jd_text, resume_bytes)

        print("\n✅ Final Analysis Complete! Here is the result:\n")
        print(json.dumps(final_result, indent=4))

    except FileNotFoundError as e:
        print(f"❌ ERROR: Could not find a required file. Please ensure '{e.filename}' is in the same directory as test.py.")
    except Exception as e:
        # This will now print the full, detailed error traceback
        print(f"An unexpected error occurred: {e}")
        traceback.print_exc()