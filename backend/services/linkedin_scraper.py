import asyncio
import logging
from playwright.async_api import async_playwright

logger = logging.getLogger(__name__)

class LinkedInScraper:
    def __init__(self, cookie: str):
        self.cookie = cookie

    async def scrape_comments(self, url: str) -> list:
        if not self.cookie:
            raise ValueError("LinkedIn cookie missing. Cannot scrape.")
            
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
                viewport={'width': 1280, 'height': 800},
                java_script_enabled=True,
                ignore_https_errors=True
            )
            
            await context.add_cookies([{
                'name': 'li_at',
                'value': self.cookie,
                'url': 'https://www.linkedin.com'
            }])
                
            page = await context.new_page()
            
            try:
                logger.info(f"Navigating to {url} to scrape comments...")
                await page.goto(url, timeout=30000, wait_until="domcontentloaded")
                
                # Check cookie validity loosely
                await asyncio.sleep(4)
                if "login" in page.url:
                    raise Exception("LinkedIn cookie expired or invalid.")
                    
                # Scroll a bit to trigger lazy loading of comments
                await page.evaluate("window.scrollBy(0, 500)")
                await asyncio.sleep(2)
                
                # Force expand comments if they are hidden behind a toggle
                try:
                    comment_btns = await page.query_selector_all('button.comment-button')
                    if comment_btns:
                        for btn in comment_btns:
                            await btn.click()
                            await asyncio.sleep(1)
                except Exception:
                    pass
                    
                await asyncio.sleep(3)
                
                # Broadly extract anything that looks like a comment from LinkedIn's feed markup
                comments = await page.evaluate('''() => {
                    // Try dozens of known LinkedIn comment wrapper classes
                    const selectors = [
                        '.comments-comment-item', 
                        'article.comments-comment-item', 
                        '.comments-comments-list__comment-item',
                        '.comments-post-meta',
                        'article'
                    ];
                    
                    const commentNodes = Array.from(document.querySelectorAll(selectors.join(', ')));
                    const results = [];
                    
                    for (const node of commentNodes) {
                        try {
                            const authorEl = node.querySelector('.comments-post-meta__name-text, span.comments-post-meta__name-text, span[dir="ltr"], .comments-post-meta__name, h3 span');
                            const textEl = node.querySelector('.comments-comment-item-content-body, .update-components-text, .feed-shared-update-v2__commentary, .comments-comment-item__main-content');
                            
                            const author = authorEl ? authorEl.innerText.trim() : null;
                            const text = textEl ? textEl.innerText.trim() : null;
                            
                            // Classify if it's a nested reply by checking container or specific classes
                            const isReply = !!(node.closest('.comments-replies-list') || node.classList.contains('comments-comment-item--reply') || node.closest('.comments-comment-item__nested-comments'));
                            
                            // If we find both, it's a valid extraction!
                            if (author && text && text.length > 0) {
                                results.push({
                                    author: author,
                                    text: text.replace(/\\n/g, ' '),
                                    timestamp: new Date().toISOString(),
                                    is_reply: isReply
                                });
                            }
                        } catch (e) {
                            // ignore individual fail
                        }
                    }
                    
                    // Filter duplicates by tracking texts temporarily
                    const unique = [];
                    const texts = new Set();
                    for (const row of results) {
                        const key = `${row.author}-${row.text}`;
                        if (!texts.has(key)) {
                            texts.add(key);
                            unique.push(row);
                        }
                    }
                    return unique;
                }''')
                
                logger.info(f"Successfully scraped {len(comments)} comments from post.")
                return comments
                
            except Exception as e:
                logger.error(f"Error scraping comments: {str(e)}")
                raise e
            finally:
                await browser.close()
