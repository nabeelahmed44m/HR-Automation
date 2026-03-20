from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from repositories.job import JobRepository
from schemas.job import JobCreate, JobUpdate
from models.job import Job
from uuid import UUID
from typing import List
import logging

logger = logging.getLogger(__name__)

class JobService:
    def __init__(self, session: AsyncSession):
        self.repository = JobRepository(session)
        self.session = session

    async def create_job(self, job: JobCreate) -> Job:
        try:
            job_data = job.model_dump()
            
            # 1. Handle Image Fetching from URL
            image_url = job_data.pop("image_url", None)
            if image_url:
                try:
                    import httpx
                    import base64
                    async with httpx.AsyncClient() as client:
                        response = await client.get(image_url)
                        if response.status_code == 200:
                            job_data["image_base64"] = base64.b64encode(response.content).decode("utf-8")
                            logger.info(f"Successfully fetched image from {image_url}")
                except Exception as img_err:
                    logger.warning(f"Failed to fetch image from {image_url}: {str(img_err)}")

            # 2. Handle Tags formatting
            tags_list = job_data.pop("tags", [])
            if tags_list:
                job_data["tags"] = ",".join(tags_list)
                
            created_job = await self.repository.create(job_data)
            await self.session.commit()
            logger.info(f"Created job {created_job.id}")
            return created_job
        except Exception as e:
            await self.session.rollback()
            logger.error(f"Error creating job: {str(e)}")
            raise HTTPException(status_code=500, detail="Internal server error")

    async def get_jobs(self, skip: int = 0, limit: int = 100, status: str = None) -> List[Job]:
        return await self.repository.get_all(skip, limit, status)

    async def get_job(self, id: UUID) -> Job:
        job = await self.repository.get_by_id(id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        return job

    async def update_job(self, id: UUID, job_update: JobUpdate) -> Job:
        job = await self.get_job(id)
        update_data = job_update.model_dump(exclude_unset=True)
        try:
            updated_job = await self.repository.update(job, update_data)
            await self.session.commit()
            logger.info(f"Updated job {id}")
            return updated_job
        except Exception as e:
            await self.session.rollback()
            logger.error(f"Error updating job {id}: {str(e)}")
            raise HTTPException(status_code=500, detail="Internal server error")

    async def delete_job(self, id: UUID) -> None:
        job = await self.get_job(id)
        try:
            await self.repository.delete(job)
            await self.session.commit()
            logger.info(f"Deleted job {id}")
        except Exception as e:
            await self.session.rollback()
            logger.error(f"Error deleting job {id}: {str(e)}")
            raise HTTPException(status_code=500, detail="Internal server error")
