#!/usr/bin/env python3
"""
Generate word lists for Play mode organized by word length.
Uses readlex.json as the source of truth for Shavian spellings.
"""

import json
from pathlib import Path


def is_shavian_only(word):
    """
    Check if a word contains only Shavian characters (U+10450 to U+1047F).
    Returns True if the word is purely Shavian, False otherwise.
    """
    for char in word:
        code_point = ord(char)
        # Check if character is in Shavian Unicode range
        if not (0x10450 <= code_point <= 0x1047F):
            return False
    return True


def load_readlex_words(readlex_file, dialect='gb'):
    """
    Load words from readlex.json and select appropriate variant.

    Args:
        readlex_file: Path to readlex.json
        dialect: 'gb' for British (RRP), 'us' for American (GenAm preferred)

    Returns:
        List of (shavian_word, frequency) tuples
    """
    with open(readlex_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    words = []
    variant_pref = 'GenAm' if dialect == 'us' else 'RRP'

    for key, entries in data.items():
        # Select the appropriate variant
        selected_entry = None

        # First, try to find preferred variant
        for entry in entries:
            if entry.get('var') == variant_pref:
                selected_entry = entry
                break

        # If no preferred variant found (or we're looking for GB), use RRP
        if selected_entry is None:
            for entry in entries:
                if entry.get('var') == 'RRP':
                    selected_entry = entry
                    break

        # Fallback to first entry if nothing else matches
        if selected_entry is None and len(entries) > 0:
            selected_entry = entries[0]

        if selected_entry:
            shaw_word = selected_entry.get('Shaw', '')
            freq = selected_entry.get('freq', 0)

            # Only include if it's purely Shavian
            if shaw_word and is_shavian_only(shaw_word):
                words.append((shaw_word, freq))

    return words


def generate_play_words(readlex_file, output_file, dialect='gb'):
    """
    Generate words organized by length for play mode.

    Args:
        readlex_file: Path to readlex.json
        output_file: Path to output JSON file
        dialect: 'gb' or 'us'
    """
    words = load_readlex_words(readlex_file, dialect)

    print(f"\nGenerating play words for {dialect.upper()} English:")
    print(f"  Loaded {len(words)} words from readlex")

    # Sort by frequency (descending)
    words.sort(key=lambda x: x[1], reverse=True)

    # Organize by length (count actual Unicode characters, not bytes)
    words_by_length = {}
    for shaw_word, freq in words:
        length = len(list(shaw_word))  # Count Unicode characters
        if length not in words_by_length:
            words_by_length[length] = []
        words_by_length[length].append(shaw_word)

    # Create output structure with top words for each length (1-10 characters)
    MAX_WORD_LENGTH = 10
    MAX_WORDS_PER_LENGTH = 200

    output = {}
    for length in range(1, MAX_WORD_LENGTH + 1):
        if length in words_by_length:
            # Take top N by frequency
            output[str(length)] = words_by_length[length][:MAX_WORDS_PER_LENGTH]
            print(f"  Length {length}: {len(output[str(length)])} words")
        else:
            output[str(length)] = []
            print(f"  Length {length}: 0 words")

    # Save to JSON
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"  Saved to {output_file}")


if __name__ == '__main__':
    # Paths
    script_dir = Path(__file__).parent
    project_dir = script_dir.parent
    readlex_file = project_dir / 'readlex' / 'readlex.json'

    if not readlex_file.exists():
        print(f"Error: readlex.json not found at {readlex_file}")
        print("Make sure the readlex submodule is initialized:")
        print("  git submodule update --init --recursive")
        exit(1)

    # Generate for both GB and US dialects
    for dialect in ['gb', 'us']:
        output_file = project_dir / 'site' / f'words_{dialect}.json'

        print(f"\n{'='*60}")
        print(f"Generating play mode words for {dialect.upper()} English")
        print(f"{'='*60}")

        generate_play_words(readlex_file, output_file, dialect)

    print(f"\n{'='*60}")
    print("✅ Play word generation complete!")
    print(f"{'='*60}\n")
