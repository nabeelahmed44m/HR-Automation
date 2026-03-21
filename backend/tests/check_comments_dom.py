import asyncio
import os
from sqlalchemy.future import select
from core.database import AsyncSessionLocal
from models.user import User
from models.job import Job
from playwright.async_api import async_playwright

async def main():
    async with AsyncSessionLocal() as session:
        # Get first user with a cookie
        query = select(User).where(User.linkedin_cookie != None)
        result = await session.execute(query)
        user = result.scalars().first()
        
        if not user:
            print("No user with cookie found.")
            return

        # Get a published job with a URL
        query = select(Job).where(Job.linkedin_url != None)
        result = await session.execute(query)
        job = result.scalars().first()
        
        if not job:
            print("No job with linkedin_url found.")
            return
            
        print(f"Using Job URL: {job.linkedin_url}")
        
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
        )
        await context.add_cookies([{
            'name': 'li_at',
            'value': user.linkedin_cookie,
            'url': 'https://www.linkedin.com'
        }])
        
        page = await context.new_page()
        await page.goto(job.linkedin_url, wait_until="networkidle")
        await asyncio.sleep(5)
        
        # Take a screenshot to see what we're looking at
        await page.screenshot(path="linkedin_post.png", full_page=True)
        
        # Dump HTML
        html = await page.content()
        with open("post_dump.html", "w", encoding="utf-8") as f:
            f.write(html)
            
        print("Done! Scraped to post_dump.html and linkedin_post.png")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
