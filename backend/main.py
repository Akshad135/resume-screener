from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from decimal import Decimal
import uuid
from typing import Optional, List

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

# --- GET Endpoints for Frontend ---

@app.get("/jobs/", response_model=List[schemas.Job])
def read_jobs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Retrieve a list of all jobs in the database.
    This powers the main dashboard view on the frontend.
    """
    jobs = crud.get_jobs(db, skip=skip, limit=limit)
    return jobs

@app.get("/jobs/{job_id}/screenings/", response_model=List[schemas.Screening])
def read_screenings_for_job(job_id: int, db: Session = Depends(get_db)):
    """
    Retrieve a ranked list of all screenings for a specific job.
    This powers the ranked candidate list on the frontend.
    """
    screenings = db.query(models.Screening)\
                   .filter(models.Screening.job_id == job_id)\
                   .order_by(models.Screening.final_score.desc())\
                   .all()
    return screenings

# --- POST Endpoint ---

@app.post("/screen/", response_model=List[schemas.Screening])
async def screen_multiple_resumes(
    job_title: Optional[str] = Form(None),
    jd_file: UploadFile = File(...),
    resume_files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    # 1. Process the Job Description ONCE at the start.
    jd_bytes = await jd_file.read()
    if jd_file.content_type == 'text/plain':
        jd_text = extract_text_from_txt(jd_bytes)
    elif jd_file.content_type == 'application/pdf':
        jd_text = extract_text_from_pdf(jd_bytes)
    else:
        raise HTTPException(status_code=400, detail="Unsupported JD file type.")
    
    if not jd_text:
        raise HTTPException(status_code=400, detail="Could not extract text from JD file.")

    processed_screenings = []
    db_job = None

    # 2. Loop through each uploaded resume file.
    for resume_file in resume_files:
        if resume_file.content_type != 'application/pdf':
            print(f"Skipping non-PDF file: {resume_file.filename}")
            continue

        resume_bytes = await resume_file.read()

        # 3. Run the core analyzer for the current resume.
        try:
            analysis_result = run_analysis(
                job_description_text=jd_text, 
                resume_file_content=resume_bytes
            )
            if "error" in analysis_result:
                print(f"Skipping resume {resume_file.filename} due to analysis error: {analysis_result['error']}")
                continue
        except Exception as e:
            print(f"Skipping resume {resume_file.filename} due to unexpected error: {e}")
            continue

        # 4. Extract raw text from resume for database storage.
        resume_text = extract_text_from_pdf(resume_bytes)
        if not resume_text:
            print(f"Skipping resume {resume_file.filename} because text could not be extracted.")
            continue

        # 5. Prepare data and handle Candidate creation/retrieval for the current resume.
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

        # 6. Prepare data and handle Job creation/retrieval (only runs once).
        if db_job is None:
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

        # 7. Create the final screening record in the database for the current resume.
        screening_schema = schemas.ScreeningCreate(
            final_score=Decimal(str(analysis_result.get("final_score"))),
            quality_multiplier=Decimal(str(analysis_result["quality_assessment"]["quality_score"])),
            skill_match_analysis=analysis_result.get("llm_analysis", {})
        )
        
        db_screening = crud.create_screening(db, screening=screening_schema, job_id=db_job.id, candidate_id=db_candidate.id)
        processed_screenings.append(db_screening)

    if not processed_screenings:
        raise HTTPException(status_code=400, detail="No valid resumes were processed.")

    return processed_screenings
