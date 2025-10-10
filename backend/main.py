from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from decimal import Decimal

# Correctly import from the parent 'analyzer' package
from analyzer.main import run_analysis
from analyzer.parsers import extract_text_from_pdf

from . import crud, models, schemas
from .database import SessionLocal, engine

# This line creates the database tables if they don't exist
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Smart Resume Screener API",
    description="An API to screen resumes against job descriptions using AI.",
    version="1.0.0"
)

# --- Dependency for Database Session ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- API Endpoint ---
@app.post("/screen/", response_model=schemas.Screening)
async def screen_resume_and_jd(
    job_title: str = Form(...),
    jd_file: UploadFile = File(...),
    resume_file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Main endpoint to screen a resume against a job description.
    """
    # Read the file contents into the formats required by the analyzer and database
    jd_text = (await jd_file.read()).decode("utf-8", errors="ignore")
    resume_bytes = await resume_file.read()

    # 1. Run the core analyzer with the raw bytes of the resume
    try:
        analysis_result = run_analysis(
            job_description_text=jd_text, 
            resume_file_content=resume_bytes
        )
        if "error" in analysis_result:
            raise HTTPException(status_code=500, detail=analysis_result["error"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred during analysis: {str(e)}")

    # 2. Extract raw text from resume for database storage
    resume_text = extract_text_from_pdf(resume_bytes)
    if not resume_text:
        raise HTTPException(status_code=400, detail="Could not extract text from the provided resume PDF.")

    # 3. Prepare data and handle Candidate creation/retrieval
    # TODO: Update your analyzer prompts to extract name and email from resume_text
    candidate_email = "candidate@example.com"
    candidate_name = "Placeholder Name"

    db_candidate = crud.get_candidate_by_email(db, email=candidate_email)
    if not db_candidate:
        candidate_schema = schemas.CandidateCreate(
            email=candidate_email,
            full_name=candidate_name,
            raw_resume_text=resume_text,
            structured_resume=analysis_result.get("structured_resume", {}),
            total_experience=Decimal(str(analysis_result["llm_analysis"]["experience_match_analysis"]["calculated_candidate_years"]))
        )
        db_candidate = crud.create_candidate(db, candidate=candidate_schema)

    # 4. Prepare data and handle Job creation/retrieval
    db_job = crud.get_job_by_title(db, title=job_title)
    if not db_job:
        job_schema = schemas.JobCreate(
            title=job_title,
            raw_jd_text=jd_text,
            structured_jd=analysis_result.get("structured_jd", {})
        )
        db_job = crud.create_job(db, job=job_schema)

    # 5. Create the final screening record in the database
    screening_schema = schemas.ScreeningCreate(
        final_score=Decimal(str(analysis_result.get("final_score"))),
        quality_multiplier=Decimal(str(analysis_result["quality_assessment"]["quality_score"])),
        skill_match_analysis=analysis_result.get("llm_analysis", {})
    )
    
    db_screening = crud.create_screening(db, screening=screening_schema, job_id=db_job.id, candidate_id=db_candidate.id)

    return db_screening