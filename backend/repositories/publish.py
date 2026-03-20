from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models.publish import Publication, PublishStatus
from uuid import UUID
from typing import List, Optional

class PublicationRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, data: dict) -> Publication:
        publication = Publication(**data)
        self.session.add(publication)
        await self.session.flush()
        await self.session.refresh(publication)
        return publication

    async def update(self, publication: Publication, data: dict) -> Publication:
        for key, value in data.items():
            setattr(publication, key, value)
        await self.session.flush()
        await self.session.refresh(publication)
        return publication

    async def get_by_job_id(self, job_id: UUID) -> List[Publication]:
        query = select(Publication).where(Publication.job_id == job_id)
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_failed_publications(self) -> List[Publication]:
        query = select(Publication).where(Publication.status == PublishStatus.failed)
        result = await self.session.execute(query)
        return list(result.scalars().all())
    
    async def get_stuck_publications(self) -> List[Publication]:
        # Jobs that were sent to publish but aren't yet successful
        query = select(Publication).where(Publication.status == PublishStatus.pending)
        result = await self.session.execute(query)
        return list(result.scalars().all())
