from fastapi import APIRouter, Depends, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_db
from schemas.job import JobCreate, JobUpdate, JobResponse
from services.job import JobService
from typing import List, Optional
from uuid import UUID
from services.publisher_service import publish_job_to_linkedin_background
from core.security import get_current_user
from models.user import User

router = APIRouter(prefix="/jobs", tags=["Jobs"])

def get_job_service(db: AsyncSession = Depends(get_db)) -> JobService:
    return JobService(db)

@router.post("", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(
    job: JobCreate, 
    background_tasks: BackgroundTasks, 
    service: JobService = Depends(get_job_service),
    current_user: User = Depends(get_current_user)
):
    created_job = await service.create_job(job, current_user.id)
    # Trigger publish immediately
    background_tasks.add_task(publish_job_to_linkedin_background, created_job.id)
    return created_job

@router.post("/{id}/publish/linkedin")
async def publish_to_linkedin(
    id: UUID, 
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    service: JobService = Depends(get_job_service)
):
    # Verify ownership before publishing
    await service.get_job(id, current_user.id)
    background_tasks.add_task(publish_job_to_linkedin_background, id)
    return {"status": "LinkedIn publish task initiated in background", "job_id": id}

@router.get("", response_model=List[JobResponse])
async def list_jobs(
    skip: int = 0, 
    limit: int = 100, 
    status: Optional[str] = None, 
    service: JobService = Depends(get_job_service),
    current_user: User = Depends(get_current_user)
):
    return await service.get_jobs(current_user.id, skip, limit, status)

@router.get("/{id}", response_model=JobResponse)
async def get_job(
    id: UUID, 
    service: JobService = Depends(get_job_service),
    current_user: User = Depends(get_current_user)
):
    return await service.get_job(id, current_user.id)

@router.put("/{id}", response_model=JobResponse)
async def update_job(
    id: UUID, 
    job: JobUpdate, 
    service: JobService = Depends(get_job_service),
    current_user: User = Depends(get_current_user)
):
    return await service.update_job(id, job, current_user.id)

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(
    id: UUID, 
    service: JobService = Depends(get_job_service),
    current_user: User = Depends(get_current_user)
):
    await service.delete_job(id, current_user.id)
