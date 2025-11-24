#!/usr/bin/env python3
"""
Deploy script for Shaw Type
Replaces {{VERSION}} placeholder in template files with actual version number
and copies to the site directory.
"""

import sys
import os
from pathlib import Path

def deploy(version):
    """Deploy files with the specified version."""
    project_root = Path(__file__).parent.parent
    content_dir = project_root / 'content'
    site_dir = project_root / 'site'

    # Ensure directories exist
    if not content_dir.exists():
        print(f"Error: Content directory not found: {content_dir}")
        return 1

    if not site_dir.exists():
        print(f"Error: Site directory not found: {site_dir}")
        return 1

    print(f"Deploying version {version}...")
    print()

    # Process index.html
    template_file = content_dir / 'index.html'
    output_file = site_dir / 'index.html'

    if not template_file.exists():
        print(f"Error: Template file not found: {template_file}")
        return 1

    # Read template
    with open(template_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replace version placeholder
    content = content.replace('{{VERSION}}', version)

    # Write output
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"✓ Deployed {template_file.name} → {output_file}")

    # Process content/*.html files - deploy to site/*_latin.html
    # (transliteration tool will read these and create _gb and _us versions)
    # Skip index.html since it's already processed above
    # Special case: virtual-keyboard.html is deployed directly without _latin suffix
    if content_dir.exists():
        html_files = list(content_dir.glob('*.html'))
        for source_file in html_files:
            # Skip index.html - already processed
            if source_file.name == 'index.html':
                continue

            # Read source
            with open(source_file, 'r', encoding='utf-8') as f:
                content = f.read()

            # Replace version placeholder
            content = content.replace('{{VERSION}}', version)

            # Special case: virtual-keyboard.html is deployed directly (no _latin suffix)
            if source_file.name == 'virtual-keyboard.html':
                output_file = site_dir / source_file.name
                with open(output_file, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"✓ Deployed {source_file.name} → {output_file.name}")
            else:
                # Write to site/*_latin.html
                base_name = source_file.stem
                output_file = site_dir / f"{base_name}_latin.html"
                with open(output_file, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"✓ Deployed {source_file.name} → {output_file.name}")

    print()
    print(f"Version: {version}")

    return 0

def main():
    if len(sys.argv) != 2:
        print("Usage: python deploy.py <version>")
        print("Example: python deploy.py 2.0-beta-4")
        return 1

    version = sys.argv[1]
    return deploy(version)

if __name__ == '__main__':
    sys.exit(main())
