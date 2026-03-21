import asyncio
from core.database import engine
from sqlalchemy import inspect

async def check_tables():
    def get_tables(connection):
        inspector = inspect(connection)
        return inspector.get_table_names()

    async with engine.connect() as conn:
        tables = await conn.run_sync(get_tables)
        print(f"Tables in Database: {tables}")

if __name__ == "__main__":
    asyncio.run(check_tables())
