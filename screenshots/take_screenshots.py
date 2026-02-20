import asyncio
from playwright.async_api import async_playwright
import os

async def take_screenshots():
    screenshots_dir = os.path.dirname(os.path.abspath(__file__))
    
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(
            viewport={'width': 1400, 'height': 900},
            color_scheme='dark'
        )
        page = await context.new_page()
        
        base_url = 'http://localhost:3000'
        
        pages_to_capture = [
            ('/', 'dashboard.png', 'Dashboard'),
            ('/skills', 'skills.png', 'Skills Repository'),
            ('/tools', 'tools.png', 'Tools Sync'),
            ('/settings', 'settings.png', 'Settings'),
        ]
        
        for path, filename, title in pages_to_capture:
            url = f"{base_url}{path}"
            print(f"Capturing {title}: {url}")
            await page.goto(url, wait_until='networkidle')
            await page.wait_for_timeout(1000)
            
            screenshot_path = os.path.join(screenshots_dir, filename)
            await page.screenshot(path=screenshot_path, full_page=False)
            print(f"  Saved: {screenshot_path}")
        
        await browser.close()
        print("\nAll screenshots captured!")

if __name__ == '__main__':
    asyncio.run(take_screenshots())
