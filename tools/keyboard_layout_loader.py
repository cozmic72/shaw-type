#!/usr/bin/env python3
"""
Helper module to load and parse keyboard layouts from JSON.
"""

import json
from pathlib import Path

# Standard QWERTY physical key positions
QWERTY_ROWS = {
    'number': list('1234567890-='),
    'qwerty': list('qwertyuiop[]\\'),
    'home': list('asdfghjkl;\''),
    'bottom': list('zxcvbnm,./')
}

def load_keyboard_layouts(json_file=None):
    """Load keyboard layouts from JSON file."""
    if json_file is None:
        script_dir = Path(__file__).parent
        json_file = script_dir.parent / 'site' / 'keyboard_layouts.json'

    with open(json_file, 'r', encoding='utf-8') as f:
        return json.load(f)

def organize_layout_by_rows(layout_map):
    """
    Organize a keyboard layout by physical rows.

    Args:
        layout_map: Dict mapping QWERTY keys to Shavian characters

    Returns:
        Dict with keys 'number', 'qwerty', 'home', 'bottom' containing the Shavian chars
    """
    organized = {
        'number': '',
        'qwerty': '',
        'home': '',
        'bottom': ''
    }

    # Map each QWERTY key to its row
    for row_name, keys in QWERTY_ROWS.items():
        chars = []
        for key in keys:
            # Check both lowercase and uppercase (shift layer)
            if key in layout_map:
                char = layout_map[key]
                # Skip punctuation and numbers that map to themselves
                if char and char not in '1234567890[];\',./-=\\[]`':
                    chars.append(char)
            # Also check uppercase version
            if key.upper() in layout_map and key.upper() != key:
                char = layout_map[key.upper()]
                if char and char not in '1234567890[];\',./-=\\[]`':
                    chars.append(char)

        organized[row_name] = ''.join(chars)

    return organized

def get_layout_for_learn_mode(layout_name, keyboard_layouts=None):
    """
    Get a keyboard layout organized by rows for learn mode.

    Args:
        layout_name: Name of layout ('imperial', 'qwerty', etc.)
        keyboard_layouts: Optional pre-loaded layouts dict

    Returns:
        Dict with keys 'number', 'qwerty', 'home', 'bottom'
    """
    if keyboard_layouts is None:
        keyboard_layouts = load_keyboard_layouts()

    if layout_name not in keyboard_layouts:
        raise ValueError(f"Unknown layout: {layout_name}")

    layout_map = keyboard_layouts[layout_name]
    return organize_layout_by_rows(layout_map)

# Ligatures: compound letters formed by typing two characters
# Format: ligature -> (char1, char2)
LIGATURES = {
    '𐑼': ('𐑩', '𐑮'),  # ER ligature
    '𐑸': ('𐑭', '𐑮'),  # AR ligature
    '𐑹': ('𐑷', '𐑮'),  # OR ligature
    '𐑿': ('𐑘', '𐑵'),  # YEW ligature
    '𐑽': ('𐑾', '𐑮')   # AIR ligature
}

if __name__ == '__main__':
    # Test loading
    layouts = load_keyboard_layouts()
    print(f"Loaded {len(layouts)} keyboard layouts:")
    for name in layouts.keys():
        print(f"  {name}")

    print("\nImperial layout organized by rows:")
    imperial = get_layout_for_learn_mode('imperial', layouts)
    for row, chars in imperial.items():
        print(f"  {row}: {chars}")
