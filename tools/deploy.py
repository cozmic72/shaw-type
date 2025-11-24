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
    sources_dir = project_root / 'sources'
    site_dir = project_root / 'site'

    # Ensure directories exist
    if not sources_dir.exists():
        print(f"Error: Sources directory not found: {sources_dir}")
        return 1

    if not site_dir.exists():
        print(f"Error: Site directory not found: {site_dir}")
        return 1

    # Process index.html.template
    template_file = sources_dir / 'index.html.template'
    output_file = site_dir / 'index.html'

    if not template_file.exists():
        print(f"Error: Template file not found: {template_file}")
        return 1

    print(f"Deploying version {version}...")

    # Read template
    with open(template_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replace version placeholder
    content = content.replace('{{VERSION}}', version)

    # Write output
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"✓ Deployed {template_file.name} → {output_file.name}")
    print(f"  Version: {version}")

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
