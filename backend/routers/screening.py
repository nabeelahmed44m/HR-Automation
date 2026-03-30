from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, delete
from core.database import get_db
from core.security import get_current_user
from models.user import User
from models.screening import JobScreeningQuestion, QuestionSource
from models.job import Job
from schemas.screening import (
    ScreeningQuestionResponse,
    ScreeningQuestionCreate,
    ScreeningQuestionUpdate,
    GenerateQuestionsRequest,
    GenerateQuestionsResponse,
    SaveQuestionsRequest,
)
from services.screening import ScreeningService
from typing import List
from uuid import UUID

router = APIRouter(prefix="/jobs", tags=["AI Screening"])


@router.post("/screening/generate", response_model=GenerateQuestionsResponse)
async def generate_screening_questions_pre(
    payload: GenerateQuestionsRequest,
    current_user: User = Depends(get_current_user),
):
    """Generate AI screening questions without identifying a job_id yet (useful for creation flow)."""
    service = ScreeningService()
    questions = await service.generate_questions(
        title=payload.title,
        description=payload.description,
        requirements=payload.requirements,
        experience_level=payload.experience_level,
        salary_range=payload.salary_range,
    )
    return GenerateQuestionsResponse(questions=questions)


async def _verify_job_owner(job_id: UUID, db: AsyncSession, current_user: User) -> Job:
    result = await db.execute(
        select(Job).where(and_(Job.id == job_id, Job.owner_id == current_user.id))
    )
    job = result.scalars().first()
    if not job:
        raise HTTPException(status_code=403, detail="Job not found or not authorized")
    return job


@router.post("/{job_id}/screening/generate", response_model=GenerateQuestionsResponse)
async def generate_screening_questions(
    job_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate AI screening questions for a job using Gemini Flash."""
    job = await _verify_job_owner(job_id, db, current_user)
    service = ScreeningService()
    questions = await service.generate_questions(
        title=job.title,
        description=job.description,
        requirements=job.requirements,
        experience_level=job.experience_level,
        salary_range=job.salary_range,
    )
    return GenerateQuestionsResponse(questions=questions)


@router.post("/{job_id}/screening/questions", response_model=List[ScreeningQuestionResponse], status_code=status.HTTP_201_CREATED)
async def save_screening_questions(
    job_id: UUID,
    payload: SaveQuestionsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Replace all screening questions for a job (full replace)."""
    await _verify_job_owner(job_id, db, current_user)

    # Delete existing questions
    await db.execute(
        delete(JobScreeningQuestion).where(JobScreeningQuestion.job_id == job_id)
    )

    # Bulk insert new questions
    new_questions = []
    for i, q in enumerate(payload.questions):
        question = JobScreeningQuestion(
            job_id=job_id,
            question_text=q.question_text,
            question_order=q.question_order if q.question_order else i,
            question_source=q.question_source,
            is_required=q.is_required,
        )
        db.add(question)
        new_questions.append(question)

    await db.commit()
    for q in new_questions:
        await db.refresh(q)

    return new_questions


@router.get("/{job_id}/screening/questions", response_model=List[ScreeningQuestionResponse])
async def get_screening_questions(
    job_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch all screening questions for a job in order."""
    await _verify_job_owner(job_id, db, current_user)
    result = await db.execute(
        select(JobScreeningQuestion)
        .where(JobScreeningQuestion.job_id == job_id)
        .order_by(JobScreeningQuestion.question_order)
    )
    return list(result.scalars().all())


@router.put("/{job_id}/screening/questions/{question_id}", response_model=ScreeningQuestionResponse)
async def update_screening_question(
    job_id: UUID,
    question_id: UUID,
    payload: ScreeningQuestionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a single screening question."""
    await _verify_job_owner(job_id, db, current_user)
    result = await db.execute(
        select(JobScreeningQuestion).where(
            and_(JobScreeningQuestion.id == question_id, JobScreeningQuestion.job_id == job_id)
        )
    )
    question = result.scalars().first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    if payload.question_text is not None:
        question.question_text = payload.question_text
    if payload.question_order is not None:
        question.question_order = payload.question_order
    if payload.is_required is not None:
        question.is_required = payload.is_required

    await db.commit()
    await db.refresh(question)
    return question


@router.delete("/{job_id}/screening/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_screening_question(
    job_id: UUID,
    question_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a single screening question."""
    await _verify_job_owner(job_id, db, current_user)
    result = await db.execute(
        select(JobScreeningQuestion).where(
            and_(JobScreeningQuestion.id == question_id, JobScreeningQuestion.job_id == job_id)
        )
    )
    question = result.scalars().first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    await db.delete(question)
    await db.commit()
