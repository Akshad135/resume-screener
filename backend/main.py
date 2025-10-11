from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware 
from sqlalchemy.orm import Session
from decimal import Decimal
import uuid
from typing import Optional, List

# Import the two separate, synchronous functions
from analyzer.main import deconstruct_jd, analyze_single_resume
from analyzer.parsers import extract_text_from_pdf, extract_text_from_txt

from . import crud, models, schemas
from .database import SessionLocal, engine

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Smart Resume Screener API",
    description="An API to screen resumes against job descriptions using AI.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
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
    Retrieve a list of all jobs in the database with candidate counts.
    This powers the main dashboard view on the frontend.
    """
    try:
        jobs = crud.get_jobs(db, skip=skip, limit=limit)
        if not jobs:
            return []
        
        jobs_with_counts = []
        for job in jobs:
            candidate_count = db.query(models.Screening)\
                               .filter(models.Screening.job_id == job.id)\
                               .count()
            
            job_dict = {
                "id": job.id,
                "title": job.title,
                "created_at": job.created_at,
                "candidate_count": candidate_count
            }
            jobs_with_counts.append(job_dict)
        
        return jobs_with_counts
    except Exception as e:
        print(f"Error fetching jobs: {e}")
        raise HTTPException(
            status_code=500, 
            detail="Failed to retrieve jobs from database"
        )



@app.get("/jobs/{job_id}/screenings/", response_model=List[schemas.Screening])
def read_screenings_for_job(job_id: int, db: Session = Depends(get_db)):
    """
    Retrieve a ranked list of all screenings for a specific job.
    This powers the ranked candidate list on the frontend.
    """
    try:
        job = db.query(models.Job).filter(models.Job.id == job_id).first()
        if not job:
            raise HTTPException(
                status_code=404, 
                detail=f"Job with id {job_id} not found"
            )
        
        screenings = db.query(models.Screening)\
                       .filter(models.Screening.job_id == job_id)\
                       .order_by(models.Screening.final_score.desc())\
                       .all()
        
        return screenings
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching screenings for job {job_id}: {e}")
        raise HTTPException(
            status_code=500, 
            detail="Failed to retrieve screenings from database"
        )


# --- POST Endpoints ---

@app.post("/screen/", response_model=List[schemas.Screening])
async def screen_multiple_resumes( # Changed back to async def
    job_title: Optional[str] = Form(None),
    jd_file: UploadFile = File(...),
    resume_files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    # 1. Process the Job Description.
    jd_bytes = await jd_file.read() # Added await
    if jd_file.content_type == 'text/plain':
        jd_text = extract_text_from_txt(jd_bytes)
    elif jd_file.content_type == 'application/pdf':
        jd_text = extract_text_from_pdf(jd_bytes)
    else:
        raise HTTPException(status_code=400, detail="Unsupported JD file type.")
    
    if not jd_text:
        raise HTTPException(status_code=400, detail="Could not extract text from JD file.")
    
    structured_jd = deconstruct_jd(job_description_text=jd_text)
    if "error" in structured_jd:
        raise HTTPException(status_code=500, detail=structured_jd["error"])

    processed_screenings = []
    
    # 2. Prepare data and handle Job creation/retrieval.
    final_job_title = job_title if job_title else structured_jd.get("job_title", f"Untitled Job - {uuid.uuid4().hex[:6]}")
    db_job = crud.get_job_by_title(db, title=final_job_title)
    if not db_job:
        job_schema = schemas.JobCreate(
            title=final_job_title,
            raw_jd_text=jd_text,
            structured_jd=structured_jd
        )
        db_job = crud.create_job(db, job=job_schema)

    # 3. Loop through each uploaded resume file sequentially.
    for resume_file in resume_files:
        print(f"\n--- Processing resume: {resume_file.filename} ---")
        if resume_file.content_type != 'application/pdf':
            print(f"Skipping non-PDF file: {resume_file.filename}")
            continue

        resume_bytes = await resume_file.read()

        # 4. Run the core analyzer for the current resume.
        try:
            analysis_result = analyze_single_resume(
                structured_jd=structured_jd, 
                resume_file_content=resume_bytes,
                resume_filename=resume_file.filename
            )
            if "error" in analysis_result:
                print(f"Skipping resume {resume_file.filename} due to analysis error: {analysis_result['error']}")
                continue
        except Exception as e:
            print(f"Skipping resume {resume_file.filename} due to unexpected error: {e}")
            continue

        # 5. Extract raw text from resume for database storage.
        resume_text = extract_text_from_pdf(resume_bytes)
        if not resume_text:
            print(f"Skipping resume {resume_file.filename} because text could not be extracted.")
            continue

        # 6. Prepare data and handle Candidate creation/retrieval for the current resume.
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

        # 7. Create the final screening record in the database for the current resume.
        screening_schema = schemas.ScreeningCreate(
            final_score=Decimal(str(analysis_result.get("final_score"))),
            quality_multiplier=Decimal(str(analysis_result["quality_assessment"]["quality_score"])),
            skill_match_analysis=analysis_result.get("llm_analysis", {})
        )
        
        db_screening = crud.create_screening(db, screening=screening_schema, job_id=db_job.id, candidate_id=db_candidate.id)
        processed_screenings.append(db_screening)
        print(f"--- Successfully processed and saved: {resume_file.filename} ---")

    if not processed_screenings:
        raise HTTPException(status_code=400, detail="No valid resumes were processed.")

    return processed_screenings


@app.post("/jobs/{job_id}/add-candidates/", response_model=List[schemas.Screening])
async def add_candidates_to_job(
    job_id: int,
    resume_files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    """
    Add new candidates to an existing job without re-uploading the JD.
    Reuses the stored structured_jd from the database.
    """
    try:
        # 1. Fetch the job and verify it exists
        db_job = db.query(models.Job).filter(models.Job.id == job_id).first()
        if not db_job:
            raise HTTPException(status_code=404, detail=f"Job with id {job_id} not found")
        
        # 2. Get the pre-analyzed JD structure
        structured_jd = db_job.structured_jd
        if not structured_jd:
            raise HTTPException(status_code=400, detail="Job description structure not found")
        
        processed_screenings = []
        
        # 3. Loop through each uploaded resume file
        for resume_file in resume_files:
            print(f"\n--- Processing resume: {resume_file.filename} ---")
            if resume_file.content_type != 'application/pdf':
                print(f"Skipping non-PDF file: {resume_file.filename}")
                continue

            resume_bytes = await resume_file.read()

            # 4. Run the core analyzer for the current resume
            try:
                analysis_result = analyze_single_resume(
                    structured_jd=structured_jd,
                    resume_file_content=resume_bytes,
                    resume_filename=resume_file.filename
                )
                if "error" in analysis_result:
                    print(f"Skipping resume {resume_file.filename} due to analysis error: {analysis_result['error']}")
                    continue
            except Exception as e:
                print(f"Skipping resume {resume_file.filename} due to unexpected error: {e}")
                continue

            # 5. Extract raw text from resume for database storage
            resume_text = extract_text_from_pdf(resume_bytes)
            if not resume_text:
                print(f"Skipping resume {resume_file.filename} because text could not be extracted.")
                continue

            # 6. Prepare candidate data
            structured_resume = analysis_result.get("structured_resume", {})
            candidate_contact = structured_resume.get("contact_info", f"unknown_{uuid.uuid4()}@example.com")
            candidate_name = structured_resume.get("full_name", "Unknown Candidate")

            # 7. Check if candidate already exists
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

            # 8. Check if this candidate was already screened for this job
            existing_screening = db.query(models.Screening)\
                .filter(models.Screening.job_id == job_id)\
                .filter(models.Screening.candidate_id == db_candidate.id)\
                .first()
            
            if existing_screening:
                print(f"Candidate {candidate_name} already screened for this job. Skipping.")
                continue

            # 9. Create the screening record
            screening_schema = schemas.ScreeningCreate(
                final_score=Decimal(str(analysis_result.get("final_score"))),
                quality_multiplier=Decimal(str(analysis_result["quality_assessment"]["quality_score"])),
                skill_match_analysis=analysis_result.get("llm_analysis", {})
            )
            
            db_screening = crud.create_screening(db, screening=screening_schema, job_id=db_job.id, candidate_id=db_candidate.id)
            processed_screenings.append(db_screening)
            print(f"--- Successfully processed and saved: {resume_file.filename} ---")

        if not processed_screenings:
            raise HTTPException(status_code=400, detail="No valid resumes were processed.")

        return processed_screenings
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error adding candidates to job {job_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process candidates: {str(e)}")


# --- DELETE Endpoints ---

@app.delete("/jobs/{job_id}")
def delete_job(job_id: int, db: Session = Depends(get_db)):
    """
    Delete a job and all its associated screenings.
    """
    try:
        # Check if job exists
        job = db.query(models.Job).filter(models.Job.id == job_id).first()
        if not job:
            raise HTTPException(status_code=404, detail=f"Job with id {job_id} not found")
        
        # Delete using crud function
        success = crud.delete_job(db, job_id)
        if success:
            return {"message": f"Job {job_id} and all associated screenings deleted successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to delete job")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting job {job_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete job")


@app.delete("/screenings/{screening_id}")
def delete_screening(screening_id: int, db: Session = Depends(get_db)):
    """
    Delete a specific candidate screening from a job.
    """
    try:
        # Check if screening exists
        screening = db.query(models.Screening).filter(models.Screening.id == screening_id).first()
        if not screening:
            raise HTTPException(status_code=404, detail=f"Screening with id {screening_id} not found")
        
        # Delete using crud function
        success = crud.delete_screening(db, screening_id)
        if success:
            return {"message": f"Screening {screening_id} deleted successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to delete screening")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting screening {screening_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete screening")
