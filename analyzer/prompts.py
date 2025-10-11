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
  "job_title": "The primary, most specific job title mentioned in the text.",
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
You are a balanced AI recruitment analyst with a focus on identifying potential rather than penalizing gaps. Analyze the raw resume text to determine the candidate's proficiency for the provided list of required skills.

Strictly adhere to the following rules:

1. Search the entire resume text for evidence of each skill.

2. Make logical inferences (e.g., a GitHub profile link implies "Git" skills).

3. **Be generous with related technologies.** For example, if 'FastAPI' is required but the candidate has 'Flask' or 'Django', assign at least level 2. If 'React' is required but they have 'Vue', assign level 2.

4. For `evidence_from_resume`, you MUST provide the full sentence or bullet point that proves the skill's application.

5. For `proficiency_level`, use this 0-3 scale: 
   - 0 = Not Found (no evidence at all)
   - 1 = Mentioned in a list OR is a closely related technology
   - 2 = Used in a project OR demonstrated through similar frameworks
   - 3 = Central to a major project OR deep expertise shown

6. **Important:** If you find ANY related experience, assign at least level 1. Only use level 0 if there's absolutely no evidence.

7. After analyzing skills, write a concise 2-3 sentence `executive_summary` that:
   - Highlights the candidate's strongest matches (mention 1-2 specific skills)
   - Notes critical gaps if any exist
   - Provides an overall assessment of fit for the role

8. The output MUST be a single, raw JSON object.

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
}},
"executive_summary": "A concise 2-3 sentence professional summary highlighting strongest matches, critical gaps, and overall fit."
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
You are a specialized calculator. Based on the provided list of job/project durations, calculate the total years of experience as a single floating-point number. Assume 'Present' or ongoing dates mean the current date (Oct 2025). Sum up all durations. Return only a single raw JSON object with one key: "total_experience_years".
### EXPERIENCE LIST ###
{experience_json}
### END OF EXPERIENCE LIST ###
"""

# --- Prompt to check for resume quality and red flags ---
RESUME_QUALITY_PROMPT = """

You are an expert recruitment analyst assessing the quality of a candidate's resume CONTENT, not formatting.

Since you're receiving raw text (no formatting visible), focus ONLY on:

1. **Clarity & Communication:** Are accomplishments clearly stated? Are technical details well-explained?

2. **Impact & Quantification:** Does the candidate provide metrics/numbers (e.g., "improved performance by 30%")?

3. **Depth of Experience:** Are projects described with sufficient technical depth?

4. **Professional Language:** Is the content professional and well-written (ignore minor typos)?

5. **Completeness:** Does the resume show a complete professional narrative (education, experience, skills)?

### SCORING GUIDELINES ###

- **0.90-1.00**: Excellent content - clear impact statements, quantified achievements, strong technical depth
- **0.85-0.89**: Good content - decent descriptions, some metrics, professional language
- **0.80-0.84**: Average content - basic descriptions, minimal quantification, meets baseline
- **0.75-0.79**: Below average - vague descriptions, lacks detail
- **0.70-0.74**: Poor content - very minimal information

**Important:** Only penalize severely if content is truly lacking.

### RED FLAGS (only list SERIOUS issues) ###

- Completely missing work experience section
- No technical skills listed at all
- Unexplained employment gaps exceeding 3 years
- Contradictory information
- Unprofessional language or tone

**Do NOT flag:** Minor typos, formatting issues (you can't see formatting anyway), brief gaps, or stylistic preferences.

Return a single JSON object:

{{
  "quality_score": 0.85,
  "red_flags": ["Only list SERIOUS red flags here"]
}}

### RESUME TEXT ###

{resume_text}

### END OF RESUME TEXT ###

"""