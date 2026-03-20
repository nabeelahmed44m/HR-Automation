import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from core.config import settings
from sqlalchemy import text

async def main():
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'jobs';"))
        columns = [row for row in result]
        print("Columns in jobs table:")
        for col in columns:
            print(f"- {col[0]} ({col[1]})")

if __name__ == "__main__":
    asyncio.run(main())
