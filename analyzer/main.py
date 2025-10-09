import json
from groq import Groq
from . import config, prompts, parsers

client = Groq(api_key=config.GROQ_API_KEY)


def _call_llm(prompt: str, model: str) -> dict:
    # Makes a call to the LLM and returns the parsed JSON response.
    try:
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model=model,
            temperature=config.TEMPERATURE,
            response_format={"type": "json_object"},
        )
        response_content = chat_completion.choices[0].message.content
        cleaned_response = response_content.strip()
        return json.loads(cleaned_response)
    except Exception as e:
        print(f"An error occurred with the LLM call using model {model}: {e}")
        return {"error": str(e)}

def _calculate_experience_years(experience_list: list) -> float:
    # Uses an LLM to parse varied date formats and calculate total experience.
    if not experience_list:
        return 0.0
    
    prompt = prompts.EXPERIENCE_CALCULATION_PROMPT.format(
        experience_json=json.dumps(experience_list)
    )
    response = _call_llm(prompt, model=config.STRUCTURING_MODEL)
    return response.get("total_experience_years", 0.0)

def _calculate_weighted_score(analysis: dict, requirements: dict, resume: dict, candidate_exp: float) -> int:
    # Calculates a final score based on the LLM's analysis and defined weights.
    seniority = requirements.get("seniority_level", "mid-level").lower()
    if "senior" in seniority:
        MUST_HAVE_WEIGHT = 6
        NICE_TO_HAVE_WEIGHT = 1
        EXPERIENCE_WEIGHT = 40
        CERTIFICATION_BONUS = 0.5
        LEADERSHIP_BONUS = 2
    elif "entry" in seniority or "junior" in seniority:
        MUST_HAVE_WEIGHT = 5
        NICE_TO_HAVE_WEIGHT = 3
        EXPERIENCE_WEIGHT = 15
        CERTIFICATION_BONUS = 3
        LEADERSHIP_BONUS = 3
    else:
        MUST_HAVE_WEIGHT = 5
        NICE_TO_HAVE_WEIGHT = 2
        EXPERIENCE_WEIGHT = 25
        CERTIFICATION_BONUS = 2
        LEADERSHIP_BONUS = 1.5

    MAX_PROFICIENCY_LEVEL = 3
    score = 0
    max_score = 0

    must_haves = analysis.get("skill_match_analysis", {}).get("must_have_matches", [])
    max_score += len(requirements.get("must_have_skills", [])) * MUST_HAVE_WEIGHT * MAX_PROFICIENCY_LEVEL
    for skill in must_haves:
        score += MUST_HAVE_WEIGHT * skill.get("proficiency_level", 0)

    nice_to_haves = analysis.get("skill_match_analysis", {}).get("nice_to_have_matches", [])
    max_score += len(requirements.get("nice_to_have_skills", [])) * NICE_TO_HAVE_WEIGHT * MAX_PROFICIENCY_LEVEL
    for skill in nice_to_haves:
        score += NICE_TO_HAVE_WEIGHT * skill.get("proficiency_level", 0)

    required_exp = requirements.get("required_experience_years", 0)
    max_score += EXPERIENCE_WEIGHT
    if required_exp > 0:
        experience_ratio = min(candidate_exp / required_exp, 1.0)
        score += EXPERIENCE_WEIGHT * experience_ratio
        
    certifications = resume.get("certifications_and_awards", [])
    max_score += len(certifications) * CERTIFICATION_BONUS
    score += len(certifications) * CERTIFICATION_BONUS
    
    leadership_roles = resume.get("leadership_and_extracurriculars", [])
    max_score += len(leadership_roles) * LEADERSHIP_BONUS
    score += len(leadership_roles) * LEADERSHIP_BONUS

    if max_score == 0:
        return 0
        
    normalized_score = int((score / max_score) * 100)
    return min(normalized_score, 100)

def run_analysis(job_description_text: str, resume_file_content: bytes) -> dict:
    # The main function which combines prompts, weights and makes calls to llm.
    print("--- Stage 1: Deconstructing Job Description ---")
    jd_prompt = prompts.JD_DECONSTRUCTION_PROMPT.format(job_description=job_description_text)
    structured_jd = _call_llm(jd_prompt, model=config.STRUCTURING_MODEL)
    if "error" in structured_jd:
        return {"error": "Failed to parse Job Description.", "details": structured_jd["error"]}
    print("✅ JD Deconstruction Complete.")

    resume_text = parsers.extract_text_from_pdf(resume_file_content)
    if not resume_text:
        return {"error": "Failed to extract text from resume PDF."}
    
    print("\n--- Stage 2: Combined Skill Analysis ---")
    jd_skills = {"must_have_skills": structured_jd.get("must_have_skills", []),"nice_to_have_skills": structured_jd.get("nice_to_have_skills", [])}
    analysis_prompt = prompts.COMBINED_ANALYSIS_PROMPT.format(jd_skills_json=json.dumps(jd_skills, indent=2), resume_text=resume_text)
    skill_analysis = _call_llm(analysis_prompt, model=config.ANALYSIS_MODEL)
    if "error" in skill_analysis:
        return {"error": "Failed during combined analysis.", "details": skill_analysis["error"]}
    print("✅ Combined Skill Analysis Complete.")

    print("\n--- Bonus Stage: Parsing Holistic Data ---")
    holistic_prompt = prompts.HOLISTIC_DATA_PARSER_PROMPT.format(resume_text=resume_text)
    structured_resume_holistic = _call_llm(holistic_prompt, model=config.STRUCTURING_MODEL)
    if "error" in structured_resume_holistic:
        print("Warning: Failed to parse holistic data.")
        structured_resume_holistic = {}
    print("✅ Holistic Data Parsed.")

    print("\n--- Calculating Candidate Experience ---")
    candidate_experience_years = _calculate_experience_years(structured_resume_holistic.get("experience_and_projects", []))
    print(f"✅ Candidate experience calculated: {candidate_experience_years:.2f} years.")

    final_analysis = skill_analysis
    final_analysis["experience_match_analysis"] = {"required_years": structured_jd.get("required_experience_years", 0),"calculated_candidate_years": candidate_experience_years,"is_sufficient": candidate_experience_years >= structured_jd.get("required_experience_years", 0)}

    print("\n--- Final Step: Calculating Weighted Score ---")
    unadjusted_score = _calculate_weighted_score(final_analysis, structured_jd, structured_resume_holistic, candidate_experience_years)
    print(f"💯 Unadjusted Score Calculated: {unadjusted_score}")

    print("\n--- Quality Check Stage ---")
    quality_prompt = prompts.RESUME_QUALITY_PROMPT.format(resume_text=resume_text)
    quality_assessment = _call_llm(quality_prompt, model=config.STRUCTURING_MODEL)
    quality_multiplier = quality_assessment.get("quality_score", 1.0)
    print(f"🔍 Quality multiplier: {quality_multiplier}")

    final_score = int(unadjusted_score * quality_multiplier)
    print(f"💯 Final Adjusted Score: {final_score}")

    final_result = {
        "final_score": final_score,
        "unadjusted_score": unadjusted_score,
        "quality_assessment": quality_assessment,
        "llm_analysis": final_analysis,
        "structured_jd": structured_jd,
        "structured_resume": structured_resume_holistic,
    }

    return final_result