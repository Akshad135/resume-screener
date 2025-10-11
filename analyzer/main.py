import json
from groq import AsyncGroq
from . import config, prompts, parsers

client = AsyncGroq(api_key=config.GROQ_API_KEY)

def _clean_json_from_llm(raw_output: str) -> str:
    """Finds and extracts the first valid JSON object from a raw LLM output string."""
    try:
        start_index = raw_output.find('{')
        end_index = raw_output.rfind('}')
        if start_index != -1 and end_index != -1 and end_index > start_index:
            return raw_output[start_index:end_index+1]
    except Exception:
        pass
    return raw_output

async def _call_llm(prompt: str, model: str) -> dict:
    # Makes an asynchronous call to the LLM and returns the parsed JSON response.
    try:
        chat_completion = await client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model=model,
            temperature=config.TEMPERATURE,
            response_format={"type": "json_object"},
        )
        response_content = chat_completion.choices[0].message.content
        cleaned_response = _clean_json_from_llm(response_content)
        return json.loads(cleaned_response)
    except Exception as e:
        print(f"An error occurred with the LLM call using model {model}: {e}")
        return {"error": str(e)}

async def _calculate_experience_years(experience_list: list) -> float:
    # Uses an LLM to parse varied date formats and calculate total experience.
    if not experience_list:
        return 0.0
    
    prompt = prompts.EXPERIENCE_CALCULATION_PROMPT.format(
        experience_json=json.dumps(experience_list)
    )
    response = await _call_llm(prompt, model=config.STRUCTURING_MODEL)
    return response.get("total_experience_years", 0.0)

def _calculate_weighted_score(analysis: dict, requirements: dict, resume: dict, candidate_exp: float) -> int:
    # Calculates a final score based on the LLM's analysis and defined weights.
    seniority = requirements.get("seniority_level", "mid-level").lower()
    
    if "senior" in seniority:
        MUST_HAVE_WEIGHT = 5  
        NICE_TO_HAVE_WEIGHT = 2  
        EXPERIENCE_WEIGHT = 20  
        CERTIFICATION_BONUS = 1  
        LEADERSHIP_BONUS = 3  
    elif "entry" in seniority or "junior" in seniority:
        MUST_HAVE_WEIGHT = 3
        NICE_TO_HAVE_WEIGHT = 4  
        EXPERIENCE_WEIGHT = 5
        CERTIFICATION_BONUS = 5  
        LEADERSHIP_BONUS = 5
    else: 
        MUST_HAVE_WEIGHT = 4  
        NICE_TO_HAVE_WEIGHT = 3  
        EXPERIENCE_WEIGHT = 8 
        CERTIFICATION_BONUS = 3  
        LEADERSHIP_BONUS = 2 
    
    MAX_PROFICIENCY_LEVEL = 3
    
    score = 0
    max_score = 0
    
    def get_safe_level(level_value) -> int:
        """Safely converts proficiency level to an integer, defaulting to 0."""
        try:
            return int(level_value)
        except (ValueError, TypeError):
            return 0

    # Must-have skills
    must_haves = analysis.get("skill_match_analysis", {}).get("must_have_matches", [])
    max_score += len(requirements.get("must_have_skills", [])) * MUST_HAVE_WEIGHT * MAX_PROFICIENCY_LEVEL
    for skill in must_haves:
        # Use the safe getter to prevent type errors
        level = get_safe_level(skill.get("proficiency_level"))
        score += MUST_HAVE_WEIGHT * level
    
    # Nice-to-have skills
    nice_to_haves = analysis.get("skill_match_analysis", {}).get("nice_to_have_matches", [])
    max_score += len(requirements.get("nice_to_have_skills", [])) * NICE_TO_HAVE_WEIGHT * MAX_PROFICIENCY_LEVEL
    for skill in nice_to_haves:
        # Use the safe getter here too
        level = get_safe_level(skill.get("proficiency_level"))
        score += NICE_TO_HAVE_WEIGHT * level
    
    # Experience matching
    required_exp = requirements.get("required_experience_years", 0)
    max_score += EXPERIENCE_WEIGHT
    if required_exp > 0:
        experience_ratio = min(candidate_exp / required_exp, 1.2)
        score += EXPERIENCE_WEIGHT * experience_ratio
    else:
        score += EXPERIENCE_WEIGHT
    
    # Certifications
    certifications = resume.get("certifications_and_awards", [])
    max_score += len(certifications) * CERTIFICATION_BONUS
    score += len(certifications) * CERTIFICATION_BONUS
    
    # Leadership
    leadership_roles = resume.get("leadership_and_extracurriculars", [])
    max_score += len(leadership_roles) * LEADERSHIP_BONUS
    score += len(leadership_roles) * LEADERSHIP_BONUS
    
    if max_score == 0:
        return 0

    normalized_score = int((score / max_score) * 90) + 10 # ! Try to add base bonus points later
    return min(normalized_score, 100)


async def deconstruct_jd(job_description_text: str) -> dict:
    # Analyzes the Job Description asynchronously.
    print("--- Stage 1: Deconstructing Job Description (Once) ---")
    jd_prompt = prompts.JD_DECONSTRUCTION_PROMPT.format(job_description=job_description_text)
    structured_jd = await _call_llm(jd_prompt, model=config.STRUCTURING_MODEL)
    if "error" in structured_jd:
        return {"error": "Failed to parse Job Description.", "details": structured_jd["error"]}
    print("✅ JD Deconstruction Complete.")
    return structured_jd

# --- CHANGE 2: Added a proactive text cleaner ---
def _clean_resume_text(text: str) -> str:
    """Removes common problematic text patterns before sending to LLM."""
    lines = text.split('\n')
    cleaned_lines = [line.strip() for line in lines if not line.strip().startswith('#')]
    return '\n'.join(cleaned_lines)

async def analyze_single_resume(structured_jd: dict, resume_file_content: bytes, resume_filename: str) -> dict:
    print(f"\n--- [{resume_filename}] Starting Analysis ---")
    raw_resume_text = parsers.extract_text_from_pdf(resume_file_content)
    if not raw_resume_text:
        return {"error": "Failed to extract text from resume PDF."}
    
    resume_text = _clean_resume_text(raw_resume_text)
    
    print(f"--- [{resume_filename}] Analyzing Skills ---")
    jd_skills = {
        "must_have_skills": structured_jd.get("must_have_skills", []),
        "nice_to_have_skills": structured_jd.get("nice_to_have_skills", [])
    }
    analysis_prompt = prompts.COMBINED_ANALYSIS_PROMPT.format(
        jd_skills_json=json.dumps(jd_skills, indent=2), 
        resume_text=resume_text
    )
    skill_analysis = await _call_llm(analysis_prompt, model=config.ANALYSIS_MODEL)
    if "error" in skill_analysis:
        return {"error": "Failed during combined analysis.", "details": skill_analysis["error"]}

    executive_summary = skill_analysis.get("executive_summary", "No summary available")

    print(f"--- [{resume_filename}] Parsing Holistic Data ---")
    holistic_prompt = prompts.HOLISTIC_DATA_PARSER_PROMPT.format(resume_text=resume_text)
    structured_resume_holistic = await _call_llm(holistic_prompt, model=config.STRUCTURING_MODEL)
    if "error" in structured_resume_holistic:
        print(f"Warning: Failed to parse holistic data for {resume_filename}.")
        structured_resume_holistic = {}

    print(f"--- [{resume_filename}] Calculating Experience ---")
    candidate_experience_years = await _calculate_experience_years(
        structured_resume_holistic.get("experience_and_projects", [])
    )

    final_analysis = skill_analysis
    final_analysis["experience_match_analysis"] = {
        "required_years": structured_jd.get("required_experience_years", 0),
        "calculated_candidate_years": candidate_experience_years,
        "is_sufficient": candidate_experience_years >= structured_jd.get("required_experience_years", 0)
    }

    print(f"--- [{resume_filename}] Assessing Quality ---")
    quality_prompt = prompts.RESUME_QUALITY_PROMPT.format(resume_text=resume_text)
    quality_assessment = await _call_llm(quality_prompt, model=config.STRUCTURING_MODEL)
    quality_multiplier = quality_assessment.get("quality_score", 1.0)
    
    print(f"--- [{resume_filename}] Calculating Final Score ---")
    unadjusted_score = _calculate_weighted_score(
        final_analysis, 
        structured_jd, 
        structured_resume_holistic, 
        candidate_experience_years
    )
    final_score = int(unadjusted_score * quality_multiplier)

    return {
        "final_score": final_score,
        "unadjusted_score": unadjusted_score,
        "quality_assessment": quality_assessment,
        "llm_analysis": final_analysis,
        "structured_jd": structured_jd,
        "structured_resume": structured_resume_holistic,
        "executive_summary": executive_summary,
    }