#!/usr/bin/env python3
"""
Generate favicon PNGs with Shavian text in Ormin font at multiple sizes.
"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

def generate_favicon_size(size, font_path, shaw_char='𐑖', tee_char='𐑑'):
    """Generate a single favicon at the given size with nestled 𐑖 and 𐑑."""
    # Create image with purple background
    bg_color = (102, 126, 234)  # #667eea
    img = Image.new('RGBA', (size, size), bg_color + (255,))

    # Calculate font size - increased to use full space (100% of size)
    font_size = int(size * 1.0)
    font = ImageFont.truetype(font_path, font_size)

    # Get bounding boxes for both characters (same font size)
    temp_draw = ImageDraw.Draw(img)

    # Shaw character bounding box
    shaw_bbox = temp_draw.textbbox((0, 0), shaw_char, font=font)
    shaw_width = shaw_bbox[2] - shaw_bbox[0]
    shaw_height = shaw_bbox[3] - shaw_bbox[1]

    # Tee character bounding box (same font)
    tee_bbox = temp_draw.textbbox((0, 0), tee_char, font=font)
    tee_width = tee_bbox[2] - tee_bbox[0]
    tee_height = tee_bbox[3] - tee_bbox[1]

    # Position shaw to be slightly left of center
    shaw_x = (size - shaw_width) // 2 - shaw_bbox[0] - int(tee_width * 0.3)
    shaw_y = (size - shaw_height) // 2 - shaw_bbox[1]

    # Position tee to nestle in shaw's curve (nudged further right, baseline 40% down)
    tee_x = shaw_x + int(shaw_width * 0.7)  # Nudged further right (was 0.6)
    tee_y = shaw_y + int(font_size * 0.4) - tee_bbox[1]  # 40% down from shaw baseline

    # Create shadow layers
    shadow_layer = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow_layer)

    shadow_offset = max(1, size // 40)  # More subtle offset for contrast

    # Draw shadows (same font for both)
    shadow_draw.text((shaw_x + shadow_offset, shaw_y + shadow_offset),
                     shaw_char, font=font, fill=(0, 0, 0, 180))
    shadow_draw.text((tee_x + shadow_offset, tee_y + shadow_offset),
                     tee_char, font=font, fill=(0, 0, 0, 180))

    # Blur the shadow
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(radius=max(2, size // 25)))

    # Composite shadow onto main image
    img = Image.alpha_composite(img, shadow_layer)

    # Draw white shaw and black tee (same font size)
    draw = ImageDraw.Draw(img)
    draw.text((shaw_x, shaw_y), shaw_char, font=font, fill='white')
    draw.text((tee_x, tee_y), tee_char, font=font, fill='black')

    return img

def generate_favicons():
    # Load Ormin font
    font_path = '../site/fonts/Ormin-Regular.otf'
    if not os.path.exists(font_path):
        print(f"Error: Font not found at {font_path}")
        return

    # Characters to render: '𐑖' (shaw) with nestled '𐑑' (tee)

    # Generate multiple sizes (64x64 and larger)
    sizes = [64, 128, 180, 192, 512]

    for size in sizes:
        img = generate_favicon_size(size, font_path)
        output_path = f'../site/favicon-{size}x{size}.png'
        img.save(output_path, 'PNG')
        print(f"Generated {output_path}")

    # Also generate default favicon.png (64x64) and favicon.ico (32x32)
    img_64 = generate_favicon_size(64, font_path)
    img_64.save('../site/favicon.png', 'PNG')
    print(f"Generated ../site/favicon.png (64x64)")

    img_32 = generate_favicon_size(32, font_path)
    img_32.save('../site/favicon.ico', 'ICO')
    print(f"Generated ../site/favicon.ico (32x32)")

if __name__ == '__main__':
    generate_favicons()
