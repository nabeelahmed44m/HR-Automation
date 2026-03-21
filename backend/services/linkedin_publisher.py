import os
import asyncio
import logging
from playwright.async_api import async_playwright

logger = logging.getLogger(__name__)

class LinkedInPublisher:
    def __init__(self, cookie: str = None, **kwargs):
        self.cookie = cookie

    async def publish(self, job_data: dict) -> str:
        if not self.cookie:
            logger.warning("LinkedIn cookie not configured. Failing immediately.")
            raise ValueError("Your LinkedIn connection expired or is missing. Please go to Settings and click Connect again!")
            
        async with async_playwright() as p:
            # Running silently and perfectly headlessly now
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
                viewport={'width': 1280, 'height': 800},
                java_script_enabled=True,
                ignore_https_errors=True
            )
            
            logger.info("Using provided li_at cookie for authentication...")
            print("DEBUG: Injecting li_at cookie")
            await context.add_cookies([
                {
                    'name': 'li_at',
                    'value': self.cookie,
                    'url': 'https://www.linkedin.com'
                }
            ])
                
            tmp_path = None
            page = await context.new_page()
            
            try:
                # Validate cookie on feed load
                print("DEBUG: Navigating to LinkedIn feed with cookie")
                await page.goto("https://www.linkedin.com/feed/", timeout=30000, wait_until="domcontentloaded")
                await asyncio.sleep(3)
                if "login" in page.url:
                    logger.error("LinkedIn cookie (li_at) is invalid or expired.")
                    raise Exception("Your LinkedIn connection expired or was blocked. Please go to Settings and click Connect again!")
                
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
                        # Clean up prefix if it contains one (e.g. data:image/png;base64,...)
                        if "," in img_b64:
                            img_b64 = img_b64.split(",", 1)[1]
                            
                        # Save to temp file
                        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
                            tmp.write(base64.b64decode(img_b64))
                            tmp_path = tmp.name
                        
                        logger.info(f"Uploading image from {tmp_path}")
                        
                        # IMPORTANT: To avoid the macOS native file dialogue popup, 
                        # we must tell Playwright to INTERCEPT the click event!
                        async with page.expect_file_chooser() as fc_info:
                            await page.click('button[aria-label="Add media"]')
                            
                        file_chooser = await fc_info.value
                        await file_chooser.set_files(tmp_path)
                        
                        # Wait for "Next" or "Done" button in the image editor
                        await asyncio.sleep(2)
                        
                        try:
                            await page.get_by_role("button", name="Next", exact=True).first.click(timeout=5000)
                        except Exception:
                            try:
                                await page.get_by_role("button", name="Done", exact=True).first.click(timeout=5000)
                            except Exception:
                                # Fallback for dynamic class names
                                await page.locator('div.share-box-footer button.artdeco-button--primary, div.share-box__actions button.artdeco-button--primary').last.click(timeout=5000)
                            
                        # Do NOT delete the local temp file immediately!
                        # LinkedIn uploads the file continuously in the background using JavaScript.
                        # If we delete it too fast, Chrome throws a 'Network Error' because 
                        # the physical file vanishes from your hard drive before the JS finishes streaming it!
                        await asyncio.sleep(1) # wait for modal to transition back to text
                    except Exception as e:
                        logger.warning(f"Failed to upload image: {e}")

                logger.info("Writing post content...")
                # Increase timeout to 25s because LinkedIn's modal can be extremely slow to load
                await page.wait_for_selector('div[role="textbox"]', timeout=25000)
                
                # LinkedIn uses a complex React text editor (Draft.js). 
                # .fill() often sets the text but fails to trigger the 'Post' button to turn blue.
                # Must simulate human typing!
                await page.click('div[role="textbox"]')
                await page.keyboard.type(post_content, delay=5)
                await asyncio.sleep(2)
                
                logger.info("Publishing post...")
                
                # Find the explicit 'Post' button via role rather than fragile CSS classes
                post_btn = page.get_by_role("button", name="Post", exact=True).first
                if await post_btn.is_visible(timeout=5000):
                    await post_btn.click()
                else:
                    logger.warning("Could not find standard 'Post' button, falling back to class...")
                    await page.locator('div.share-box_actions button.artdeco-button--primary').last.click(force=True)
                
                # Wait for post to process and pop up the success toast!
                try:
                    logger.info("Waiting for success toast to capture exact post URL...")
                    toast_link = page.get_by_role("link", name="View post").first
                    
                    # Wait up to 10 seconds for the little black "Post successful" popup over the feed
                    await toast_link.wait_for(state="visible", timeout=10000)
                    
                    exact_url = await toast_link.get_attribute("href")
                    if exact_url:
                        if exact_url.startswith("/"):
                            exact_url = f"https://www.linkedin.com{exact_url}"
                        logger.info(f"Successfully captured exact post URL: {exact_url}")
                        return exact_url
                except Exception:
                    pass
                    
                # If we get here, the toast didn't render within the timeout which highly likely means failure.
                # Do NOT return a fallback. Manually fail it so the task doesn't falsely report success!
                raise Exception(
                    "Post submission timed out. 'View post' toast notification never appeared. "
                    "The post button may have failed or the text was not properly registered by LinkedIn."
                )
                
            except Exception as e:
                screenshot_path = f"linkedin_error_{job_data['id']}.png"
                await page.screenshot(path=screenshot_path)
                logger.error(f"Failed to publish to LinkedIn. Screenshot saved to {screenshot_path}. Error: {e}")
                raise e
            finally:
                await browser.close()
                if tmp_path and os.path.exists(tmp_path):
                    try:
                        os.unlink(tmp_path)
                        logger.info("Cleaned up temporary image file securely.")
                    except OSError:
                        pass
