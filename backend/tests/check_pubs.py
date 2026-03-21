import asyncio
from sqlalchemy import text
from core.database import engine

async def check_publications():
    async with engine.begin() as conn:
        print("Checking publication tasks...")
        result = await conn.execute(text("SELECT id, job_id, status, error_log, attempt_count, platform FROM publications ORDER BY created_at DESC LIMIT 5"))
        pubs = result.all()
        for pub in pubs:
            print(f"Pub ID: {pub[0]}")
            print(f"  Job ID: {pub[1]}")
            print(f"  Status: {pub[2]}")
            print(f"  Attempt: {pub[4]}")
            print(f"  Error: {pub[3]}")
            print("-" * 20)

if __name__ == "__main__":
    asyncio.run(check_publications())
