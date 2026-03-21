
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.job import router as job_router
from routers.auth import router as auth_router
import logging
import asyncio
from contextlib import asynccontextmanager
from services.publisher_service import run_cron_publish_scheduler

logging.basicConfig(level=logging.INFO)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start the "cron" scheduler in the background
    asyncio.create_task(run_cron_publish_scheduler())
    yield

app = FastAPI(title="Job Management API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production, e.g., ["http://localhost:5173"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(job_router)

@app.get("/health")
def health_check():
    return {"status": "ok"}
