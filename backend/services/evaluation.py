import logging
import json
from core.config import settings

logger = logging.getLogger(__name__)


class EvaluationService:
    """Sends interview transcript to Gemini Flash for structured scoring."""

    def __init__(self):
        self.model_name = "gemini-flash-latest"

    async def evaluate_interview(
        self,
        candidate_name: str,
        job_title: str,
        qa_pairs: list[dict],  # [{"question": "...", "answer": "..."}]
    ) -> dict:
        """Evaluate interview transcript and return structured scores."""
        try:
            import google.generativeai as genai

            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel(self.model_name)

            # Build transcript
            transcript_lines = []
            for i, pair in enumerate(qa_pairs, 1):
                transcript_lines.append(f"Q{i}: {pair.get('question', 'N/A')}")
                transcript_lines.append(f"A{i}: {pair.get('answer', '[No answer given]')}")
            transcript = "\n".join(transcript_lines)

            prompt = f"""You are an expert HR evaluator. Evaluate the following phone screen interview for a {job_title} position.

Candidate: {candidate_name}

Interview Transcript:
{transcript}

Evaluate the candidate on the following criteria and return ONLY valid JSON with this exact structure:
{{
  "communication": <integer 1-10>,
  "technical_clarity": <integer 1-10>,
  "confidence": <integer 1-10>,
  "recommendation": "<Proceed|Maybe|Reject>",
  "summary": "<2-3 sentence brief summary of the candidate performance>"
}}

Scoring guide:
- communication: Clarity, articulation, listening.
- technical_clarity: Depth of technical knowledge and ability to explain concepts.
- confidence: Assertiveness and self-assurance in responses.
- recommendation: Proceed (strong candidate), Maybe (needs further review), Reject (not suitable).

Return ONLY the JSON object, no markdown, no explanation."""

            response = await model.generate_content_async(prompt)
            raw = response.text.strip()

            # Strip markdown code fences if present
            raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()

            data = json.loads(raw)
            logger.info(f"Evaluation complete for {candidate_name}: {data.get('recommendation')}")
            return data

        except Exception as e:
            logger.error(f"Evaluation failed: {e}")
            return {
                "communication": 5,
                "technical_clarity": 5,
                "confidence": 5,
                "recommendation": "Maybe",
                "summary": "Automated evaluation could not be completed. Please review the transcript manually.",
            }

    async def evaluate_from_transcript(
        self,
        transcript: list[dict],  # Vapi format: [{role: "bot"|"user", message: "..."}]
        summary: str = "",
    ) -> dict:
        """Evaluate from Vapi's native transcript format [{role, message}]."""
        lines = []
        for item in transcript:
            role = item.get("role", "unknown")
            message = item.get("message", "").strip()
            # Ignore system messages/instructions
            if role == "system":
                continue
            if message:
                label = "Interviewer" if role in ("bot", "assistant") else "Candidate"
                lines.append(f"{label}: {message}")
        transcript_text = "\n".join(lines)

        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel(self.model_name)

            summary_block = f"\nCall Summary: {summary}" if summary else ""

            prompt = f"""You are an expert HR evaluator reviewing a phone screening interview transcript.
{summary_block}

Full Transcript:
{transcript_text}

Analyze the candidate's responses carefully.
1. Determine if the candidate actually completed the interview (answered the questions).
2. If the candidate said they are busy, asked to be called later, or if the conversation didn't really start, mark 'interview_status' as 'INCOMPLETE'.
3. Otherwise, if they participated in the screening, mark it as 'COMPLETE'.

Evaluate the CANDIDATE on the following criteria and return ONLY valid JSON:
{{
  "communication": <integer 1-10>,
  "technical_clarity": <integer 1-10>,
  "confidence": <integer 1-10>,
  "recommendation": "<Proceed|Maybe|Reject>",
  "interview_status": "<COMPLETE|INCOMPLETE>",
  "summary": "<2-3 sentence brief summary of the candidate performance and why the status is what it is>"
}}

Return ONLY the JSON object, no markdown, no explanation."""

            response = await model.generate_content_async(prompt)
            raw = response.text.strip()
            raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
            data = json.loads(raw)
            logger.info(f"Vapi transcript evaluation complete: {data.get('recommendation')}")
            return data

        except Exception as e:
            logger.error(f"Vapi transcript evaluation failed: {e}")
            return {
                "communication": 5,
                "technical_clarity": 5,
                "confidence": 5,
                "recommendation": "Maybe",
                "summary": "Automated evaluation could not be completed. Please review the transcript manually.",
            }
