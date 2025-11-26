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
BUILD_NUMBER=""
OUTPUT_DIR="build/site"

# Help function
show_help() {
    cat << EOF
Usage: ./build.sh [OPTIONS]

Build Shaw Type by deploying site/ to output directory with version replacement.

OPTIONS:
    -h, --help                  Show this help message and exit
    -v, --version VERSION       Specify version number (if not provided, reads from current-version file)
    -b, --build-number NUMBER   Specify build number (if not provided, reads from current-version file)
    -o, --output-directory DIR  Specify output directory (default: build/site)

EXAMPLES:
    ./build.sh                              # Use current-version (both lines), output to build/site/
    ./build.sh -v 2.0.2                     # Use version 2.0.2, build from file, output to build/site/
    ./build.sh -v 2.0.2 -b 5                # Use version 2.0.2 build 5, output to build/site/
    ./build.sh -b 5                         # Use version from file, build 5
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
        -b|--build-number)
            BUILD_NUMBER="$2"
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

# Read from current-version file if not specified
if [ -z "$VERSION" ] || [ -z "$BUILD_NUMBER" ]; then
    if [ -f "current-version" ]; then
        if [ -z "$VERSION" ]; then
            VERSION=$(head -n 1 current-version)
            echo "Using version from current-version: $VERSION"
        fi
        if [ -z "$BUILD_NUMBER" ]; then
            BUILD_NUMBER=$(sed -n '2p' current-version)
            # Default to 1 if second line doesn't exist
            if [ -z "$BUILD_NUMBER" ]; then
                BUILD_NUMBER="1"
            fi
            echo "Using build number from current-version: $BUILD_NUMBER"
        fi
    else
        echo "Error: No version/build specified and current-version file not found"
        echo "Use -v/--version and -b/--build-number, or create a current-version file"
        echo "Run './build.sh --help' for usage information"
        exit 1
    fi
fi

echo "=========================================="
echo "Building Shaw Type v${VERSION} (build ${BUILD_NUMBER})"
echo "Output: ${OUTPUT_DIR}"
echo "=========================================="
echo

# Deploy: copy site/ to output directory with version replacement
python3 tools/deploy.py -v "${VERSION}" -b "${BUILD_NUMBER}" -o "${OUTPUT_DIR}"

echo "=========================================="
echo "Build Complete!"
echo "=========================================="
echo
echo "Output directory: ${OUTPUT_DIR}"
echo "Run 'python3 -m http.server 8000 --directory ${OUTPUT_DIR}' to test"
