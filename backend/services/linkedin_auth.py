import asyncio
import logging
from playwright.async_api import async_playwright

logger = logging.getLogger(__name__)

async def connect_linkedin_manually() -> str:
    """
    Opens a visible browser for the user to log in manually.
    Waits until the feed is reached, extracts the li_at cookie,
    and returns it. Closes automatically.
    """
    async with async_playwright() as p:
        # Launch visibly for the human user!
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
            viewport={'width': 1280, 'height': 800}
        )
        
        page = await context.new_page()
        
        try:
            logger.info("Opening LinkedIn login page for manual interaction...")
            await page.goto("https://www.linkedin.com/login")
            
            print("🚀 Browser popped up! Please log in to LinkedIn.")
            print("⏳ Waiting for you to reach the feed...")
            
            # Wait until the user successfully navigates past login (usually the feed)
            # We give them a massive 5-minute timeout to deal with captchas or emails
            await page.wait_for_url("**/feed/**", timeout=300000)
            print("✅ Feed reached! Extracting session cookie...")
            
            # Get all cookies for linkedin
            cookies = await context.cookies("https://www.linkedin.com")
            
            li_at_cookie = None
            for cookie in cookies:
                if cookie['name'] == 'li_at':
                    li_at_cookie = cookie['value']
                    break
                    
            if not li_at_cookie:
                raise ValueError("li_at cookie not found after successful login.")
                
            print("🎉 Successfully extracted and saved the secure session cookie!")
            await asyncio.sleep(2) # Show the feed for a second so they know it worked
            return li_at_cookie
            
        except Exception as e:
            logger.error(f"Manual LinkedIn connection failed or timed out: {e}")
            raise e
        finally:
            await browser.close()
