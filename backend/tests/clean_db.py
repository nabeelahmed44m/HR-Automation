import asyncio
from sqlalchemy import text
from core.database import engine

async def clean_database():
    async with engine.begin() as conn:
        print("Cleaning jobs and publications tables...")
        await conn.execute(text("DELETE FROM publications"))
        await conn.execute(text("DELETE FROM jobs"))
        print("Done.")

if __name__ == "__main__":
    asyncio.run(clean_database())
