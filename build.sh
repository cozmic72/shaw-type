#!/bin/bash
#
# Build script for Shaw Type
# Deploys site/ to build/site/ with version replacement
#

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Default values
VERSION=""
OUTPUT_DIR="build/site"

# Help function
show_help() {
    cat << EOF
Usage: ./build.sh [OPTIONS]

Build Shaw Type by deploying site/ to output directory with version replacement.

OPTIONS:
    -h, --help                  Show this help message and exit
    -v, --version VERSION       Specify version number (if not provided, reads from current-version file)
    -o, --output-directory DIR  Specify output directory (default: build/site)

EXAMPLES:
    ./build.sh                              # Use current-version, output to build/site/
    ./build.sh -v 2.0.2                     # Use version 2.0.2, output to build/site/
    ./build.sh -v 2.0.2 -o dist/            # Use version 2.0.2, output to dist/
    ./build.sh --version 2.0.3 --output-directory production/

EOF
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -v|--version)
            VERSION="$2"
            shift 2
            ;;
        -o|--output-directory)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        *)
            echo "Error: Unknown option: $1"
            echo "Run './build.sh --help' for usage information"
            exit 1
            ;;
    esac
done

# Get version from current-version file if not specified
if [ -z "$VERSION" ]; then
    if [ -f "current-version" ]; then
        VERSION=$(cat current-version)
        echo "Using version from current-version: $VERSION"
    else
        echo "Error: No version specified and current-version file not found"
        echo "Use -v/--version to specify a version, or create a current-version file"
        echo "Run './build.sh --help' for usage information"
        exit 1
    fi
fi

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
