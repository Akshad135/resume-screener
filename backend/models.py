from sqlalchemy import Column, Integer, String, Text, Numeric, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func

from .database import Base

class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), index=True)
    raw_jd_text = Column(Text)
    structured_jd = Column(JSONB)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    screenings = relationship("Screening", back_populates="job")

class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), index=True)
    email = Column(String(255), unique=True, index=True)
    raw_resume_text = Column(Text)
    structured_resume = Column(JSONB)
    total_experience = Column(Numeric(4, 2))  # e.g., 10.50 years
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    screenings = relationship("Screening", back_populates="candidate")

class Screening(Base):
    __tablename__ = "screenings"

    id = Column(Integer, primary_key=True, index=True)
    final_score = Column(Numeric(5, 2))  # e.g., 95.75
    skill_match_analysis = Column(JSONB)
    quality_multiplier = Column(Numeric(3, 2)) # e.g., 0.95
    screened_at = Column(DateTime(timezone=True), server_default=func.now())

    job_id = Column(Integer, ForeignKey("jobs.id"))
    candidate_id = Column(Integer, ForeignKey("candidates.id"))

    job = relationship("Job", back_populates="screenings")
    candidate = relationship("Candidate", back_populates="screenings")