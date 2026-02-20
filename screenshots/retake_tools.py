import asyncio
from playwright.async_api import async_playwright
import os

async def take_tools_screenshot():
    screenshots_dir = os.path.dirname(os.path.abspath(__file__))
    
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(
            viewport={'width': 1400, 'height': 900},
            color_scheme='dark'
        )
        page = await context.new_page()
        
        base_url = 'http://localhost:3000'
        
        print("Capturing Tools Sync tab...")
        await page.goto(f'{base_url}/tools', wait_until='networkidle')
        await page.wait_for_timeout(1000)
        
        tools_tab = await page.query_selector('button:has-text("Tools Sync")')
        if tools_tab:
            await tools_tab.click()
            await page.wait_for_timeout(1000)
            print("Clicked Tools Sync tab")
        
        screenshot_path = os.path.join(screenshots_dir, 'tools.png')
        await page.screenshot(path=screenshot_path, full_page=False)
        print(f"Saved: {screenshot_path}")
        
        await browser.close()
        print("Done!")

if __name__ == '__main__':
    asyncio.run(take_tools_screenshot())
