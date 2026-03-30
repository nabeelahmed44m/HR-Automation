from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional, List
from models.screening import QuestionSource


class ScreeningQuestionBase(BaseModel):
    question_text: str
    question_order: int = 0
    question_source: QuestionSource = QuestionSource.AI
    is_required: bool = True


class ScreeningQuestionCreate(ScreeningQuestionBase):
    pass


class ScreeningQuestionUpdate(BaseModel):
    question_text: Optional[str] = None
    question_order: Optional[int] = None
    is_required: Optional[bool] = None


class ScreeningQuestionResponse(ScreeningQuestionBase):
    id: UUID
    job_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GenerateQuestionsRequest(BaseModel):
    title: str
    description: str
    requirements: str
    experience_level: str
    salary_range: Optional[str] = None


class GenerateQuestionsResponse(BaseModel):
    questions: List[str]


class SaveQuestionsRequest(BaseModel):
    questions: List[ScreeningQuestionCreate]
