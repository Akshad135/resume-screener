from pydantic import BaseModel, EmailStr
from datetime import datetime
from decimal import Decimal
from typing import List, Dict, Any, Optional

# --- Candidate Schemas ---

class CandidateBase(BaseModel):
    contact_info: str
    full_name: Optional[str] = None

class CandidateCreate(CandidateBase):
    raw_resume_text: str
    structured_resume: Dict[str, Any]
    total_experience: Decimal

class Candidate(CandidateBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# --- Job Schemas ---

class JobBase(BaseModel):
    title: str

class JobCreate(JobBase):
    raw_jd_text: str
    structured_jd: Dict[str, Any]

class Job(JobBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# --- Screening Schemas ---

class ScreeningBase(BaseModel):
    final_score: Decimal
    quality_multiplier: Decimal
    skill_match_analysis: Dict[str, Any]

class ScreeningCreate(ScreeningBase):
    pass

class Screening(ScreeningBase):
    id: int
    screened_at: datetime
    job_id: int
    candidate_id: int
    
    job: Job
    candidate: Candidate
    
    class Config:
        from_attributes = True