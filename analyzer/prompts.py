# --- Prompt to deconstruct the Job Description ---
JD_DECONSTRUCTION_PROMPT = """
You are an expert hiring manager creating a structured hiring rubric. Extract the core requirements from the job description into a JSON format.
Strictly adhere to the following rules:
1.  The output MUST be a single, raw JSON object.
2.  Determine the `seniority_level` of the role (e.g., 'Entry-level', 'Mid-level', 'Senior') based on the language in the description.
3.  Categorize skills into "must_have" and "nice_to_have".
4.  If years of experience are mentioned, extract the minimum number. If not, return 0.
### JSON OUTPUT SCHEMA ###
{{
  "job_title": "string",
  "seniority_level": "string",
  "required_experience_years": "integer",
  "must_have_skills": ["string", "string", ...],
  "nice_to_have_skills": ["string", "string", ...]
}}
### JOB DESCRIPTION TEXT ###
{job_description}
### END OF JOB DESCRIPTION TEXT ###
"""

# --- Prompt to analyze skills against the resume text ---
COMBINED_ANALYSIS_PROMPT = """
You are a hyper-logical AI recruitment analyst. Analyze the raw resume text to determine the candidate's proficiency for the provided list of required skills.
Strictly adhere to the following rules:
1.  Search the entire resume text for evidence of each skill.
2.  Make logical inferences (e.g., a GitHub profile link implies "Git" skills).
3.  Consider closely related technologies. For example, if 'FastAPI' is required, experience with 'Flask' or 'Django' is relevant and should be noted in the evidence and given a partial proficiency score.
4.  For `evidence_from_resume`, you MUST provide the full sentence or bullet point that proves the skill's application.
5.  For `proficiency_level`, use this 0-3 scale: 0=Not Found, 1=Mentioned in a list/is a related tech, 2=Used in a project, 3=Central to a major project.
6.  The output MUST be a single, raw JSON object.
### JSON OUTPUT SCHEMA ###
{{
  "skill_match_analysis": {{
    "must_have_matches": [
      {{
        "skill": "string",
        "proficiency_level": "integer (0-3)",
        "evidence_from_resume": "string"
      }}, ... ],
    "nice_to_have_matches": [
      {{
        "skill": "string",
        "proficiency_level": "integer (0-3)",
        "evidence_from_resume": "string"
      }}, ... ]
  }}
}}
### REQUIRED SKILLS (JSON from Job Description) ###
{jd_skills_json}
### END OF REQUIRED SKILLS ###
### RESUME TEXT ###
{resume_text}
### END OF RESUME TEXT ###
"""

# --- Prompt to parse all non-skill, holistic data from the resume ---
HOLISTIC_DATA_PARSER_PROMPT = """
You are a data extraction tool. From the resume text, extract work experience, projects, certifications, awards, and leadership roles.
Strictly adhere to the following rules:
1.  Combine "Work Experience" and "Projects" into a single `experience_and_projects` list.
2.  The output MUST be a single, raw JSON object.
3.  If a section is not found, the value should be an empty list.
### JSON OUTPUT SCHEMA ###
{{
  "full_name": "The full name of the candidate.",
  "contact_info": "The candidate's primary email address. If email is not found check for phone number. If neither is found, return 'Not Found'.",
  "experience_and_projects": [
    {{
      "title": "string",
      "duration": "string"
    }}, ... ],
  "certifications_and_awards": ["string", "string", ...],
  "leadership_and_extracurriculars": ["string", "string", ...]
}}
### RESUME TEXT ###
{resume_text}
### END OF RESUME TEXT ###
"""

# --- Prompt to calculate total years of experience from a list of durations ---
EXPERIENCE_CALCULATION_PROMPT = """
You are a specialized calculator. Based on the provided list of job/project durations, calculate the total years of experience as a single floating-point number. Assume 'Present' or ongoing dates mean the current date. Sum up all durations. Return only a single raw JSON object with one key: "total_experience_years".
### EXPERIENCE LIST ###
{experience_json}
### END OF EXPERIENCE LIST ###
"""

# --- NEW Prompt to check for resume quality and red flags ---
RESUME_QUALITY_PROMPT = """
You are a strict proofreader and recruitment analyst. Analyze the provided resume text for overall quality and professionalism.
Identify any red flags like spelling mistakes, grammatical errors, or very generic, non-quantified descriptions.
Return a single JSON object containing a `quality_score` (from 0.5 for very poor to 1.0 for excellent) and a list of `red_flags`.
### JSON OUTPUT SCHEMA ###
{{
    "quality_score": "float",
    "red_flags": ["string", "string", ...]
}}
### RESUME TEXT ###
{resume_text}
### END OF RESUME TEXT ###
"""