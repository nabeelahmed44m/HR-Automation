from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from core.database import get_db
from models.candidate import Candidate
from models.job import Job
from schemas.candidate import CandidateCreate, CandidateResponse
from typing import List
from uuid import UUID
from core.security import get_current_user
from models.user import User

router = APIRouter(prefix="/jobs", tags=["Candidates"])

# PUBLIC ENDPOINT: Anyone can apply
@router.post("/{job_id}/apply", response_model=CandidateResponse, status_code=status.HTTP_201_CREATED)
async def apply_for_job(
    job_id: UUID, 
    candidate_in: CandidateCreate, 
    db: AsyncSession = Depends(get_db)
):
    # Verify job exists
    query = select(Job).where(Job.id == job_id)
    result = await db.execute(query)
    job = result.scalars().first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    new_candidate = Candidate(
        job_id=job_id,
        **candidate_in.model_dump()
    )
    
    # --- ATS SCORING ENGINE INTEGRATION ---
    from services.ats_engine import ATSEngine
    from services.pdf_parser import extract_text_from_pdf_base64
    
    engine = ATSEngine()
    
    # Extract text from PDF if available
    pdf_extracted_text = ""
    if candidate_in.resume_base64:
        pdf_extracted_text = extract_text_from_pdf_base64(candidate_in.resume_base64)
    
    # Final resume text to score: extracted PDF text takes priority, fallback to executive summary
    final_resume_text = pdf_extracted_text if pdf_extracted_text else (candidate_in.resume_text or "")
    
    # We pass the job data (dict) and the resume text
    job_data_dict = {
        "description": job.description,
        "requirements": job.requirements,
        "experience_level": job.experience_level,
        "skill_weight": job.skill_weight,
        "experience_weight": job.experience_weight,
        "education_weight": job.education_weight,
        "keyword_weight": job.keyword_weight
    }
    
    score_result = engine.calculate_score(job_data_dict, final_resume_text)
    new_candidate.ats_score = score_result["score"]
    
    # Add the extracted full text to the explanation for reference
    explanation = score_result["explanation"]
    if pdf_extracted_text:
        explanation["is_pdf_extracted"] = True
        
    new_candidate.ats_explanation = explanation
    
    # State update based on thresholds
    score = score_result["score"]
    shortlist_t = float(job.shortlist_threshold or 70)
    review_t = float(job.review_threshold or 50)
    
    if score >= shortlist_t:
        new_candidate.status = "shortlisted"
    elif score >= review_t:
        new_candidate.status = "review"
    else:
        new_candidate.status = "rejected"
        
    db.add(new_candidate)
    await db.commit()
    await db.refresh(new_candidate)
    return new_candidate

# PROTECTED ENDPOINT: Admin can see applicants
@router.get("/{job_id}/applicants", response_model=List[CandidateResponse])
async def get_job_applicants(
    job_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if job belongs to user
    query = select(Job).where(Job.id == job_id, Job.owner_id == current_user.id)
    result = await db.execute(query)
    job = result.scalars().first()
    
    if not job:
        raise HTTPException(status_code=403, detail="Not authorized to access these applicants")

    query = select(Candidate).where(Candidate.job_id == job_id).order_by(Candidate.applied_at.desc())
    result = await db.execute(query)
    applicants = result.scalars().all()
    return applicants

@router.get("/{job_id}/application/count")
async def get_application_count(
    job_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if job belongs to user
    from models.job import Job
    job_query = select(Job).where(Job.id == job_id, Job.owner_id == current_user.id)
    job_result = await db.execute(job_query)
    if not job_result.scalars().first():
        raise HTTPException(status_code=403, detail="Not authorized to access this job's metrics")
        
    from sqlalchemy import func
    query = select(func.count(Candidate.id)).where(Candidate.job_id == job_id)
    result = await db.execute(query)
    count = result.scalar()
    return {"count": count}
