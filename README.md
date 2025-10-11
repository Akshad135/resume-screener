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

Our system uses a multi-stage LLM pipeline with carefully crafted prompts to ensure accurate, evidence-based candidate evaluation. All prompts are available in [`backend/app/prompts.py`](link-to-file).

### Prompt Design Philosophy

We employ a **generous and inference-based** approach to skill matching, recognizing that:

- Related technologies demonstrate transferable skills
- Framework usage implies knowledge of underlying technologies
- Entry-level candidates should be evaluated on potential, not perfection

### Stage 1: Job Description Deconstruction

**Model**: `llama-3.1-8b-instant` | **Prompt**: [`JD_DECONSTRUCTION_PROMPT`](link-to-file)

Parses unstructured job descriptions into a structured format with must-have and nice-to-have skills. The prompt is designed to:

- Identify role seniority (Entry/Mid/Senior) to adjust screening criteria
- Limit must-have skills to core competencies (3-5 for entry-level, 5-8 for senior)
- Categorize advanced/specialized skills as nice-to-have to avoid over-filtering
- Extract minimum experience requirements

This conservative approach to must-haves prevents false negatives from overly restrictive job postings.

### Stage 2: Combined Skill Analysis

**Model**: `groq/compound` | **Prompt**: [`COMBINED_ANALYSIS_PROMPT`](link-to-file)

The core of our system - matches candidate skills to job requirements with evidence extraction. Key features:

**Mandatory Inference Rules:**

- Framework usage implies tool knowledge (Spring Boot → REST APIs, Maven/Gradle, Hibernate)
- Related frameworks count as skill matches (Flask/Django → FastAPI at Level 2)
- Cloud platforms are transferable (AWS experience → Azure/GCP at Level 2)

**Proficiency Scoring System:**

- **Level 3** (Central Skill): Multiple substantial projects, clear expertise
- **Level 2** (Used in Project): Direct usage OR heavily implied by tech stack OR similar technology
- **Level 1** (Mentioned): Listed anywhere OR adjacent technology present
- **Level 0** (Not Found): Zero evidence AND no related technologies

**Evidence Extraction:**
Every proficiency assignment includes the actual quote from the resume that justifies the rating, ensuring transparency and auditability.

**Executive Summary Generation:**
Produces a concise 2-3 sentence assessment highlighting the candidate's strongest matches and noting critical gaps, if any.

### Stage 3: Holistic Resume Parsing

**Model**: `llama-3.1-8b-instant` | **Prompt**: [`HOLISTIC_DATA_PARSER_PROMPT`](link-to-file)

Extracts structured candidate data for scoring calculation:

- Full name and contact information (email/phone)
- Work experience and projects with durations
- Certifications and awards
- Leadership roles and extracurricular activities

This data feeds into the weighted scoring algorithm, where certifications and leadership provide bonus points.

### Stage 4: Resume Quality Assessment

**Model**: `llama-3.1-8b-instant` | **Prompt**: [`RESUME_QUALITY_PROMPT`](link-to-file)

Evaluates **content quality**, not formatting (since we only have raw text). Focuses on:

- Clarity of accomplishments and technical descriptions
- Quantification and impact metrics (e.g., "improved performance by 30%")
- Depth of technical detail in project descriptions
- Professional language and completeness

**Quality Score Range**: 0.70 (poor content) to 1.00 (excellent content)

**Red Flags**: Only identifies serious issues like missing experience sections, contradictory information, or unprofessional language. Minor typos and style choices are ignored.

The quality score acts as a multiplier on the final match score, rewarding well-documented experience.

### Scoring Algorithm

The final score (0-100) is calculated using:

```
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

### Tables

**jobs**

- `id`: Integer (Primary Key)
- `title`: String (Job title)
- `created_at`: DateTime

**candidates**

- `id`: Integer (Primary Key)
- `full_name`: String
- `contact_info`: String

**screenings**

- `id`: Integer (Primary Key)
- `job_id`: Foreign Key → jobs.id
- `candidate_id`: Foreign Key → candidates.id
- `final_score`: Integer (0-100)
- `unadjusted_score`: Integer
- `quality_multiplier`: Float
- `skill_match_analysis`: JSON (Skill analysis results)
- `structured_resume`: JSON (Parsed resume data)
- `red_flags`: JSON (red flags)
- `created_at`: DateTime

**Relationships**:

- One job → Many screenings
- One candidate → Many screenings
- Cascade delete: Deleting a job deletes all its screenings

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

```
git clone https://github.com/akshad135/smart-resume-screener.git
cd smart-resume-screener
```

2. **Navigate to backend directory**

```
cd backend
```

3. **Create virtual environment**

```
Windows
python -m venv venv
venv\Scripts\activate

Linux/Mac
python3 -m venv venv
source venv/bin/activate
```

4. **Install dependencies**

```
pip install -r requirements.txt
```

5. **Create `.env` file**

Create a `.env` file in the `backend` directory with:

```
DATABASE_URL=postgresql://username:password@host:port/database
GROQ_API_KEY=your_groq_api_key_here
```

6. **Run database migrations**

Tables will be automatically created on first run by SQLAlchemy.

7. **Start the backend server**

```
uvicorn app.main:app --reload
```

Backend will run on `http://localhost:8000`

**Verify backend**: Visit `http://localhost:8000/docs` to see the API documentation.

### Frontend Setup

1. **Open a new terminal** and navigate to frontend directory

```
cd frontend
```

2. **Install dependencies**

```
npm install
```

3. **Start development server**

```
npm run dev
```

Frontend will run on `http://localhost:5173`

4. **Open in browser**

Navigate to `http://localhost:5173` to access the application.
