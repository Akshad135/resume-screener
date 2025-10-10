from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from decimal import Decimal
import uuid
from typing import Optional

from analyzer.main import run_analysis
from analyzer.parsers import extract_text_from_pdf, extract_text_from_txt

from . import crud, models, schemas
from .database import SessionLocal, engine

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Smart Resume Screener API",
    description="An API to screen resumes against job descriptions using AI.",
    version="1.0.0"
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- API Endpoint ---
@app.post("/screen/", response_model=schemas.Screening)
async def screen_resume_and_jd(
    job_title: Optional[str] = Form(None),
    jd_file: UploadFile = File(...),
    resume_file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    # 1. Read file bytes first
    jd_bytes = await jd_file.read()
    resume_bytes = await resume_file.read()

    # 2. Process Job Description based on its file type
    if jd_file.content_type == 'text/plain':
        jd_text = extract_text_from_txt(jd_bytes)
    elif jd_file.content_type == 'application/pdf':
        jd_text = extract_text_from_pdf(jd_bytes)
    else:
        raise HTTPException(status_code=400, detail="Unsupported Job Description file type. Please upload a .txt or .pdf file.")

    if not jd_text:
        raise HTTPException(status_code=400, detail="Could not extract text from the Job Description file.")

    # 3. Validate that the resume is a PDF, as required by the analyzer
    if resume_file.content_type != 'application/pdf':
        raise HTTPException(status_code=400, detail="Unsupported Resume file type. Please upload a .pdf file.")

    # 4. Run the core analyzer with the prepared data
    try:
        analysis_result = run_analysis(
            job_description_text=jd_text, 
            resume_file_content=resume_bytes
        )
        if "error" in analysis_result:
            raise HTTPException(status_code=500, detail=analysis_result["error"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred during analysis: {str(e)}")

    # 5. Extract raw text from resume for database storage
    resume_text = extract_text_from_pdf(resume_bytes)
    if not resume_text:
        raise HTTPException(status_code=400, detail="Could not extract text from the provided resume PDF, it might be empty or corrupted.")

    # 6. Prepare data and handle Candidate creation/retrieval
    structured_resume = analysis_result.get("structured_resume", {})
    candidate_contact = structured_resume.get("contact_info", f"unknown_{uuid.uuid4()}@example.com")
    candidate_name = structured_resume.get("full_name", "Unknown Candidate")

    db_candidate = crud.get_candidate_by_contact(db, contact=candidate_contact)
    if not db_candidate:
        candidate_schema = schemas.CandidateCreate(
            contact_info=candidate_contact,
            full_name=candidate_name,
            raw_resume_text=resume_text,
            structured_resume=structured_resume,
            total_experience=Decimal(str(analysis_result["llm_analysis"]["experience_match_analysis"]["calculated_candidate_years"]))
        )
        db_candidate = crud.create_candidate(db, candidate=candidate_schema)

    # 7. Prepare data and handle Job creation/retrieval
    structured_jd = analysis_result.get("structured_jd", {})
    final_job_title = job_title if job_title else structured_jd.get("job_title", f"Untitled Job - {uuid.uuid4().hex[:6]}")
    
    db_job = crud.get_job_by_title(db, title=final_job_title)
    if not db_job:
        job_schema = schemas.JobCreate(
            title=final_job_title,
            raw_jd_text=jd_text,
            structured_jd=structured_jd
        )
        db_job = crud.create_job(db, job=job_schema)

    # 8. Create the final screening record in the database
    screening_schema = schemas.ScreeningCreate(
        final_score=Decimal(str(analysis_result.get("final_score"))),
        quality_multiplier=Decimal(str(analysis_result["quality_assessment"]["quality_score"])),
        skill_match_analysis=analysis_result.get("llm_analysis", {})
    )
    
    db_screening = crud.create_screening(db, screening=screening_schema, job_id=db_job.id, candidate_id=db_candidate.id)

    return db_screening
