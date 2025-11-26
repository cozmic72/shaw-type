#!/bin/bash
#
# Start a local web server for testing
# Serves the build/site directory on port 8000
#
# Usage: ./tools/serve.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SERVE_DIR="$PROJECT_ROOT/build/site"

# Check if build directory exists
if [ ! -d "$SERVE_DIR" ]; then
    echo "Error: Build directory not found: $SERVE_DIR"
    echo "Please run ./build.sh first to generate the build output"
    exit 1
fi

echo "Starting web server..."
echo "Serving: $SERVE_DIR"
echo "URL: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop"
echo ""

cd "$PROJECT_ROOT"
python3 -m http.server 8000 --directory build/site
