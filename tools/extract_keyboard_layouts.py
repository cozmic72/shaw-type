#!/usr/bin/env python3
"""
Extract keyboard layouts from index.html into JSON files.
This creates the single source of truth for keyboard layouts.
"""

import json
import re
from pathlib import Path

def extract_keyboard_layouts(html_file):
    """Extract KEYBOARD_MAPS object from index.html."""

    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the KEYBOARD_MAPS object
    match = re.search(r'const KEYBOARD_MAPS = ({.*?});', content, re.DOTALL)
    if not match:
        raise ValueError("Could not find KEYBOARD_MAPS in index.html")

    maps_str = match.group(1)

    # Extract each layout
    layouts = {}
    layout_pattern = r"'(\w+)':\s*{([^}]+(?:{[^}]*}[^}]*)*)}"

    for layout_match in re.finditer(layout_pattern, maps_str):
        layout_name = layout_match.group(1)
        layout_content = layout_match.group(2)

        # Parse the key mappings
        key_map = {}
        # Match patterns like 'q': '𐑱' or '1': '𐑶' or 'Q': '𐑬'
        key_pattern = r"'([^']+)':\s*'([^']*)'"

        for key_match in re.finditer(key_pattern, layout_content):
            key = key_match.group(1)
            value = key_match.group(2)
            key_map[key] = value

        layouts[layout_name] = key_map

    return layouts

def main():
    script_dir = Path(__file__).parent
    project_dir = script_dir.parent
    html_file = project_dir / 'site' / 'index.html'
    output_file = project_dir / 'site' / 'keyboard_layouts.json'

    print("Extracting keyboard layouts from index.html...")

    layouts = extract_keyboard_layouts(html_file)

    print(f"Found {len(layouts)} layouts:")
    for name in layouts.keys():
        print(f"  - {name} ({len(layouts[name])} keys)")

    # Save to JSON
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(layouts, f, ensure_ascii=False, indent=2)

    print(f"\n✓ Saved to {output_file}")

if __name__ == '__main__':
    main()
