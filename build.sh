#!/bin/bash
#
# Build script for Shaw Type
# Generates all resources needed for the site
#

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=========================================="
echo "Building Shaw Type Resources"
echo "=========================================="
echo

# Check if readlex submodule is initialized
if [ ! -f "readlex/readlex.json" ]; then
    echo "Initializing readlex submodule..."
    git submodule update --init --recursive
    echo "✓ Readlex submodule initialized"
    echo
fi

# Generate keyboard images
if [ -f "tools/generate_keyboard_images.py" ]; then
    echo "Generating keyboard images..."
    python3 tools/generate_keyboard_images.py
    echo "✓ Keyboard images generated"
    echo
fi

# Generate transliterations
echo "Generating transliterations..."
echo "(You may be prompted to resolve ambiguous words)"
echo
python3 tools/generate_translations.py
echo

# Generate word lists
echo "Generating word lists..."
python3 tools/generate_play_words.py
python3 tools/generate_learn_words.py
echo "✓ Word lists generated"
echo

# Generate favicon
if [ -f "tools/generate_favicon.py" ]; then
    echo "Generating favicon..."
    python3 tools/generate_favicon.py
    echo "✓ Favicon generated"
    echo
fi

echo "=========================================="
echo "Build Complete!"
echo "=========================================="
echo
echo "Generated files are in the site/ directory"
echo "Run 'python3 -m http.server 8000 --directory site' to test locally"
