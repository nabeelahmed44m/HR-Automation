import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from core.config import settings

logger = logging.getLogger(__name__)

class EmailService:
    async def send_interview_link(self, candidate_email: str, candidate_name: str, job_title: str, interview_link: str):
        """
        Sends an email to the candidate with the interview link using SMTP.
        """
        subject = f"Interview Invitation: {job_title} at {settings.COMPANY_NAME}"
        
        body = f"""
        Hello {candidate_name},

        We are excited about your application for the {job_title} position at {settings.COMPANY_NAME}.
        
        We would like to invite you to a preliminary AI-led screening interview. You can join the interview by clicking the link below:

        {interview_link}

        This interview will be conducted by our AI screener and will take approximately 10-15 minutes.
        Please ensure you are in a quiet environment with a good internet connection and working microphone.

        Best regards,
        The {settings.COMPANY_NAME} Team
        """

        # Send real email using SMTP
        try:
            if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
                logger.warning("SMTP credentials not configured. Logging email instead.")
                logger.info(f"--- EMAIL LOG (MOCK) ---")
                logger.info(f"To: {candidate_email}")
                logger.info(f"Link: {interview_link}")
                return True

            msg = MIMEMultipart()
            msg['From'] = settings.SMTP_USER
            msg['To'] = candidate_email
            msg['Subject'] = subject

            msg.attach(MIMEText(body, 'plain'))

            server = smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT)
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
            server.quit()
            
            logger.info(f"Successfully sent interview link to {candidate_email} via SMTP")
            return True
        except Exception as e:
            logger.error(f"Failed to send email to {candidate_email}: {e}")
            # Fallback to logging the content for debug purposes
            logger.info(f"--- FAILED EMAIL CONTENT (Check credentials) ---")
            logger.info(f"Link: {interview_link}")
            return False
