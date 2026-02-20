import asyncio
from playwright.async_api import async_playwright
import os

async def take_preview_screenshot():
    screenshots_dir = os.path.dirname(os.path.abspath(__file__))
    
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(
            viewport={'width': 1400, 'height': 900},
            color_scheme='dark'
        )
        page = await context.new_page()
        
        base_url = 'http://localhost:3000'
        
        print("Capturing Tools page with preview modal...")
        await page.goto(f'{base_url}/tools', wait_until='networkidle')
        await page.wait_for_timeout(2000)
        
        detected_tool_cards = await page.query_selector_all('.card.cursor-pointer')
        print(f"Found {len(detected_tool_cards)} tool cards")
        
        if len(detected_tool_cards) > 0:
            await detected_tool_cards[0].click()
            await page.wait_for_timeout(1500)
            print("Clicked on first tool card")
        
        preview_buttons = await page.query_selector_all('button[title="Preview"]')
        print(f"Found {len(preview_buttons)} preview buttons")
        
        if len(preview_buttons) > 0:
            await preview_buttons[0].click()
            await page.wait_for_timeout(1000)
            
            screenshot_path = os.path.join(screenshots_dir, 'skill-preview.png')
            await page.screenshot(path=screenshot_path, full_page=False)
            print(f"  Saved: {screenshot_path}")
        else:
            screenshot_path = os.path.join(screenshots_dir, 'tools-expanded.png')
            await page.screenshot(path=screenshot_path, full_page=False)
            print(f"  Saved expanded tools: {screenshot_path}")
            
        await browser.close()
        print("Done!")

if __name__ == '__main__':
    asyncio.run(take_preview_screenshot())
