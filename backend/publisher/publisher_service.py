import asyncio
import logging
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import AsyncSessionLocal
from repositories.job import JobRepository
from models.job import PublishStatus
from publisher.linkedin_publisher import LinkedInPublisher

logger = logging.getLogger(__name__)

async def publish_job_to_linkedin_background(job_id: UUID):
    async with AsyncSessionLocal() as session:
        repository = JobRepository(session)
        linkedin_publisher = LinkedInPublisher()
        
        # Fetch job
        job = await repository.get_by_id(job_id)
        if not job:
            logger.error(f"Job {job_id} not found for publishing.")
            return

        # Mark as pending
        await repository.update(job, {"publish_status": PublishStatus.pending})
        await session.commit()
        
        retries = 3
        for attempt in range(retries):
            try:
                logger.info(f"Publishing job {job_id} to LinkedIn (Attempt {attempt + 1}/{retries})")
                job_data = {
                    "id": str(job.id),
                    "title": job.title,
                    "description": job.description,
                    "location": job.location,
                    "requirements": job.requirements,
                    "job_type": job.job_type
                }
                
                # Perform publishing
                url = await linkedin_publisher.publish(job_data)
                
                # Update success
                await repository.update(job, {
                    "publish_status": PublishStatus.published,
                    "linkedin_url": url
                })
                await session.commit()
                logger.info(f"Successfully published job {job_id} to LinkedIn: {url}")
                return
                
            except Exception as e:
                logger.error(f"Attempt {attempt + 1} failed: {e}")
                if attempt < retries - 1:
                    await asyncio.sleep(5)  # Backoff before retry
                else:
                    # Update failure
                    await repository.update(job, {"publish_status": PublishStatus.failed})
                    await session.commit()
                    logger.error(f"All {retries} attempts failed for job {job_id}")
