import asyncio
from sqlalchemy.future import select
from core.database import AsyncSessionLocal
from models.job import Job
from schemas.job import JobResponse

async def main():
    async with AsyncSessionLocal() as session:
        try:
            query = select(Job).limit(5)
            result = await session.execute(query)
            jobs = result.scalars().all()
            print(f"Found {len(jobs)} jobs in DB.")
            
            # test Pydantic serialization
            for j in jobs:
                dto = JobResponse.model_validate(j)
                print(f"Serialized Job: {dto.id}")
            print("Successfully passed all validation!")
        except Exception as e:
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
