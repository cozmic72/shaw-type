#!/usr/bin/env python3
"""
Generate favicon PNGs with Shavian text in Ormin font at multiple sizes.
"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

def generate_favicon_size(size, font_path, text='·𐑖𐑷'):
    """Generate a single favicon at the given size."""
    # Create image with purple background
    bg_color = (102, 126, 234)  # #667eea
    img = Image.new('RGBA', (size, size), bg_color + (255,))

    # Calculate font size proportional to image size
    font_size = int(size * 0.66)
    font = ImageFont.truetype(font_path, font_size)

    # Create a separate layer for the shadow
    shadow_layer = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow_layer)

    # Get text bounding box
    temp_draw = ImageDraw.Draw(img)
    bbox = temp_draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    # Center the text
    x = (size - text_width) // 2 - bbox[0]
    y = (size - text_height) // 2 - bbox[1]

    # Draw shadow (offset by a few pixels, semi-transparent black)
    shadow_offset = max(1, size // 32)
    shadow_draw.text((x + shadow_offset, y + shadow_offset), text, font=font, fill=(0, 0, 0, 128))

    # Blur the shadow slightly
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(radius=max(1, size // 40)))

    # Composite shadow onto main image
    img = Image.alpha_composite(img, shadow_layer)

    # Draw white text with stroke for boldness
    draw = ImageDraw.Draw(img)
    stroke_width = max(1, size // 32)
    draw.text((x, y), text, font=font, fill='white', stroke_width=stroke_width, stroke_fill='white')

    return img

def generate_favicons():
    # Load Ormin font
    font_path = '../site/fonts/Ormin-Regular.otf'
    if not os.path.exists(font_path):
        print(f"Error: Font not found at {font_path}")
        return

    # Text to render: '·𐑖𐑷' (Shaw in Shavian)
    text = '·𐑖𐑷'

    # Generate multiple sizes (64x64 and larger)
    sizes = [64, 128, 180, 192, 512]

    for size in sizes:
        img = generate_favicon_size(size, font_path, text)
        output_path = f'../site/favicon-{size}x{size}.png'
        img.save(output_path, 'PNG')
        print(f"Generated {output_path}")

    # Also generate default favicon.png (64x64) and favicon.ico (32x32)
    img_64 = generate_favicon_size(64, font_path, text)
    img_64.save('../site/favicon.png', 'PNG')
    print(f"Generated ../site/favicon.png (64x64)")

    img_32 = generate_favicon_size(32, font_path, text)
    img_32.save('../site/favicon.ico', 'ICO')
    print(f"Generated ../site/favicon.ico (32x32)")

if __name__ == '__main__':
    generate_favicons()
