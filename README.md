# Smart Resume Screener

An AI-powered resume screening system that intelligently matches candidates to job descriptions using multi-stage LLM analysis with evidence-based scoring.

## 🎥 Demo Video

[Link to 2-3 minute demo video - Upload to YouTube/Loom]

## 🎯 Overview

Smart Resume Screener automates the initial candidate screening process by:

- Extracting structured data from PDF resumes using LLM-based parsing
- Analyzing job descriptions to identify must-have and nice-to-have skills
- Computing proficiency-based match scores (0-3 scale) with evidence extraction
- Generating AI-powered executive summaries for each candidate
- Providing a ranked list of candidates with detailed skill-by-skill analysis

Built for recruiters and hiring managers to save time and make data-driven hiring decisions.

## ✨ Key Features

### Core Functionality

- **Multi-stage LLM Analysis**: Job description deconstruction → Resume parsing → Skill matching → Quality assessment
- **Evidence-Based Scoring**: Every skill match includes actual quotes from the resume as proof
- **Proficiency Levels**: 0 (Not Found) → 1 (Mentioned) → 2 (Used in Project) → 3 (Central Skill)
- **Executive Summaries**: AI-generated 2-3 sentence candidate assessments
- **Quality Multiplier**: Resume quality assessment affects final score

### Advanced Features

- **Skill Inference**: Automatically credits implied skills (e.g., Spring Boot → REST APIs, Hibernate)
- **Transferable Skills Recognition**: Related technologies count (e.g., Flask experience → FastAPI skill)
- **Add Candidates to Existing Jobs**: Reuses JD analysis for efficiency
- **Full CRUD Operations**: Create, view, update, and delete jobs and screenings

### User Experience

- **Real-time Progress**: Live updates during resume processing
- **Ranked Candidate List**: Sorted by match score with executive summaries
- **Detailed Analysis Modal**: Skill-by-skill breakdown with evidence and proficiency levels
- **Dashboard Statistics**: Total jobs, total candidates, latest job overview

## 🏗️ System Architecture

[Mermaid diagram will go here]

**Data Flow:**

1. User uploads JD (PDF/TXT) + Resumes (PDFs)
2. Backend extracts text using PyMuPDF
3. LLM Stage 1: Deconstruct JD → Extract must-have/nice-to-have skills
4. LLM Stage 2 (per resume): Extract structured data (name, contact, experience, skills)
5. LLM Stage 3 (per resume): Skill matching with proficiency levels + evidence extraction
6. LLM Stage 4 (per resume): Resume quality assessment
7. Score Calculation: Weighted scoring based on proficiency levels, experience, quality
8. Database Storage: Jobs, Candidates, Screenings with analysis results
9. Frontend Display: Ranked list + detailed modal view

## 🛠️ Tech Stack

### Backend

- **Framework**: FastAPI (Python 3.10+)
- **LLM Provider**: Groq API (groq/compound for analysis, Llama 3.1 8B for structuring)
- **Database**: PostgreSQL (hosted on Neon)
- **ORM**: SQLAlchemy
- **PDF Parsing**: PyMuPDF (fitz)

### Frontend

- **Framework**: React 18 with Vite
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **HTTP Client**: Fetch API

### Infrastructure

- **Development**: Local development with CORS enabled
- **Database**: Neon Serverless Postgres
- **API**: RESTful API with JSON responses

## 🤖 LLM Prompts & Strategy

Our system uses a multi-stage LLM pipeline with carefully crafted prompts to ensure accurate, evidence-based candidate evaluation. This strategy is designed to be **generous and inference-based**, recognizing that candidates often have transferable skills not explicitly listed.

The pipeline executes in the following order:

---

### Stage 1: Job Description Deconstruction

- **Model**: `llama-3.1-8b-instant`
- **Prompt**: [`analyzer/prompts.py`](https://github.com/Akshad135/resume-screener/blob/6a0a901b52327309f8386787b8b160cb322d13f6/analyzer/prompts.py#L2)
- **Purpose**: To parse an unstructured job description into a structured JSON rubric. This is done once per job posting.

This initial stage identifies the core requirements of the role. The prompt is designed to:

- Determine the **seniority level** (e.g., Entry-level, Mid-level, Senior) to adjust screening criteria.
- Conservatively limit **`must_have_skills`** to only the most essential competencies (3-5 for entry-level roles) to prevent premature disqualification.
- Categorize advanced or preferred technologies as **`nice_to_have_skills`**.
- Extract the minimum **years of experience** required.

---

### Stage 2: Combined Skill Analysis & Summary

- **Model**: `groq/compound`
- **Prompt**: [`analyzer/prompts.py`](https://github.com/Akshad135/resume-screener/blob/6a0a901b52327309f8386787b8b160cb322d13f6/analyzer/prompts.py#L47)
- **Purpose**: The core of the system. This stage analyzes the resume against the structured job requirements, assigns proficiency scores with evidence, and generates a summary.

This is the most complex stage, guided by several key principles:

**Mandatory Inference Rules:**
The model is instructed to give credit for implied skills. For example:

- **Spring Boot** usage implies proficiency in **REST APIs, Hibernate/JPA, and Maven/Gradle**.
- Experience with one cloud platform (e.g., **AWS**) implies transferable knowledge for others (**Azure/GCP**).
- Mentioning a similar framework (e.g., **Django/Flask**) counts as a match for a requirement like **FastAPI**.

**Proficiency Scoring System:**
A four-tier system rates each skill match:

- **Level 3 (Central Skill)**: Used in multiple substantial projects; core to their experience.
- **Level 2 (Used in Project)**: Directly used or strongly implied by the tech stack or a similar technology.
- **Level 1 (Mentioned)**: Listed anywhere in the resume or an adjacent technology is present.
- **Level 0 (Not Found)**: No evidence and no related skills found.

**Evidence & Summary:**

- **Evidence Extraction**: For complete transparency, every proficiency score is justified with a direct quote from the resume.
- **Executive Summary**: A concise, 2-3 sentence optimistic summary highlights the candidate's strengths and overall fit for the role.

---

### Stage 3: Holistic Resume Parsing

- **Model**: `llama-3.1-8b-instant`
- **Prompt**: [`analyzer/prompts.py`](https://github.com/Akshad135/resume-screener/blob/6a0a901b52327309f8386787b8b160cb322d13f6/analyzer/prompts.py#L137)
- **Purpose**: To extract all non-skill-related structured data from the resume text.

This prompt gathers the foundational data points needed for a comprehensive evaluation:

- Candidate's full name and contact information (email/phone).
- A combined list of all **work experience and projects**, including titles and durations.
- Lists of **certifications, awards, leadership roles**, and extracurricular activities.

---

### Stage 4: Experience Calculation

- **Model**: `llama-3.1-8b-instant`
- **Prompt**: [`analyzer/prompts.py`](https://github.com/Akshad135/resume-screener/blob/6a0a901b52327309f8386787b8b160cb322d13f6/analyzer/prompts.py#L182)
- **Purpose**: To accurately calculate the candidate's total years of experience.

Using the `experience_and_projects` list from the previous stage, this specialized prompt:

- Parses various duration formats (e.g., "Jan 2023 - Present", "6 months").
- Correctly interprets "Present" as the current date (Oct 2025) for accurate calculation.
- Returns the **total years of experience** as a single floating-point number.

---

### Stage 5: Resume Quality Assessment

- **Model**: `llama-3.1-8b-instant`
- **Prompt**: [`analyzer/prompts.py`](https://github.com/Akshad135/resume-screener/blob/6a0a901b52327309f8386787b8b160cb322d13f6/analyzer/prompts.py#L195)
- **Purpose**: To evaluate the **content quality** of the resume, not its visual formatting.

This final stage provides a score that acts as a multiplier on the candidate's final match score, rewarding well-documented experience. The assessment focuses on:

- **Clarity and Impact**: How well accomplishments are described and quantified (e.g., "improved performance by 30%").
- **Technical Depth**: The level of detail provided in project and experience descriptions.
- **Professionalism**: The overall tone and completeness of the narrative.

**Scoring & Red Flags:**

- The **`quality_score`** ranges from `0.50` (Poor) to `1.00` (Excellent).
- **`red_flags`** are identified only for serious issues like missing experience sections, contradictory information, or unprofessional language. Minor typos are ignored.

### Scoring Algorithm

The final score (0-100) is calculated using:

```bash
raw_score = (must_have_proficiency_points * weight)
            + (nice_to_have_proficiency_points * weight)
            + (experience_match_points)
            + (certification_bonus)
            + (leadership_bonus)

adjusted_score = raw_score * quality_multiplier

final_score = (adjusted_score / max_possible_score * 90) + 10
```

The normalization formula ensures:

- 10-point baseline for all candidates (recognizes basic qualifications)
- Score spread from 20-100, capped at 100
- Realistic distribution where 70+ = strong match, 50-69 = moderate, <50 = weak

**Weight Adjustments by Seniority:**

- Entry-level: Lower experience weight, higher certification/leadership bonuses
- Mid-level: Balanced weighting across all factors
- Senior: Higher must-have weight, lower nice-to-have weight, experience emphasis

### Temperature & Model Selection

- **Structuring tasks** (Stages 1, 3, 4): `llama-3.1-8b-instant` - Fast, reliable for JSON extraction
- **Analysis task** (Stage 2): `groq/compound` - More nuanced reasoning for skill matching
- **Temperature**: 0.2 - Deterministic output with minimal creativity

This configuration balances cost, speed, and quality for production use.

## 📊 Database Schema

<img src="assets/db_schema.excalidraw.png" alt="Database Schema Diagram" width="650"/>

## 🔌 API Endpoints

### Jobs

**GET** `/jobs/`

- Returns all jobs with candidate count

**GET** `/jobs/{job_id}/screenings/`

- Returns all screenings for a job, ordered by score (descending)

**DELETE** `/jobs/{job_id}`

- Deletes job and all associated screenings

### Screening

**POST** `/screen/`

- **Body**: FormData with `job_title` (optional), `jd_file`, `resume_files[]`
- Processes job description and resumes
- Returns array of screening results

**POST** `/jobs/{job_id}/add-candidates/`

- **Body**: FormData with `resume_files[]`
- Adds new candidates to existing job
- Reuses existing JD analysis

**DELETE** `/screenings/{screening_id}`

- Deletes individual screening result

## 🚀 Setup Instructions

### Prerequisites

- **Python 3.10 or higher** - [Download](https://www.python.org/downloads/)
- **Node.js 18+ and npm** - [Download](https://nodejs.org/)
- **Git** - [Download](https://git-scm.com/downloads)
- **Groq API Key** - [Sign up](https://console.groq.com/)
- **PostgreSQL Database** - Use [Neon](https://neon.tech/) (free tier) or local PostgreSQL

### Backend Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/akshad135/smart-resume-screener.git
   cd smart-resume-screener
   ```

2. **Navigate to backend directory**

   ```bash
   cd backend
   ```

3. **Create virtual environment**

   ```bash
   # Windows
   python -m venv venv
   venv\Scripts\activate

   # Linux/Mac
   python3 -m venv venv
   source venv/bin/activate
   ```

4. **Install dependencies**

   ```bash
   pip install -r requirements.txt
   ```

5. **Create `.env` file**

   Create a `.env` file in the `backend` directory with:

   ```bash
   DATABASE_URL=postgresql://username:password@host:port/database
   GROQ_API_KEY=your_groq_api_key_here
   ```

6. **Run database migrations**

   Tables will be automatically created on first run by SQLAlchemy.

7. **Start the backend server**

   ```bash
   uvicorn app.main:app --reload
   ```

   Backend will run on `http://localhost:8000`

   **Verify backend**: Visit `http://localhost:8000/docs` to see the API documentation.

### Frontend Setup

1. **Open a new terminal** and navigate to frontend directory

   ```bash
   cd frontend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start development server**

   ```bash
   npm run dev
   ```

   Frontend will run on `http://localhost:5173`

4. **Open in browser**

   Navigate to `http://localhost:5173` to access the application.
