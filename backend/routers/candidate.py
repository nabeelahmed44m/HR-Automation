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
