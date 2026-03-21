import asyncio
from sqlalchemy import text
from core.database import engine
from uuid import UUID

async def get_job():
    job_id = UUID("0aacf50d-c3ec-4587-9b0e-997c285950eb")
    async with engine.begin() as conn:
        print(f"Fetching job {job_id} details...")
        result = await conn.execute(text("SELECT id, title, description, image_base64, tags FROM jobs WHERE id = :id"), {"id": job_id})
        job = result.first()
        if job:
            print(f"ID: {job[0]}")
            print(f"Title: {job[1]}")
            print(f"Description: {job[2][:100]}...")
            print(f"Image base64: {job[3][:50]}..." if job[3] else "No image")
            print(f"Tags: {job[4]}")
        else:
            print("Job not found.")

if __name__ == "__main__":
    asyncio.run(get_job())
