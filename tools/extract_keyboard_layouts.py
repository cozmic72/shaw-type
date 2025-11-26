#!/usr/bin/env python3
"""
Extract keyboard layouts from keyboard_layouts.json and split into separate files.
This enables lazy loading of keyboard layouts for better analytics and performance.
"""

import json
from pathlib import Path

def split_keyboard_layouts(input_file, output_dir):
    """Split keyboard_layouts.json into separate files for each layout."""

    # Read the combined file
    with open(input_file, 'r', encoding='utf-8') as f:
        all_layouts = json.load(f)

    # Create output directory if it doesn't exist
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Splitting keyboard layouts from {input_file.name}...")
    print(f"Found {len(all_layouts)} layouts:")

    # Save each layout to a separate file
    for layout_name, layout_data in all_layouts.items():
        output_file = output_dir / f'keyboard_layout_{layout_name}.json'

        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(layout_data, f, ensure_ascii=False, indent=2)

        # Count keys (if it has a 'keys' property)
        key_count = len(layout_data.get('keys', {})) if isinstance(layout_data, dict) else 0
        print(f"  - {layout_name} → {output_file.name} ({key_count} keys)")

    print(f"\n✓ Split into {len(all_layouts)} files in {output_dir}")

def main():
    script_dir = Path(__file__).parent
    project_dir = script_dir.parent
    input_file = project_dir / 'site' / 'keyboard_layouts.json'
    output_dir = project_dir / 'site'

    if not input_file.exists():
        print(f"Error: {input_file} not found")
        print("Please ensure keyboard_layouts.json exists in the site directory")
        return 1

    split_keyboard_layouts(input_file, output_dir)
    return 0

if __name__ == '__main__':
    exit(main())
