#!/usr/bin/env python3
"""
Generate keyboard layout images by taking screenshots of the virtual keyboard
rendered in the actual game. This ensures the images match exactly how the
keyboard appears in the app.
"""

import asyncio
from playwright.async_api import async_playwright
import os
import http.server
import socketserver
import threading
import time

# Keyboard layouts to generate
LAYOUTS = [
    'imperial',
    'igc',
    'qwerty',
    '2layer',
    'jafl'
]

def start_server(port, directory):
    """Start a simple HTTP server in a background thread."""
    class QuietHandler(http.server.SimpleHTTPRequestHandler):
        def log_message(self, format, *args):
            pass  # Suppress server logs

    os.chdir(directory)
    handler = QuietHandler

    # Try to find an available port
    max_attempts = 10
    for attempt in range(max_attempts):
        try:
            httpd = socketserver.TCPServer(("", port + attempt), handler)
            actual_port = port + attempt
            if attempt > 0:
                print(f"  Port {port} in use, using port {actual_port} instead")

            # Run server in a daemon thread
            server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
            server_thread.start()

            return httpd, actual_port
        except OSError:
            if attempt == max_attempts - 1:
                raise
            continue

    raise OSError(f"Could not find available port starting from {port}")

async def generate_keyboard_screenshots(server_port=8765):
    """Generate screenshots for all keyboard layouts and shift states."""

    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)
    site_dir = os.path.join(project_dir, 'site')

    # Start local web server
    print(f"Starting local web server on port {server_port}...")
    server, actual_port = start_server(server_port, site_dir)
    time.sleep(1)  # Give server time to start

    try:
        async with async_playwright() as p:
            # Launch browser
            browser = await p.chromium.launch()
            page = await browser.new_page()

            # Load the local site via HTTP server
            await page.goto(f'http://localhost:{actual_port}/index.html')

            # Wait for page to load
            await page.wait_for_load_state('networkidle')
            await asyncio.sleep(2)  # Extra time for fonts to load

            # Close splash screen if it's showing by directly manipulating the DOM
            await page.evaluate('''() => {
                const splashModal = document.getElementById('splashModal');
                if (splashModal) {
                    splashModal.classList.remove('show');
                    splashModal.style.display = 'none';
                }
            }''')
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
            output_dir = os.path.join(project_dir, 'site', 'keyboard_images')
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
    finally:
        # Shut down the server
        server.shutdown()

def main():
    """Main entry point."""
    asyncio.run(generate_keyboard_screenshots())

if __name__ == '__main__':
    main()
