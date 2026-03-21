from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models.job import Job
from uuid import UUID
from typing import List, Optional

class JobRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, id: UUID, owner_id: UUID) -> Optional[Job]:
        query = select(Job).where(Job.id == id, Job.owner_id == owner_id)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def get_all(self, owner_id: UUID, skip: int = 0, limit: int = 100, status: Optional[str] = None) -> List[Job]:
        query = select(Job).where(Job.owner_id == owner_id)
        if status:
            query = query.where(Job.status == status)
        query = query.offset(skip).limit(limit)
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def create(self, job_data: dict, owner_id: UUID) -> Job:
        job_data["owner_id"] = owner_id
        job = Job(**job_data)
        self.session.add(job)
        await self.session.flush()
        await self.session.refresh(job)
        return job

    async def update(self, job: Job, update_data: dict) -> Job:
        for key, value in update_data.items():
            setattr(job, key, value)
        await self.session.flush()
        await self.session.refresh(job)
        return job

    async def delete(self, job: Job) -> None:
        await self.session.delete(job)
        await self.session.flush()
