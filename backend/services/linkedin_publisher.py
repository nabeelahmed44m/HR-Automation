import os
import asyncio
import logging
from playwright.async_api import async_playwright

logger = logging.getLogger(__name__)

class LinkedInPublisher:
    def __init__(self):
        from core.config import settings
        self.email = settings.LINKEDIN_EMAIL
        self.password = settings.LINKEDIN_PASSWORD

    async def publish(self, job_data: dict) -> str:
        if not self.email or not self.password:
            logger.warning("LinkedIn credentials not configured. Failing immediately.")
            raise ValueError("LinkedIn credentials not configured")
            
        async with async_playwright() as p:
            # Running headful locally or headless in prod, using headless=True
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36"
            )
            page = await context.new_page()
            
            try:
                # Login
                await page.goto("https://www.linkedin.com/login", timeout=30000)
                await page.fill("input[name='session_key']", self.email)
                await page.fill("input[name='session_password']", self.password)
                await page.click("button[type='submit']")
                
                # Wait for feed or pin auth
                await page.wait_for_load_state("load", timeout=15000)
                
                if "checkpoint" in page.url or "challenge" in page.url:
                    logger.error("LinkedIn security checkpoint/captcha hit.")
                    raise Exception("Security check hit")
                
                # 1. Format Tags
                tags = job_data.get('tags', "")
                formatted_tags = ""
                if tags:
                    formatted_tags = "\n" + " ".join([f"#{t.strip()}" for t in tags.split(",") if t.strip()])

                # Generate post content with tags
                post_content = (
                    f"We're hiring! 🚀\n\n"
                    f"Role: {job_data.get('title', 'N/A')}\n"
                    f"Location: {job_data.get('location', 'N/A')}\n"
                    f"Type: {job_data.get('job_type', 'N/A')}\n\n"
                    f"Description: {job_data.get('description', 'N/A')}\n\n"
                    f"Requirements: {job_data.get('requirements', 'N/A')}"
                    f"{formatted_tags}"
                )
                
                logger.info("Opening post composer on feed...")
                await asyncio.sleep(4)  # Let feed stabilize
                
                # Click 'Start a post'
                await page.wait_for_selector('text="Start a post"', timeout=20000)
                await page.click('text="Start a post"')
                
                # 2. Handle Image Upload if base64 provided
                img_b64 = job_data.get('image_base64')
                if img_b64:
                    import base64
                    import tempfile
                    try:
                        # Save to temp file
                        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
                            tmp.write(base64.b64decode(img_b64))
                            tmp_path = tmp.name
                        
                        logger.info(f"Uploading image from {tmp_path}")
                        # Click "Add media"
                        await page.click('button[aria-label="Add media"]')
                        
                        # Wait for the file input and set it
                        await page.set_input_files('input[type="file"]', tmp_path)
                        
                        # Wait for "Next" or "Done" button in the image editor
                        await page.wait_for_selector('button:has-text("Next"), button:has-text("Done")')
                        await page.click('button:has-text("Next"), button:has-text("Done")')
                        
                        # Clean up
                        os.unlink(tmp_path)
                        await asyncio.sleep(1) # wait for modal to transition back to text
                    except Exception as e:
                        logger.warning(f"Failed to upload image: {e}")

                logger.info("Writing post content...")
                await page.wait_for_selector('div[role="textbox"]', timeout=10000)
                await page.fill('div[role="textbox"]', post_content)
                await asyncio.sleep(2)
                
                logger.info("Publishing post...")
                
                # Use the exact class for the 'Post' button in the modal to avoid matching hidden elements
                # using force=True to bypass any overlapping div interop-outlets intercepting pointer events
                await page.locator('button.share-actions__primary-action').click(force=True)
                
                # Wait for post to process
                await asyncio.sleep(5)
                
                # Return your generic profile activity link since we can't easily extract the new post's exact URL here
                return f"https://www.linkedin.com/in/me/recent-activity/all/"
                
            except Exception as e:
                screenshot_path = f"linkedin_error_{job_data['id']}.png"
                await page.screenshot(path=screenshot_path)
                logger.error(f"Failed to publish to LinkedIn. Screenshot saved to {screenshot_path}. Error: {e}")
                raise e
            finally:
                await browser.close()
