import json
from groq import Groq
from . import config, prompts, parsers

client = Groq(api_key=config.GROQ_API_KEY)


def _call_llm(prompt: str, model: str) -> dict:
    """A helper function to call the LLM and robustly get a JSON response."""
    try:
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model=model,
            temperature=config.TEMPERATURE,
            response_format={"type": "json_object"},
        )
        response_content = chat_completion.choices[0].message.content
        
        # --- ADD THIS LINE ---
        # Clean up leading/trailing whitespace and newlines before parsing
        cleaned_response = response_content.strip()
        
        return json.loads(cleaned_response) # Parse the cleaned string
        
    except Exception as e:
        print(f"An error occurred with the LLM call using model {model}: {e}")
        return {"error": str(e)}

def _calculate_weighted_score(analysis: dict, requirements: dict) -> int:
    """Calculates a final score based on the LLM's analysis and defined weights."""
    
    # We will calculate the final matching score based on weights we set
    MUST_HAVE_WEIGHT = 5
    NICE_TO_HAVE_WEIGHT = 2
    EXPERIENCE_MATCH_BONUS = 10

    score = 0
    max_score = 0

    # Score "must-have" skills
    must_haves = analysis.get("skill_match_analysis", {}).get("must_have_matches", [])
    max_score += len(requirements.get("must_have_skills", [])) * MUST_HAVE_WEIGHT
    for skill in must_haves:
        if skill.get("is_present", False):
            score += MUST_HAVE_WEIGHT

    # Score "nice-to-have" skills
    nice_to_haves = analysis.get("skill_match_analysis", {}).get("nice_to_have_matches", [])
    max_score += len(requirements.get("nice_to_have_skills", [])) * NICE_TO_HAVE_WEIGHT
    for skill in nice_to_haves:
        if skill.get("is_present", False):
            score += NICE_TO_HAVE_WEIGHT

    # Add bonus for experience match
    max_score += EXPERIENCE_MATCH_BONUS
    if analysis.get("experience_match_analysis", {}).get("is_sufficient", False):
        score += EXPERIENCE_MATCH_BONUS

    # Normalize score to be out of 100
    if max_score == 0:
        return 0
        
    normalized_score = int((score / max_score) * 100)
    return normalized_score

# --- Public Orchestrator Function ---

def run_analysis(job_description_text: str, resume_file_content: bytes) -> dict:
    """
    The main function to run multiple calls for our resume.
    
    Args:
        job_description_text: The raw text of the job description.
        resume_file_content: The raw byte content of the resume PDF.

    Returns:
        A dictionary containing the full analysis and final score.
    """
    print("--- Stage 1: Deconstructing Job Description ---")
    jd_prompt = prompts.JD_DECONSTRUCTION_PROMPT.format(job_description=job_description_text)
    structured_jd = _call_llm(jd_prompt, model=config.STRUCTURING_MODEL)
    if "error" in structured_jd:
        return {"error": "Failed to parse Job Description.", "details": structured_jd["error"]}
    print("✅ JD Deconstruction Complete.")

    print("\n--- Stage 2: Parsing Resume ---")
    resume_text = parsers.extract_text_from_pdf(resume_file_content)
    if not resume_text:
        return {"error": "Failed to extract text from resume PDF."}
    
    resume_prompt = prompts.RESUME_PARSING_PROMPT.format(resume_text=resume_text)
    structured_resume = _call_llm(resume_prompt, model=config.STRUCTURING_MODEL)
    if "error" in structured_resume:
        return {"error": "Failed to parse Resume.", "details": structured_resume["error"]}
    print("✅ Resume Parsing Complete.")

    print("\n--- Stage 3: Final Comparative Analysis ---")
    analysis_prompt = prompts.COMPARATIVE_ANALYSIS_PROMPT.format(
        jd_json=json.dumps(structured_jd, indent=2),
        resume_json=json.dumps(structured_resume, indent=2)
    )
    final_analysis = _call_llm(analysis_prompt, model=config.ANALYSIS_MODEL)
    if "error" in final_analysis:
        return {"error": "Failed during final comparative analysis.", "details": final_analysis["error"]}
    print("✅ Comparative Analysis Complete.")

    print("\n--- Final Step: Calculating Weighted Score ---")
    final_score = _calculate_weighted_score(final_analysis, structured_jd)
    print(f"💯 Final Score Calculated: {final_score}")

    # Assemble the final, comprehensive result object
    final_result = {
        "final_score": final_score,
        "llm_analysis": final_analysis,
        "structured_jd": structured_jd,
        "structured_resume": structured_resume,
    }

    return final_result