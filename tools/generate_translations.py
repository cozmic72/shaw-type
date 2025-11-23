#!/usr/bin/env python3
"""
Generate Shavian transliterations from Latin source files.
Uses the 'shave' tool with custom dictionary to create British and American variants.
"""

import csv
import json
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
SITE_DIR = SCRIPT_DIR.parent / "site"
DICT_FILE = SCRIPT_DIR / "shaw-type.dict"


def check_dependencies():
    """Check if required tools are installed."""
    # Check for shave - try the ~/bin location first since that's where it usually is
    home_bin_shave = Path.home() / "bin" / "shave"
    if home_bin_shave.exists():
        return str(home_bin_shave)

    # Otherwise check PATH
    import shutil
    shave_path = shutil.which("shave")
    if shave_path:
        return shave_path

    print("Error: 'shave' tool not found. Please install it first.")
    print(f"  Looked in: {home_bin_shave} and PATH")
    sys.exit(1)


def transliterate_text(text, dialect, shave_cmd):
    """
    Transliterate text using the shave tool.

    Args:
        text: The text to transliterate
        dialect: 'british' or 'american'
        shave_cmd: Path to shave executable

    Returns:
        The transliterated text
    """
    flag = "--readlex-british" if dialect == "british" else "--readlex-american"

    try:
        result = subprocess.run(
            [shave_cmd, flag, str(DICT_FILE)],
            input=text,
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"Error transliterating text: {e}")
        print(f"stderr: {e.stderr}")
        return text  # Return original on error


def transliterate_csv(input_file, output_british, output_american, shave_cmd):
    """
    Transliterate a CSV file, preserving keys and transliterating values.
    Creates both British and American JSON output files.

    Args:
        input_file: Path to input CSV file
        output_british: Path to British JSON output file
        output_american: Path to American JSON output file
        shave_cmd: Path to shave executable
    """
    print(f"  Processing {input_file.name}...")

    # Read the CSV file
    keys = []
    values = []

    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            keys.append(row['key'])
            values.append(row['value'])

    # Batch transliterate all values at once (much faster!)
    all_values_text = '\n'.join(values)

    # British
    result = subprocess.run(
        [shave_cmd, "--readlex-british", str(DICT_FILE)],
        input=all_values_text,
        capture_output=True,
        text=True
    )
    british_values = result.stdout.strip().split('\n')

    # American
    result = subprocess.run(
        [shave_cmd, "--readlex-american", str(DICT_FILE)],
        input=all_values_text,
        capture_output=True,
        text=True
    )
    american_values = result.stdout.strip().split('\n')

    # Combine keys with transliterated values
    translations_british = dict(zip(keys, british_values))
    translations_american = dict(zip(keys, american_values))

    # Save British translations
    with open(output_british, 'w', encoding='utf-8') as f:
        json.dump(translations_british, f, ensure_ascii=False, indent=2)
    print(f"    ✓ Saved {output_british.name}")

    # Save American translations
    with open(output_american, 'w', encoding='utf-8') as f:
        json.dump(translations_american, f, ensure_ascii=False, indent=2)
    print(f"    ✓ Saved {output_american.name}")


def transliterate_html(input_file, output_british, output_american, shave_cmd):
    """
    Transliterate an HTML file for both British and American dialects.

    Args:
        input_file: Path to input HTML file
        output_british: Path to British HTML output file
        output_american: Path to American HTML output file
        shave_cmd: Path to shave executable
    """
    print(f"  Processing {input_file.name}...")

    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # British
    result = subprocess.run(
        [shave_cmd, "--readlex-british", str(DICT_FILE)],
        input=content,
        capture_output=True,
        text=True
    )
    with open(output_british, 'w', encoding='utf-8') as f:
        f.write(result.stdout)
    print(f"    ✓ Saved {output_british.name}")

    # American
    result = subprocess.run(
        [shave_cmd, "--readlex-american", str(DICT_FILE)],
        input=content,
        capture_output=True,
        text=True
    )
    with open(output_american, 'w', encoding='utf-8') as f:
        f.write(result.stdout)
    print(f"    ✓ Saved {output_american.name}")


def main():
    """Main function."""
    print("Generating Shavian transliterations...")

    shave_cmd = check_dependencies()

    if not DICT_FILE.exists():
        print(f"Error: Dictionary file not found at {DICT_FILE}")
        sys.exit(1)

    # Process CSV translations
    print("\nGenerating JSON translations from CSV:")
    csv_file = SITE_DIR / "translations.csv"

    if csv_file.exists():
        transliterate_csv(
            csv_file,
            SITE_DIR / "translations_british.json",
            SITE_DIR / "translations_american.json",
            shave_cmd
        )
    else:
        print(f"  Error: {csv_file} not found!")
        sys.exit(1)

    # Process HTML content files
    print("\nChecking for HTML content files to transliterate:")

    html_files = [
        ("about_latin.html", "about_british.html", "about_american.html"),
        ("keyboards_latin.html", "keyboards_british.html", "keyboards_american.html"),
        ("resources_latin.html", "resources_british.html", "resources_american.html")
    ]

    for latin_name, british_name, american_name in html_files:
        latin_path = SITE_DIR / latin_name
        british_path = SITE_DIR / british_name
        american_path = SITE_DIR / american_name

        if latin_path.exists():
            transliterate_html(latin_path, british_path, american_path, shave_cmd)
        else:
            print(f"  {latin_name} not found (skipping)")

    print("\n✅ Translation generation complete!")
    print("Generated files:")
    print(f"  - {SITE_DIR / 'translations_british.json'}")
    print(f"  - {SITE_DIR / 'translations_american.json'}")


if __name__ == "__main__":
    main()
