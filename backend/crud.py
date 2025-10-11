from sqlalchemy.orm import Session
from . import models, schemas

# --- Candidate CRUD Functions ---

def get_candidate_by_contact(db: Session, contact: str):
    """
    Retrieve a single candidate from the database by their contact info.
    """
    return db.query(models.Candidate).filter(models.Candidate.contact_info == contact).first()

def create_candidate(db: Session, candidate: schemas.CandidateCreate):
    """
    Create a new candidate record in the database.
    """
    db_candidate = models.Candidate(**candidate.model_dump())
    db.add(db_candidate)
    db.commit()
    db.refresh(db_candidate)
    return db_candidate

# --- Job CRUD Functions ---

def get_job_by_title(db: Session, title: str):
    """
    Retrieve a single job from the database by its title.
    """
    return db.query(models.Job).filter(models.Job.title == title).first()

def get_jobs(db: Session, skip: int = 0, limit: int = 100):
    """
    Retrieve all job records.
    """
    return db.query(models.Job).offset(skip).limit(limit).all()

def create_job(db: Session, job: schemas.JobCreate):
    """
    Create a new job record in the database.
    """
    db_job = models.Job(**job.model_dump())
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    return db_job

def delete_job(db: Session, job_id: int):
    """
    Delete a job and all associated screenings.
    """
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if job:
        # Delete all screenings associated with this job first
        db.query(models.Screening).filter(models.Screening.job_id == job_id).delete()
        # Delete the job
        db.delete(job)
        db.commit()
        return True
    return False

# --- Screening CRUD Functions ---

def create_screening(db: Session, screening: schemas.ScreeningCreate, job_id: int, candidate_id: int):
    """
    Create a new screening record, linking a job and a candidate.
    """
    db_screening = models.Screening(
        **screening.model_dump(),
        job_id=job_id,
        candidate_id=candidate_id
    )
    db.add(db_screening)
    db.commit()
    db.refresh(db_screening)
    return db_screening

def get_screenings_for_job(db: Session, job_id: int, skip: int = 0, limit: int = 100):
    """
    Retrieve all screening records for a specific job.
    """
    return db.query(models.Screening).filter(models.Screening.job_id == job_id).offset(skip).limit(limit).all()

def delete_screening(db: Session, screening_id: int):
    """
    Delete a specific screening record.
    """
    screening = db.query(models.Screening).filter(models.Screening.id == screening_id).first()
    if screening:
        db.delete(screening)
        db.commit()
        return True
    return False
