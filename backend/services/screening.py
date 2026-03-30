import logging
import json
import re
from core.config import settings

logger = logging.getLogger(__name__)


class ScreeningService:
    """Uses Gemini Flash to generate screening interview questions from job data."""

    def __init__(self):
        self.model_name = "gemini-flash-latest"

    async def generate_questions(
        self,
        title: str,
        description: str,
        requirements: str,
        experience_level: str,
        salary_range: str = None,
        num_questions: int = 5,
    ) -> list[str]:
        """Generate interview questions using Gemini Flash."""
        try:
            import google.generativeai as genai

            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel(self.model_name)

            prompt = f"""You are an experienced HR recruiter creating a structured phone screening interview.

Job Details:
- Title: {title}
- Experience Level: {experience_level}
- Salary Range: {salary_range or 'Not specified'}
- Description: {description}
- Requirements: {requirements}

Generate exactly {num_questions} screening interview questions for this role.

Rules:
1. Questions must be open-ended and role-specific.
2. Focus on: actual experience, technical depth, problem-solving, past achievements.
3. Do NOT ask yes/no questions.
4. Do NOT ask generic questions like "tell me about yourself".
5. Questions should be conversational and natural for a phone call.
6. Each question on its own line, numbered 1 to {num_questions}.

Return ONLY the numbered list of questions, nothing else."""

            response = await model.generate_content_async(prompt)
            raw_text = response.text.strip()

            # Parse numbered lines
            questions = []
            for line in raw_text.split("\n"):
                line = line.strip()
                if not line:
                    continue
                # Remove leading numbers like "1." "1)" "1:"
                cleaned = re.sub(r"^\d+[\.\)\:]\s*", "", line).strip()
                if cleaned:
                    questions.append(cleaned)

            # Ensure exactly num_questions returned
            questions = questions[:num_questions]

            if not questions:
                raise ValueError("Gemini returned empty questions")

            logger.info(f"Generated {len(questions)} screening questions for '{title}'")
            return questions

        except Exception as e:
            logger.error(f"Gemini question generation failed: {e}")
            # Return sensible fallback questions
            return [
                f"Walk me through your most relevant experience for this {title} role.",
                "Describe a challenging project you worked on recently and what your contribution was.",
                "How do you stay up to date with the latest developments in your field?",
                "Tell me about a time you had to meet a tight deadline. How did you handle it?",
                "What made you interested in applying for this position?",
            ][:num_questions]
