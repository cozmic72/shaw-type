#!/usr/bin/env python3
"""
Generate favicon PNGs with Shavian text in Ormin font at multiple sizes.
"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

def generate_favicon_size(size, font_path, shaw_char='𐑖', tee_char='𐑑'):
    """Generate a single favicon at the given size with nestled 𐑖 and 𐑑."""
    # Create transparent image
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))

    # Draw rounded rectangle with white fill and blue border
    draw = ImageDraw.Draw(img)
    corner_radius = size // 5  # 20% corner radius
    border_width = max(3, int(size / 32 * 1.5))  # 50% thicker border

    # Colors
    blue_border = (85, 95, 220)  # #555fdc
    white_fill = (255, 255, 255)

    # Draw white rounded rectangle
    draw.rounded_rectangle([(0, 0), (size-1, size-1)], radius=corner_radius,
                          fill=white_fill + (255,), outline=blue_border + (255,),
                          width=border_width)

    # Calculate font size - increased by 8% (98% of size)
    font_size = int(size * 0.98)
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

    # Position shaw to be slightly left of center at 12% from top
    shaw_x = (size - shaw_width) // 2 - shaw_bbox[0] - int(tee_width * 0.3)
    shaw_y = int(size * 0.12) - shaw_bbox[1]  # Position at 12% from top

    # Position tee to nestle in shaw's curve, with baseline clear of bottom
    tee_x = shaw_x + int(shaw_width * 0.75)  # Increased spacing (was 0.7)
    # Position tee moved up to match shaw's upward nudge
    tee_bottom_margin = int(size * 0.16)  # Increased from 8% to 16% to move up with shaw
    tee_y = size - tee_bottom_margin - tee_bbox[3]

    # Draw black shaw and black tee (same font size, with stroke for boldness)
    draw = ImageDraw.Draw(img)
    stroke_width = max(1, size // 40)  # Bold effect with stroke
    draw.text((shaw_x, shaw_y), shaw_char, font=font, fill='black',
              stroke_width=stroke_width, stroke_fill='black')
    draw.text((tee_x, tee_y), tee_char, font=font, fill='black',
              stroke_width=stroke_width, stroke_fill='black')

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
