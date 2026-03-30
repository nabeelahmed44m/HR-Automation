
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.job import router as job_router
from routers.auth import router as auth_router
from routers.candidate import router as candidate_router
from routers.screening import router as screening_router
from routers.interview import router as interview_router
import logging
import asyncio
from contextlib import asynccontextmanager
from services.publisher_service import run_cron_publish_scheduler
# Import models so Alembic autogenerate can detect them
import models.screening  # noqa: F401
import models.interview  # noqa: F401

logging.basicConfig(level=logging.INFO)

@asynccontextmanager
async def lifespan(app: FastAPI):
    asyncio.create_task(run_cron_publish_scheduler())
    yield

app = FastAPI(title="Job Management API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(job_router)
app.include_router(candidate_router)
app.include_router(screening_router)
app.include_router(interview_router)

@app.get("/health")
def health_check():
    return {"status": "ok"}
