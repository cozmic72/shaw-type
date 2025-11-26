#!/bin/bash
#
# Build script for Shaw Type
# Deploys site/ to build/site/ with version replacement
#
# Usage: ./build.sh [version] [output_dir]
# Examples:
#   ./build.sh                    # Uses version from current-version, builds to build/site/
#   ./build.sh 2.0.2              # Uses specified version, builds to build/site/
#   ./build.sh 2.0.2 dist/        # Uses specified version, builds to dist/

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Get version from argument or current-version file
if [ -n "$1" ]; then
    VERSION="$1"
    shift  # Remove first argument so $1 becomes output_dir if provided
else
    if [ -f "current-version" ]; then
        VERSION=$(cat current-version)
        echo "Using version from current-version: $VERSION"
    else
        echo "Error: No version specified and current-version file not found"
        echo "Usage: ./build.sh [version] [output_dir]"
        exit 1
    fi
fi

OUTPUT_DIR="${1:-build/site}"

echo "=========================================="
echo "Building Shaw Type v${VERSION}"
echo "Output: ${OUTPUT_DIR}"
echo "=========================================="
echo

# Deploy: copy site/ to output directory with version replacement
python3 tools/deploy.py "${VERSION}" "${OUTPUT_DIR}"

echo "=========================================="
echo "Build Complete!"
echo "=========================================="
echo
echo "Output directory: ${OUTPUT_DIR}"
echo "Run 'python3 -m http.server 8000 --directory ${OUTPUT_DIR}' to test"
