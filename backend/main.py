from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.job import router as job_router
import logging

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Job Management API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production, e.g., ["http://localhost:5173"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(job_router)

@app.get("/health")
def health_check():
    return {"status": "ok"}
