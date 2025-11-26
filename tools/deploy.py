#!/usr/bin/env python3
"""
Deploy script for Shaw Type
Copies site/ directory to build output, replacing {{VERSION}} placeholders
in both HTML and JSON files.

Usage:
    python deploy.py <version> [output_dir]

Examples:
    python deploy.py 2.0.1                  # Deploys to build/site/
    python deploy.py 2.0.1 dist/            # Deploys to dist/
"""

import sys
import os
import shutil
from pathlib import Path

def deploy(version, build_number, output_dir='build/site'):
    """Deploy files with the specified version and build number to output directory."""
    project_root = Path(__file__).parent.parent
    site_dir = project_root / 'site'
    output_path = project_root / output_dir

    # Ensure source directory exists
    if not site_dir.exists():
        print(f"Error: Site directory not found: {site_dir}")
        return 1

    # Create output directory (remove if exists)
    if output_path.exists():
        print(f"Removing existing output directory: {output_path}")
        shutil.rmtree(output_path)

    output_path.mkdir(parents=True, exist_ok=True)

    full_version = f"{version}-b{build_number}"
    print(f"Deploying Shaw Type v{version} (build {build_number})")
    print(f"  Source: {site_dir}")
    print(f"  Output: {output_path}")
    print(f"  Full version: {full_version}")
    print()

    # Track statistics
    stats = {
        'html': 0,
        'json': 0,
        'js': 0,
        'other': 0
    }

    # Walk through site directory
    for source_file in site_dir.rglob('*'):
        if source_file.is_file():
            # Calculate relative path
            rel_path = source_file.relative_to(site_dir)
            dest_file = output_path / rel_path

            # Create parent directory if needed
            dest_file.parent.mkdir(parents=True, exist_ok=True)

            # Process based on file type
            if source_file.suffix == '.html':
                # Read HTML file
                with open(source_file, 'r', encoding='utf-8') as f:
                    content = f.read()

                # Replace version placeholders
                content = content.replace('{{FULL_VERSION}}', full_version)
                content = content.replace('{{VERSION}}', version)
                content = content.replace('{{BUILD_NUMBER}}', build_number)

                # Write to output
                with open(dest_file, 'w', encoding='utf-8') as f:
                    f.write(content)

                stats['html'] += 1
                print(f"  ✓ {rel_path}")

            elif source_file.suffix == '.json':
                # Read JSON file
                with open(source_file, 'r', encoding='utf-8') as f:
                    content = f.read()

                # Replace version placeholders in JSON (quoted)
                content = content.replace('"{{FULL_VERSION}}"', f'"{full_version}"')
                content = content.replace('"{{VERSION}}"', f'"{version}"')
                content = content.replace('"{{BUILD_NUMBER}}"', f'"{build_number}"')

                # Write to output
                with open(dest_file, 'w', encoding='utf-8') as f:
                    f.write(content)

                stats['json'] += 1
                print(f"  ✓ {rel_path}")

            elif source_file.suffix == '.js':
                # Read JavaScript file
                with open(source_file, 'r', encoding='utf-8') as f:
                    content = f.read()

                # Replace version placeholders
                content = content.replace('{{FULL_VERSION}}', full_version)
                content = content.replace('{{VERSION}}', version)
                content = content.replace('{{BUILD_NUMBER}}', build_number)

                # Write to output
                with open(dest_file, 'w', encoding='utf-8') as f:
                    f.write(content)

                stats['js'] += 1
                print(f"  ✓ {rel_path}")

            else:
                # Copy other files as-is
                shutil.copy2(source_file, dest_file)
                stats['other'] += 1

    print()
    print(f"Deployed {stats['html']} HTML files, {stats['js']} JS files, "
          f"{stats['json']} JSON files, {stats['other']} other files")

    # Write version to file for tracking
    version_file = output_path / '.version'
    with open(version_file, 'w', encoding='utf-8') as f:
        f.write(version)
    print(f"  ✓ Version written to {version_file.name}")

    print()
    print("✅ Deployment complete!")
    print()
    print(f"To test: python3 -m http.server 8000 --directory {output_path}")

    return 0

def read_version_file():
    """Read version and build number from current-version file."""
    project_root = Path(__file__).parent.parent
    version_file = project_root / 'current-version'

    try:
        with open(version_file, 'r') as f:
            lines = f.read().strip().split('\n')
            version = lines[0].strip()
            build_number = lines[1].strip() if len(lines) > 1 else '1'
            return version, build_number
    except (FileNotFoundError, IndexError):
        print(f"Error: Could not read version from {version_file}")
        print("Expected format:")
        print("  Line 1: version (e.g., 2.1)")
        print("  Line 2: build number (e.g., 1)")
        sys.exit(1)


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Deploy Shaw Type with version replacement')
    parser.add_argument('-v', '--version', help='Version number (default: read from current-version file)')
    parser.add_argument('-b', '--build-number', help='Build number (default: read from current-version file)')
    parser.add_argument('-o', '--output-dir', default='build/site', help='Output directory (default: build/site)')

    args = parser.parse_args()

    # Read from current-version file if not provided
    if args.version is None or args.build_number is None:
        file_version, file_build = read_version_file()
        version = args.version or file_version
        build_number = args.build_number or file_build
    else:
        version = args.version
        build_number = args.build_number

    return deploy(version, build_number, args.output_dir)

if __name__ == '__main__':
    sys.exit(main())
