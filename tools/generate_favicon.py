#!/usr/bin/env python3
"""
Generate favicon PNG with Shavian text in Ormin font.
"""

from PIL import Image, ImageDraw, ImageFont
import os

def generate_favicon():
    # Favicon size (use 64x64 for better quality, browsers will scale down)
    size = 64

    # Create image with purple background
    bg_color = (102, 126, 234)  # #667eea
    img = Image.new('RGB', (size, size), bg_color)
    draw = ImageDraw.Draw(img)

    # Load Ormin font
    font_path = '../site/fonts/Ormin-Regular.otf'
    if not os.path.exists(font_path):
        print(f"Error: Font not found at {font_path}")
        return

    # Try different font sizes to fit nicely
    font_size = 42
    font = ImageFont.truetype(font_path, font_size)

    # Text to render: '·𐑖𐑷' (Shaw in Shavian)
    text = '·𐑖𐑷'

    # Get text bounding box
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    # Center the text
    x = (size - text_width) // 2 - bbox[0]
    y = (size - text_height) // 2 - bbox[1]

    # Draw white text
    draw.text((x, y), text, font=font, fill='white')

    # Save as PNG and ICO
    output_png = '../site/favicon.png'
    output_ico = '../site/favicon.ico'

    img.save(output_png, 'PNG')
    print(f"Generated {output_png}")

    # Also save as .ico for maximum compatibility
    img.save(output_ico, 'ICO')
    print(f"Generated {output_ico}")

if __name__ == '__main__':
    generate_favicon()
