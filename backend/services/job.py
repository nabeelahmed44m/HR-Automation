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

    async def create_job(self, job: JobCreate, owner_id: UUID) -> Job:
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
                            content_type = response.headers.get("content-type", "image/png")
                            base64_data = base64.b64encode(response.content).decode("utf-8")
                            job_data["image_base64"] = f"data:{content_type};base64,{base64_data}"
                            logger.info(f"Successfully fetched image from {image_url} (type: {content_type})")
                except Exception as img_err:
                    logger.warning(f"Failed to fetch image from {image_url}: {str(img_err)}")

            # 2. Handle Tags formatting
            tags_list = job_data.pop("tags", [])
            if tags_list:
                job_data["tags"] = ",".join(tags_list)
                
            from models.publish import PublishStatus
            # Pre-lock the status as pending so the Cron task doesn't duplicate grab it!
            job_data["publish_status"] = PublishStatus.pending
            
            created_job = await self.repository.create(job_data, owner_id)
            await self.session.commit()
            logger.info(f"Created job {created_job.id} for user {owner_id}")
            return created_job
        except Exception as e:
            await self.session.rollback()
            logger.error(f"Error creating job: {str(e)}")
            raise HTTPException(status_code=500, detail="Internal server error")

    async def get_jobs(self, owner_id: UUID, skip: int = 0, limit: int = 100, status: str = None) -> List[Job]:
        return await self.repository.get_all(owner_id, skip, limit, status)

    async def get_job(self, id: UUID, owner_id: UUID) -> Job:
        job = await self.repository.get_by_id(id, owner_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        return job

    async def get_job_public(self, id: UUID) -> Job:
        job = await self.repository.get_by_id_public(id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        return job

    async def update_job(self, id: UUID, job_update: JobUpdate, owner_id: UUID) -> Job:
        job = await self.get_job(id, owner_id)
        update_data = job_update.model_dump(exclude_unset=True)
        try:
            updated_job = await self.repository.update(job, update_data)
            await self.session.commit()
            logger.info(f"Updated job {id} for user {owner_id}")
            return updated_job
        except Exception as e:
            await self.session.rollback()
            logger.error(f"Error updating job {id}: {str(e)}")
            raise HTTPException(status_code=500, detail="Internal server error")

    async def delete_job(self, id: UUID, owner_id: UUID) -> None:
        job = await self.get_job(id, owner_id)
        try:
            await self.repository.delete(job)
            await self.session.commit()
            logger.info(f"Deleted job {id} for user {owner_id}")
        except Exception as e:
            await self.session.rollback()
            logger.error(f"Error deleting job {id}: {str(e)}")
            raise HTTPException(status_code=500, detail="Internal server error")
