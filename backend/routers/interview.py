"""
Interview Router — Vapi.AI Integration

Endpoints:
  POST /jobs/{job_id}/candidates/{candidate_id}/call  — Initiate Vapi screening call
  GET  /jobs/{job_id}/candidates/{candidate_id}/interview — Get session + evaluation
  GET  /jobs/{job_id}/interviews                        — List all sessions for a job
  POST /vapi/webhook                                   — Receive Vapi end-of-call report
"""

import logging
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.database import get_db
from core.config import settings
from models.interview import InterviewSession, InterviewStatus, InterviewType
from models.screening import JobScreeningQuestion
from models.candidate import Candidate
from models.job import Job
from models.user import User
from core.security import get_current_user
from services.vapi import VapiService
from services.email import EmailService
from schemas.interview import InterviewSessionResponse, InitiateCallRequest

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Interview"])
vapi_service = VapiService()


# ─── Initiate Vapi Outbound Call ─────────────────────────────────────────────

@router.post("/jobs/{job_id}/candidates/{candidate_id}/call")
async def initiate_screening_call(
    job_id: UUID,
    candidate_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Trigger an outbound AI phone interview for a candidate via Vapi.AI."""

    # Load job and verify ownership
    job_result = await db.execute(select(Job).where(Job.id == job_id, Job.owner_id == current_user.id))
    job = job_result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=403, detail="Not authorized to access this job")
    candidate_result = await db.execute(
        select(Candidate).where(Candidate.id == candidate_id)
    )
    candidate = candidate_result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    if not candidate.phone:
        raise HTTPException(status_code=400, detail="Candidate has no phone number on file")

    # Load job
    job_result = await db.execute(select(Job).where(Job.id == job_id))
    job = job_result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Load screening questions
    questions_result = await db.execute(
        select(JobScreeningQuestion)
        .where(JobScreeningQuestion.job_id == job_id)
        .order_by(JobScreeningQuestion.question_order)
    )
    questions = questions_result.scalars().all()
    if not questions:
        raise HTTPException(
            status_code=400,
            detail="No screening questions found for this job. Please generate questions first."
        )

    # Find or create session
    session_result = await db.execute(
        select(InterviewSession).where(
            InterviewSession.candidate_id == candidate_id,
            InterviewSession.job_id == job_id,
        )
    )
    session = session_result.scalar_one_or_none()
    if not session:
        session = InterviewSession(
            candidate_id=candidate_id,
            job_id=job_id,
            status=InterviewStatus.PENDING,
        )
        db.add(session)
        await db.flush()

    try:
        vapi_call_id = await vapi_service.initiate_call(session, candidate, job, questions, db)
        return {
            "message": "Screening call initiated successfully via Vapi.AI",
            "vapi_call_id": vapi_call_id,
            "session_id": str(session.id),
            "status": session.status,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Vapi call initiation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to initiate call: {str(e)}")


# ─── Send Interview Link via Email ──────────────────────────────────────────

@router.post("/jobs/{job_id}/candidates/{candidate_id}/send-interview-link")
async def send_interview_link(
    request: Request,
    job_id: UUID,
    candidate_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a web interview link and email it to the candidate."""
    
    # Load job and verify ownership
    job_result = await db.execute(select(Job).where(Job.id == job_id, Job.owner_id == current_user.id))
    job = job_result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=403, detail="Not authorized to access this job")

    candidate_result = await db.execute(
        select(Candidate).where(Candidate.id == candidate_id)
    )
    candidate = candidate_result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    if not candidate.email:
        raise HTTPException(status_code=400, detail="Candidate has no email on file")

    # Load screening questions (ensure they exist)
    questions_result = await db.execute(
        select(JobScreeningQuestion).where(JobScreeningQuestion.job_id == job_id)
    )
    if not questions_result.scalars().first():
        raise HTTPException(status_code=400, detail="No screening questions found for this job.")

    # Find or create session
    session_result = await db.execute(
        select(InterviewSession).where(
            InterviewSession.candidate_id == candidate_id,
            InterviewSession.job_id == job_id,
        )
    )
    session = session_result.scalar_one_or_none()
    if not session:
        session = InterviewSession(
            candidate_id=candidate_id,
            job_id=job_id,
            status=InterviewStatus.PENDING,
            interview_type=InterviewType.WEB,
        )
        db.add(session)
        await db.flush()
    else:
        # Update existing session to WEB if it was PHONE or just ensure it is WEB
        session.interview_type = InterviewType.WEB
        await db.flush()

    # Generate link (pointing to frontend /interview/{session_id})
    origin = request.headers.get("origin") or "http://localhost:5173"
    interview_link = f"{origin}/interview/{session.id}"

    # Send email
    email_service = EmailService()
    await email_service.send_interview_link(
        candidate_email=candidate.email,
        candidate_name=candidate.full_name,
        job_title=job.title,
        interview_link=interview_link
    )

    await db.commit()
    return {"message": "Interview link sent successfully to candidate email", "link": interview_link}


# ─── Get Interview Config for Frontend ───────────────────────────────────────

@router.get("/interview/{session_id}/config")
async def get_interview_config(
    session_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve Vapi assistant configuration for a specific web interview session."""
    
    result = await db.execute(
        select(InterviewSession).where(InterviewSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    if session.status == InterviewStatus.INTERVIEW_COMPLETED:
        raise HTTPException(status_code=400, detail="Interview has already been completed.")
      

    # Load job, candidate, and questions
    candidate_result = await db.execute(select(Candidate).where(Candidate.id == session.candidate_id))
    job_result = await db.execute(select(Job).where(Job.id == session.job_id))
    questions_result = await db.execute(
        select(JobScreeningQuestion)
        .where(JobScreeningQuestion.job_id == session.job_id)
        .order_by(JobScreeningQuestion.question_order)
    )
    
    candidate = candidate_result.scalar_one_or_none()
    job = job_result.scalar_one_or_none()
    questions = questions_result.scalars().all()

    if not candidate or not job or not questions:
        raise HTTPException(status_code=500, detail="Incomplete interview session data")

    # Get config
    config = vapi_service.get_assistant_config(candidate, job, questions, session)
    
    return {
        "session_id": str(session.id),
        "candidate_id": str(candidate.id),
        "job_id": str(job.id),
        "candidate_name": candidate.full_name,
        "job_title": job.title,
        "vapi_config": config,
        "vapi_public_key": settings.VAPI_PUBLIC_KEY or settings.VAPI_API_KEY
    }

@router.post("/interview/{session_id}/start-call")
async def start_web_interview(
    session_id: UUID,
    payload: dict,
    db: AsyncSession = Depends(get_db),
):
    """Link a Vapi call ID to an existing session (called by frontend)."""
    result = await db.execute(select(InterviewSession).where(InterviewSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    vapi_call_id = payload.get("vapi_call_id")
    if vapi_call_id:
        session.vapi_call_id = vapi_call_id
        session.status = InterviewStatus.CALL_INITIATED
        await db.commit()
        return {"status": "linked"}
    return {"status": "ignored"}

@router.get("/jobs/{job_id}/candidates/{candidate_id}/interview")
async def get_interview_session(
    job_id: UUID,
    candidate_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get interview session details including transcript and AI evaluation."""
    # Verify job ownership
    job_result = await db.execute(select(Job).where(Job.id == job_id, Job.owner_id == current_user.id))
    if not job_result.scalars().first():
        raise HTTPException(status_code=403, detail="Not authorized to access this interview data")

    result = await db.execute(
        select(InterviewSession).where(
            InterviewSession.candidate_id == candidate_id,
            InterviewSession.job_id == job_id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        return None

    return {
        "id": str(session.id),
        "status": session.status,
        "vapi_call_id": session.vapi_call_id,
        "attempts": session.attempts,
        "transcript": session.transcript or [],
        "summary": session.summary,
        "recording_url": session.recording_url,
        "ai_evaluation": session.ai_evaluation,
        "completed_at": session.completed_at,
        "created_at": session.created_at,
    }


# ─── List All Sessions for a Job ─────────────────────────────────────────────

@router.get("/jobs/{job_id}/interviews")
async def list_job_interviews(
    job_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all interview sessions for a job."""
    # Verify job ownership
    job_result = await db.execute(select(Job).where(Job.id == job_id, Job.owner_id == current_user.id))
    if not job_result.scalars().first():
        raise HTTPException(status_code=403, detail="Not authorized to access this job's interviews")

    result = await db.execute(
        select(InterviewSession)
        .where(InterviewSession.job_id == job_id)
        .order_by(InterviewSession.created_at.desc())
    )
    sessions = result.scalars().all()
    return [
        {
            "id": str(s.id),
            "candidate_id": str(s.candidate_id),
            "status": s.status,
            "vapi_call_id": s.vapi_call_id,
            "attempts": s.attempts,
            "ai_evaluation": s.ai_evaluation,
            "completed_at": s.completed_at,
            "created_at": s.created_at,
        }
        for s in sessions
    ]


# ─── Vapi Webhook ────────────────────────────────────────────────────────────

@router.post("/vapi/webhook")
async def vapi_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Receives POST events from Vapi.AI.
    We handle:  end-of-call-report  — transcript, summary, evaluation
    All other event types are acknowledged and ignored.
    """
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    message_type = payload.get("message", {}).get("type") or payload.get("type", "")
    logger.info(f"Vapi webhook received: type={message_type}")

    if message_type == "end-of-call-report":
        # Vapi wraps the report in a "message" envelope sometimes
        report = payload.get("message") if "message" in payload else payload
        await vapi_service.handle_end_of_call_report(report, db)
        return {"status": "processed"}

    # For status-update, hang, speech events etc — just acknowledge
    return {"status": "received"}
