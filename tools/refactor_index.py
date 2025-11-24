#!/usr/bin/env python3
"""
Refactor index.html to use external CSS and JS files.
"""

from pathlib import Path

def refactor_index():
    """Refactor index.html to use external resources."""
    project_root = Path(__file__).parent.parent
    source_file = project_root / 'content' / 'index.html'

    with open(source_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    output_lines = []
    skip_mode = None

    for i, line in enumerate(lines, 1):
        # Add stylesheet link after virtual-keyboard.css
        if 'virtual-keyboard.css' in line and 'stylesheet' in line:
            output_lines.append(line)
            output_lines.append('    <link rel="stylesheet" href="style.css?v={{VERSION}}">\n')
            continue

        # Skip the <style> block (lines 55-801)
        if '<style>' in line and i == 55:
            skip_mode = 'style'
            continue

        if skip_mode == 'style' and '</style>' in line:
            skip_mode = None
            continue

        # Skip the main <script> block (lines 1075-3844)
        if '<script>' in line and i == 1075:
            skip_mode = 'script'
            continue

        if skip_mode == 'script' and '</script>' in line and i == 3844:
            skip_mode = None
            # Add main.js script tag
            output_lines.append('    <script src="main.js?v={{VERSION}}"></script>\n')
            continue

        # Keep line if not in skip mode
        if skip_mode is None:
            output_lines.append(line)

    # Write back to source file
    with open(source_file, 'w', encoding='utf-8') as f:
        f.writelines(output_lines)

    print(f"Refactored {source_file}")
    print(f"Original lines: {len(lines)}, New lines: {len(output_lines)}")

if __name__ == '__main__':
    refactor_index()
