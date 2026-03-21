import asyncio
from sqlalchemy import text
from core.database import engine

async def check_users():
    async with engine.begin() as conn:
        print("Checking user records...")
        result = await conn.execute(text("SELECT email, linkedin_email, linkedin_password, linkedin_cookie FROM users"))
        users = result.all()
        for user in users:
            print(f"User: {user[0]}")
            print(f"  LinkedIn Email: {user[1]}")
            # Show if password is set but not the value
            print(f"  LinkedIn Pass set: {'Yes' if user[2] else 'No'}")
            print(f"  LinkedIn Cookie set: {'Yes' if user[3] else 'No'}")

if __name__ == "__main__":
    asyncio.run(check_users())
