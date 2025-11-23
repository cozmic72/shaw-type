#!/usr/bin/env python3
"""
Generate keyboard layout images by taking screenshots of the virtual keyboard
rendered in the actual game. This ensures the images match exactly how the
keyboard appears in the app.
"""

import asyncio
from playwright.async_api import async_playwright
import os

# Keyboard layouts to generate
LAYOUTS = [
    'imperial',
    'igc',
    'qwerty',
    '2layer',
    'jafl'
]

async def generate_keyboard_screenshots():
    """Generate screenshots for all keyboard layouts and shift states."""

    async with async_playwright() as p:
        # Launch browser
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Load the local site
        site_path = os.path.join(os.path.dirname(__file__), 'site', 'index.html')
        await page.goto(f'file://{site_path}')

        # Wait for page to load
        await page.wait_for_load_state('networkidle')
        await asyncio.sleep(2)  # Extra time for fonts to load

        # Debug: take a screenshot to see what's showing
        await page.screenshot(path='debug_initial.png')
        print("Debug screenshot saved to debug_initial.png")

        # Close splash screen if it's showing
        splash_close = await page.query_selector('#closeSplash')
        if splash_close:
            print("Closing splash screen...")
            await splash_close.click()
            await asyncio.sleep(0.5)

        # Start play mode to activate the game
        await page.click('#homePlayBtn')

        # Wait for countdown/game to start
        await asyncio.sleep(4)

        # Show virtual keyboard using JavaScript
        await page.evaluate('''() => {
            showVirtualKeyboard();
            updateVirtualKeyboardLabels();
        }''')

        # Wait for keyboard to appear
        await page.wait_for_selector('#virtualKeyboard', state='visible')
        await asyncio.sleep(0.5)

        # Get the keyboard element
        keyboard = await page.query_selector('#virtualKeyboard .keyboard-body')

        if not keyboard:
            print("Error: Could not find keyboard element")
            await browser.close()
            return

        # Ensure output directory exists
        output_dir = os.path.join(os.path.dirname(__file__), 'site', 'keyboard_images')
        os.makedirs(output_dir, exist_ok=True)

        # Generate screenshots for each layout
        for layout in LAYOUTS:
            print(f"Generating screenshots for {layout}...")

            # Change layout using JavaScript - directly call updateKeyboardLabels with the correct map
            result = await page.evaluate(f'''() => {{
                window.currentLayout = '{layout}';
                localStorage.setItem('currentLayout', '{layout}');

                const keyboardMap = KEYBOARD_MAPS['{layout}'];
                const layoutNames = {{
                    'imperial': 'Shaw Imperial',
                    'igc': 'Imperial Good Companion',
                    'qwerty': 'Shaw QWERTY',
                    '2layer': 'Shaw 2-layer',
                    'jafl': 'Shaw-JAFL'
                }};
                const layoutName = layoutNames['{layout}'] || 'Virtual Keyboard';

                // Directly call the virtual keyboard functions with the correct map
                if (typeof updateKeyboardLabels === 'function') {{
                    updateKeyboardLabels(keyboardMap, layoutName);
                }}
                if (typeof makeKeysClickable === 'function') {{
                    makeKeysClickable(keyboardMap);
                }}

                return '{layout}';
            }}''')
            print(f"  Layout set to: {result}")
            await asyncio.sleep(0.3)

            # Ensure shift is not active
            is_shift_active = await page.evaluate('''() => {
                return window.isShiftActive || false;
            }''')

            if is_shift_active:
                # Click shift to deactivate
                await page.click('.key[data-key="Shift"]')
                await asyncio.sleep(0.2)

            # Take base layer screenshot
            output_path = os.path.join(output_dir, f'{layout}_base.png')
            await keyboard.screenshot(path=output_path)
            print(f"  ✓ Saved {layout}_base.png")

            # Activate shift (if layout has shift layer)
            # Check if shift layer exists by looking for shift-only characters
            await page.click('.key[data-key="Shift"]')
            await asyncio.sleep(0.2)

            # Check if this layout has a shift layer (non-empty shift characters)
            has_shift_layer = await page.evaluate('''() => {
                const keys = document.querySelectorAll('.key[data-shavian]');
                return keys.length > 0;
            }''')

            if has_shift_layer:
                # Take shift layer screenshot
                output_path = os.path.join(output_dir, f'{layout}_shift.png')
                await keyboard.screenshot(path=output_path)
                print(f"  ✓ Saved {layout}_shift.png")

                # Deactivate shift for next layout
                await page.click('.key[data-key="Shift"]')
                await asyncio.sleep(0.2)
            else:
                print(f"  ⓘ No shift layer for {layout}")
                # Deactivate shift
                await page.click('.key[data-key="Shift"]')
                await asyncio.sleep(0.2)

        await browser.close()
        print("\n✅ All keyboard images generated successfully!")

def main():
    """Main entry point."""
    asyncio.run(generate_keyboard_screenshots())

if __name__ == '__main__':
    main()
