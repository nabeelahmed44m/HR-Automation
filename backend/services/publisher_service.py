import asyncio
import logging
from uuid import UUID
from sqlalchemy.future import select
from core.database import AsyncSessionLocal
from repositories.job import JobRepository
from repositories.publish import PublicationRepository
from models.job import Job
from models.user import User
from models.publish import Publication, PublishStatus, PublishDestination
from models.screening import JobScreeningQuestion
from .linkedin_publisher import LinkedInPublisher

from repositories.user import UserRepository

logger = logging.getLogger(__name__)

async def publish_job_to_linkedin_background(job_id: UUID):
    async with AsyncSessionLocal() as session:
        repository = JobRepository(session)
        pub_repository = PublicationRepository(session)
        user_repo = UserRepository(session)
        
        # Fetch job and join with User to get credentials
        query = select(Job, User).join(User, Job.owner_id == User.id).where(Job.id == job_id)
        result = await session.execute(query)
        row = result.first()
        
        if not row:
            logger.error(f"Job {job_id} or its owner not found for publishing.")
            return
            
        job, user = row
        
        # Check if the user's cookie is already flagged as expired
        if user.linkedin_cookie_expired:
            logger.warning(f"User {user.id} has an expired LinkedIn cookie. Job {job_id} cannot be published.")
            await repository.update(job, {"publish_status": PublishStatus.failed})
            await session.commit()
            return

        # Initialize publisher with user's linkedin credentials
        linkedin_publisher = LinkedInPublisher(
            cookie=user.linkedin_cookie
        )

        # 1. Create a detailed Publication task record
        publication = await pub_repository.create({
            "job_id": job_id,
            "user_id": user.id,
            "destination": job.publish_destination,
            "status": PublishStatus.pending,
            "platform": "linkedin"
        })
        
        # Also update the summary status in the Job table
        await repository.update(job, {"publish_status": PublishStatus.pending})
        await session.commit()
        
        retries = 1
        for attempt in range(retries):
            try:
                logger.info(f"Publishing job {job_id} to LinkedIn (Attempt {attempt + 1}/{retries})")
                
                # Update attempt count in task record
                if attempt > 0:
                    await pub_repository.update(publication, {"attempt_count": attempt + 1})
                    await session.commit()

                job_data = {
                    "id": str(job.id),
                    "title": job.title,
                    "description": job.description,
                    "location": job.location,
                    "requirements": job.requirements,
                    "job_type": job.job_type,
                    "image_base64": job.image_base64,
                    "tags": job.tags,
                    "apply_url": f"http://localhost:5173/apply/{job.id}"
                }
                
                # Perform publishing based on destination
                dest = job.publish_destination
                url = None
                
                if dest in [PublishDestination.feed, PublishDestination.both]:
                    logger.info(f"Publishing to Feed for job {job_id}")
                    url = await linkedin_publisher.publish(job_data)
                
                if dest in [PublishDestination.job_page, PublishDestination.both]:
                    logger.info(f"Publishing to Job Page for job {job_id} (INCOMING FEATURE - LOGGING ONLY)")
                    if not url: # If not already published to feed
                         url = f"https://www.linkedin.com/jobs/incoming/{job.id}"
                
                # Update success in Job
                await repository.update(job, {
                    "publish_status": PublishStatus.published,
                    "linkedin_url": url
                })
                
                # Update success in Publication Task
                await pub_repository.update(publication, {
                    "status": PublishStatus.published,
                    "external_url": url
                })
                
                await session.commit()
                logger.info(f"Successfully published job {job_id} to LinkedIn: {url}")
                return
                
            except Exception as e:
                err_msg = str(e)
                logger.error(f"Attempt {attempt + 1} failed: {e}")
                
                # If cookie is expired or missing, mark DB and ABORT retries!
                if "expired" in err_msg.lower() or "missing" in err_msg.lower() or "blocked" in err_msg.lower():
                    logger.error("Cookie expiration detected. Aborting retries and flagging user account.")
                    await user_repo.update(user, {"linkedin_cookie_expired": True})
                    await repository.update(job, {"publish_status": PublishStatus.failed})
                    await pub_repository.update(publication, {
                        "status": PublishStatus.failed,
                        "error_log": err_msg
                    })
                    await session.commit()
                    return

                # Final update failure in both tables
                await repository.update(job, {"publish_status": PublishStatus.failed})
                await pub_repository.update(publication, {
                    "status": PublishStatus.failed,
                    "error_log": err_msg
                })
                await session.commit()
                logger.error(f"Publish attempt failed for job {job_id}")

async def run_cron_publish_scheduler():
    """
    Simulates a cron job by polling for jobs or tasks that are stuck.
    """
    logger.info("Starting background publish scheduler (cron-like)...")
    while True:
        try:
            async with AsyncSessionLocal() as session:
                # Poll entirely orphaned jobs exactly once. 
                # (Ignore failed ones so they don't infinitely retry)
                repository = JobRepository(session)
                query = select(Job).where(
                    (Job.publish_status == None)
                )
                result = await session.execute(query)
                jobs_to_retry = result.scalars().all()
                
                for job in jobs_to_retry:
                    logger.info(f"Cron detected job {job.id} needing publication. Triggering...")
                    await publish_job_to_linkedin_background(job.id)
            
        except Exception as e:
            logger.error(f"Cron scheduler error: {str(e)}")
            
        await asyncio.sleep(60)
