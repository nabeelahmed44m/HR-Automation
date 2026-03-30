"""
VapiService — Handles outbound AI phone interviews via Vapi.AI.

Flow:
1. initiate_call()  → POST https://api.vapi.ai/call
   - Sends a dynamic assistant config built from the job + stored questions
   - Vapi handles STT  (Deepgram), LLM convo (Gemini / GPT), TTS (ElevenLabs)
   - Returns a call ID; we store it on InterviewSession.vapi_call_id

2. handle_end_of_call_report()  → called from POST /vapi/webhook
   - Receives the end-of-call report from Vapi
   - Extracts transcript, summary, recording URL
   - Persists to DB and triggers Gemini evaluation
"""

import httpx
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.interview import InterviewSession, InterviewStatus, InterviewType, InterviewRecommendation
from models.screening import JobScreeningQuestion
from models.candidate import Candidate
from models.job import Job
from services.evaluation import EvaluationService
from core.config import settings
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

VAPI_API_URL = "https://api.vapi.ai"


class VapiService:

    # ─── Initiate Outbound Call ───────────────────────────────────────────────

    async def initiate_call(
        self,
        session: InterviewSession,
        candidate: Candidate,
        job: Job,
        questions: list[JobScreeningQuestion],
        db: AsyncSession,
    ) -> str:
        """
        Places an outbound call via Vapi.AI.
        Returns the vapi call_id.
        Raises httpx.HTTPStatusError on failure.
        """
        if not settings.VAPI_API_KEY:
            raise ValueError("VAPI_API_KEY is not configured in your .env file.")

        payload = {
            "phoneNumberId": settings.VAPI_PHONE_NUMBER_ID,
            "customer": {
                "number": candidate.phone if candidate.phone.startswith("+") else f"+{candidate.phone}",
                "name": candidate.full_name,
            },
            "assistant": self.get_assistant_config(candidate, job, questions, session),
        }

        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"{VAPI_API_URL}/call",
                json=payload,
                headers={
                    "Authorization": f"Bearer {settings.VAPI_API_KEY}",
                    "Content-Type": "application/json",
                },
            )
            
            if response.status_code != 201 and response.status_code != 200:
                error_detail = response.text
                logger.error(f"Vapi API Error ({response.status_code}): {error_detail}")
                # We raise a custom exception with the detail so the router can show it
                raise ValueError(f"Vapi Error: {error_detail}")

            call_data = response.json()

        vapi_call_id = call_data.get("id")
        logger.info(f"Vapi call initiated: {vapi_call_id} for session {session.id}")

        # Persist call ID and status
        session.vapi_call_id = vapi_call_id
        session.status = InterviewStatus.CALL_INITIATED
        session.attempts = (session.attempts or 0) + 1
        await db.commit()

        return vapi_call_id

    def get_assistant_config(
        self,
        candidate: Candidate,
        job: Job,
        questions: list[JobScreeningQuestion],
        session: InterviewSession,
    ) -> dict:
        """
        Generates the assistant configuration for Vapi.
        Can be used for both outbound calls and web calls.
        """
        system_prompt = self._build_system_prompt(candidate, job, questions)
        
        # Adjust greeting for web vs phone
        if session.interview_type == "WEB":
            first_message = (
                f"Hello {candidate.full_name}! Thank you for joining this interview for the {job.title} position at {settings.COMPANY_NAME}. "
                f"I am your AI interviewer today. Are you ready to begin?"
            )
        else:
            first_message = (
                f"Hello, may I speak with {candidate.full_name}? "
                f"This is an AI calling on behalf of {settings.COMPANY_NAME} "
                f"to conduct a brief phone screening for the {job.title} position. "
                f"Is now a good time to talk?"
            )

        return {
            "name": f"HR Screener",
            "firstMessage": first_message,
            "model": {
                "model": "gpt-4o",
                "provider": "openai",
                "systemPrompt": system_prompt,
                "temperature": 0.5,
            },
            "voice": {
                "provider": "openai",
                "voiceId": "alloy",
            },
            "transcriber": {
                "provider": "deepgram",
                "language": "en-US",
            },
            "metadata": {
                "session_id": str(session.id),
                "candidate_id": str(candidate.id),
                "job_id": str(job.id),
            },
            "endCallMessage": (
                "Thank you so much for your time today. "
                "We will review your responses and be in touch soon. Have a great day!"
            ),
            "endCallPhrases": [
                "goodbye", "bye", "thank you goodbye", "that's all"
            ],
            "serverUrl": settings.VAPI_SERVER_URL,
        }

    # ─── Handle End-of-Call Webhook ──────────────────────────────────────────

    async def handle_end_of_call_report(self, payload: dict, db: AsyncSession):
        """
        Called when Vapi sends a POST to /vapi/webhook with type='end-of-call-report'.
        Extracts transcript, summary, and recording URL, persists them, then triggers
        Gemini evaluation.
        """
        call_id = payload.get("call", {}).get("id") or payload.get("callId", "")
        call_status = payload.get("call", {}).get("status", "")

        # 1. Attempt lookup by vapi_call_id
        result = await db.execute(
            select(InterviewSession).where(InterviewSession.vapi_call_id == call_id)
        )
        session = result.scalar_one_or_none()

        if not session:
            # 2. Extract metadata - Based on your logs, it's inside 'assistant' or 'call.assistant'
            metadata = (
                payload.get("assistant", {}).get("metadata", {}) or
                payload.get("call", {}).get("assistant", {}).get("metadata", {}) or
                payload.get("call", {}).get("metadata", {}) or
                payload.get("metadata", {}) or
                {}
            )
            
            # If still empty, try to look for flattened metadata keys
            session_id = metadata.get("session_id") or payload.get("session_id")
            candidate_id = metadata.get("candidate_id") or payload.get("candidate_id")
            job_id = metadata.get("job_id") or payload.get("job_id")
            
            logger.info(f"Looking up session for call_id={call_id}. Extracted IDs: session={session_id}, candidate={candidate_id}")

            if session_id:
                try:
                    res = await db.execute(select(InterviewSession).where(InterviewSession.id == session_id))
                    session = res.scalar_one_or_none()
                    if session: logger.info(f"Found session by session_id in metadata: {session_id}")
                except Exception as e:
                    logger.warning(f"Error querying session_id {session_id}: {e}")

            if not session and candidate_id and job_id:
                logger.info(f"Fallback lookup by candidate_id={candidate_id}")
                result = await db.execute(
                    select(InterviewSession)
                    .where(
                        InterviewSession.candidate_id == candidate_id,
                        InterviewSession.job_id == job_id
                    )
                    .order_by(InterviewSession.created_at.desc())
                )
                session = result.scalar_one_or_none()
                if session: logger.info(f"Found session by candidate fallback: {session.id}")

        if not session:
            logger.warning(f"No session found for call_id={call_id}. Payload keys: {list(payload.keys())}")

            return

        # Parse transcript and analysis - CONFIRMED: 'messages' is the list, 'transcript' is the string
        transcript_string = payload.get("transcript", "")
        message_items = payload.get("messages", []) or payload.get("artifact", {}).get("messages", [])
        
        analysis = payload.get("analysis", {})
        summary = analysis.get("summary", "") or payload.get("summary", "")
        success_evaluation = analysis.get("successEvaluation")
        recording_url = payload.get("recordingUrl", "")
        ended_reason = payload.get("endedReason", "")
        
        # Determine status
        if success_evaluation is True or success_evaluation == "true":
            new_status = InterviewStatus.INTERVIEW_COMPLETED
        elif ended_reason in ("customer-ended-call", "assistant-ended-call", "silence-timed-out"):
            new_status = InterviewStatus.INTERVIEW_COMPLETED if message_items else InterviewStatus.NO_RESPONSE
        else:
            new_status = InterviewStatus.INTERVIEW_COMPLETED if message_items else InterviewStatus.NO_RESPONSE

        # Update Session
        session.status = new_status
        session.transcript = message_items # Store the structured objects in JSONB
        session.summary = summary
        session.recording_url = recording_url
        session.completed_at = datetime.now(timezone.utc)

        await db.commit()
        logger.info(f"Session {session.id} updated: status={new_status}")

        # Trigger evaluation if interview completed OR if we have messages to analyze
        if message_items:
            try:
                # 3. Always use Gemini for Evaluation (ignore Vapi structuredData if any)
                eval_service = EvaluationService()
                evaluation_data = await eval_service.evaluate_from_transcript(message_items, summary)
                session.ai_evaluation = evaluation_data
                
                # Update status based on Gemini's assessment
                gemini_status = evaluation_data.get("interview_status", "COMPLETE")
                if gemini_status == "INCOMPLETE":
                    session.status = InterviewStatus.SCREENING_FAILED
                    logger.info(f"Gemini marked interview {session.id} as INCOMPLETE.")
                else:
                    session.status = InterviewStatus.INTERVIEW_COMPLETED

                # --- AUTO-SHORTLIST LOGIC ---
                # Only proceed if the interview was actually COMPLETED
                if gemini_status == "COMPLETE":
                    # 1. Fetch Job and Candidate
                    job_result = await db.execute(select(Job).where(Job.id == session.job_id))
                    job = job_result.scalar_one_or_none()
                    candidate_result = await db.execute(select(Candidate).where(Candidate.id == session.candidate_id))
                    candidate = candidate_result.scalar_one_or_none()
    
                    if job and candidate:
                        # Calculate overall score out of 100 based on the 3 metrics (1-10 each)
                        comm = int(evaluation_data.get("communication", 5))
                        tech = int(evaluation_data.get("technical_clarity", 5))
                        conf = int(evaluation_data.get("confidence", 5))
                        
                        avg_score = ((comm + tech + conf) / 30.0) * 100.0
                        recommendation = evaluation_data.get("recommendation", "Maybe")
    
                        # Threshold logic
                        # Fallback to defaults if threshold is 0 or null
                        s_threshold = job.shortlist_threshold or 70
                        r_threshold = job.review_threshold or 50
    
                        # If average score is >= shortlisted threshold, set as shortlisted
                        # If >= review threshold, set as review
                        if avg_score >= s_threshold or recommendation == "Proceed":
                            candidate.status = "shortlisted"
                            session.recommendation = InterviewRecommendation.RECOMMENDED
                            logger.info(f"Candidate {candidate.id} AUTO-SHORTLISTED (Score: {avg_score:.1f}%)")
                        elif avg_score >= r_threshold:
                            candidate.status = "review"
                            session.recommendation = InterviewRecommendation.MAYBE
                            logger.info(f"Candidate {candidate.id} marked for manual REVIEW (Score: {avg_score:.1f}%)")
                        else: # avg_score < r_threshold or recommendation == "Reject"
                            candidate.status = "rejected"
                            session.recommendation = InterviewRecommendation.NOT_RECOMMENDED
                            logger.info(f"Candidate {candidate.id} AUTO-REJECTED (Score: {avg_score:.1f}%)")
                else:
                    logger.info(f"Skipping candidate status update for session {session.id} because interview was INCOMPLETE.")

                await db.commit()
                logger.info(f"Evaluation and status update saved for session {session.id}")
            except Exception as e:
                logger.error(f"Evaluation failed for session {session.id}: {e}")

    # ─── Helpers ────────────────────────────────────────────────────────────

    def _build_system_prompt(
        self,
        candidate: Candidate,
        job: Job,
        questions: list[JobScreeningQuestion],
    ) -> str:
        questions_block = "\n".join(
            [f"{i+1}. {q.question_text}" for i, q in enumerate(questions)]
        )
        
        linkedin = candidate.linkedin_profile or "Not provided"
        salary = getattr(job, "salary_range", None) or "competitive, based on experience"
        remote = getattr(job, "remote_type", None) or "to be discussed"

        return f"""You are a professional HR screener for {settings.COMPANY_NAME} conducting a phone screening interview.

== JOB DETAILS ==
Position: {job.title}
Description: {job.description or "Not specified"}
Requirements: {job.requirements or "Not specified"}
Salary: {salary}
Remote Policy: {remote}

== CANDIDATE ==
Name: {candidate.full_name}
Profile: {linkedin}

== YOUR INSTRUCTIONS ==
1. You MUST ask ONLY the following {len(questions)} questions, IN ORDER. Do NOT invent new questions.
2. After each answer, acknowledge briefly (e.g. "Great, thank you!") and move to the next question.
3. If the candidate asks about salary, benefits, remote work, or the role — answer using the Job Details above, then continue the interview.
4. Be friendly, professional, and concise.
5. After the last question, thank the candidate and end the call politely.

== INTERVIEW QUESTIONS ==
{questions_block}

Begin the interview immediately after the candidate confirms they are ready. Once they say "yes" or anything similar, jump straight to the first question. If you ever feel like the user has finished talking, respond immediately. Good luck!"""
