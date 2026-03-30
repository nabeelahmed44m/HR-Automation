from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from core.config import settings

engine = create_async_engine(
    settings.DATABASE_URL, 
    echo=True,
    # SSL is mandatory for NeonDB/Supabase poolers when using asyncpg
    connect_args={"ssl": True},
    # Prevent pool exhaustion and ensure connections are recycled
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    pool_recycle=300
)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
