#!/usr/bin/env python3
"""
Generate PNG images of Shavian keyboard layouts.
Creates one image for base layer and one for shift layer (if non-empty).
"""

import json
from PIL import Image, ImageDraw, ImageFont
import os

# Keyboard physical layout (ANSI)
KEY_ROWS = [
    # Number row
    ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
    # QWERTY row
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
    # Home row
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"],
    # Bottom row
    ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/']
]

# Visual settings (matching virtual-keyboard.css)
KEY_SIZE = 60
KEY_SPACING = 8
KEY_MARGIN = 20
FONT_SIZE = 32
BG_COLOR = '#2a2a2a'      # .virtual-keyboard background
KEY_COLOR = '#3d3d3d'     # .key background
KEY_BORDER = '#4a4a4a'    # .key border
TEXT_COLOR = '#e0e0e0'    # .key color

def get_shavian_font(size):
    """Try to find a Shavian font on the system."""
    font_paths = [
        '../site/fonts/InterAlia-Regular.otf',
        '../site/fonts/Ormin-Regular.otf',
        '/System/Library/Fonts/Supplemental/NotoSansShavian-Regular.ttf',
        '/Library/Fonts/NotoSansShavian-Regular.ttf',
    ]

    for path in font_paths:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception as e:
                print(f"Warning: Could not load font {path}: {e}")
                continue

    # Fallback to default
    print("Warning: Shavian font not found, using default font")
    return ImageFont.load_default()

def draw_keyboard(layout_data, layer='base', output_path='keyboard.png'):
    """Draw a keyboard layout and save as PNG."""

    # Calculate dimensions
    max_keys_per_row = max(len(row) for row in KEY_ROWS)
    width = KEY_MARGIN * 2 + max_keys_per_row * KEY_SIZE + (max_keys_per_row - 1) * KEY_SPACING
    height = KEY_MARGIN * 2 + len(KEY_ROWS) * KEY_SIZE + (len(KEY_ROWS) - 1) * KEY_SPACING

    # Create image
    img = Image.new('RGB', (width, height), BG_COLOR)
    draw = ImageDraw.Draw(img)
    font = get_shavian_font(FONT_SIZE)

    # Row offsets for proper keyboard stagger
    row_offsets = [0, KEY_SIZE * 0.25, KEY_SIZE * 0.5, KEY_SIZE * 0.75]

    for row_idx, row_keys in enumerate(KEY_ROWS):
        y = KEY_MARGIN + row_idx * (KEY_SIZE + KEY_SPACING)
        x_offset = row_offsets[row_idx] if row_idx < len(row_offsets) else 0

        for key_idx, key in enumerate(row_keys):
            x = KEY_MARGIN + x_offset + key_idx * (KEY_SIZE + KEY_SPACING)

            # Draw key background
            draw.rectangle(
                [x, y, x + KEY_SIZE, y + KEY_SIZE],
                fill=KEY_COLOR,
                outline=KEY_BORDER,
                width=2
            )

            # Get the character for this key
            if layer == 'shift':
                # For shift layer, check uppercase version
                char_key = key.upper()
                char = layout_data.get(char_key, '')
            else:
                char = layout_data.get(key, '')

            # Draw the character centered on the key
            if char and char.strip():
                # Get text bounding box
                bbox = draw.textbbox((0, 0), char, font=font)
                text_width = bbox[2] - bbox[0]
                text_height = bbox[3] - bbox[1]

                text_x = x + (KEY_SIZE - text_width) // 2
                text_y = y + (KEY_SIZE - text_height) // 2 - 5  # Adjust for visual centering

                draw.text((text_x, text_y), char, fill=TEXT_COLOR, font=font)

    # Save image
    img.save(output_path)
    print(f"  Saved: {output_path}")

def generate_all_keyboards():
    """Generate keyboard images for all layouts."""

    # Load keyboard layouts
    with open('keyboard_layouts.json', 'r', encoding='utf-8') as f:
        layouts = json.load(f)

    # Create output directory
    output_dir = '../site/keyboard_images'
    os.makedirs(output_dir, exist_ok=True)

    print("Generating keyboard layout images...")
    print()

    for layout_id, layout_info in layouts.items():
        layout_name = layout_info['name']
        print(f"{layout_name}:")

        # Generate base layer
        base_output = f"{output_dir}/{layout_id}_base.png"
        draw_keyboard(layout_info['base'], 'base', base_output)

        # Generate shift layer if it has mappings
        if layout_info['shift']:
            shift_output = f"{output_dir}/{layout_id}_shift.png"
            draw_keyboard(layout_info['shift'], 'shift', shift_output)
        else:
            print(f"  (no shift layer)")

        print()

    print("Done!")

if __name__ == '__main__':
    generate_all_keyboards()
