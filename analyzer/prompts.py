# --- Prompt to deconstruct the Job Description ---
JD_DECONSTRUCTION_PROMPT = """

You are an expert hiring manager creating a structured hiring rubric. Extract the core requirements from the job description into a JSON format.

Strictly adhere to the following rules:

1. The output MUST be a single, raw JSON object.

2. Determine the `seniority_level` of the role (e.g., 'Entry-level', 'Mid-level', 'Senior') based on the language in the description. If the JD mentions "Intern" or "Internship", set seniority_level as "Entry-level".

3. **Categorize skills carefully:**

- **must_have_skills**: ONLY core technologies/skills absolutely essential for day-1. For Entry-level/Intern roles, limit to 3-5 foundational skills (e.g., primary language, main framework). Advanced topics should go to nice-to-have.

- **nice_to_have_skills**: Everything else including "preferred", advanced topics, additional frameworks, cloud platforms, or bonus skills

4. If years of experience are mentioned, extract the minimum number. If not, return 0.

5. **Be very selective with must-haves** - For interns and entry-level roles, focus only on core stack. When in doubt, put it in nice-to-have.

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

You are an optimistic AI recruitment analyst who focuses on identifying candidate potential and giving credit for implied skills. Your goal is to find matches, not disqualify candidates.

**CRITICAL RULE: If a candidate uses a framework/technology, automatically credit them for ALL skills that framework requires.**

### MANDATORY INFERENCE RULES ###

If you see Spring Boot → **Automatically assign level 2-3** for:
- RESTful APIs (Spring Boot IS a REST framework)
- Hibernate/JPA (Spring Data uses Hibernate)
- Maven or Gradle (required to build Spring Boot projects)

If you see MySQL/PostgreSQL/database work → **Level 2** for SQL and database management

If you see ANY mention of Git, GitHub, GitLab → **Level 2** for Git

If you see web development projects → **Level 2** for HTTP/REST concepts

If you see ANY similar framework (Flask/Django for FastAPI, Vue/Angular for React, Azure for AWS) → **Level 2** for the required skill

### PROFICIENCY SCORING ###

- **Level 3**: Multiple substantial projects using this skill OR it's their primary tech stack
- **Level 2**: Used in at least one project OR heavily implied by their tech stack OR similar technology demonstrated
- **Level 1**: Mentioned anywhere in resume OR adjacent technology present
- **Level 0**: ONLY if absolutely zero evidence AND no related technologies whatsoever

**For Entry-level and Intern roles, be especially generous - credit potential and transferable skills.**

### YOUR TASK ###

Analyze the resume and assign proficiency levels (0-3) for each skill. Apply the inference rules above aggressively.

For `evidence_from_resume`: Provide the actual quote from the resume.

Then write a 2-3 sentence `executive_summary` with an optimistic tone, focusing on strengths.

### JSON OUTPUT ###

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

"executive_summary": "A concise 2-3 sentence optimistic assessment highlighting strongest matches and overall fit."

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

1. Combine "Work Experience" and "Projects" into a single `experience_and_projects` list.

2. The output MUST be a single, raw JSON object.

3. If a section is not found, the value should be an empty list.

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

**Important:** Only penalize severely if content is truly poor.

### RED FLAGS ###

- Completely missing work experience section

- No technical skills listed at all

- Unexplained employment gaps exceeding 3 years

- Contradictory information

- Unprofessional language or tone

**Do NOT flag:** Minor typos, formatting issues, brief gaps, or stylistic preferences.

Return a single JSON object:

{{

"quality_score": double,

"red_flags": ["SERIOUS red flags here"]

}}

### RESUME TEXT ###

{resume_text}

### END OF RESUME TEXT ###

"""