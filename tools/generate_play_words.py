#!/usr/bin/env python3
"""
Generate word lists for Play mode organized by word length.
"""

import json


def generate_play_words(word_freq_file, output_file, dialect='gb'):
    """
    Generate words organized by length for play mode.
    """
    # Load all words
    all_words = []
    with open(word_freq_file, 'r', encoding='utf-8') as f:
        for line in f:
            parts = line.strip().split()
            if len(parts) >= 2:
                word = parts[0]
                all_words.append(word)

    print(f"\nGenerating play words for {dialect.upper()} English:")
    print(f"  Loaded {len(all_words)} words from frequency file")

    # Organize by length (count actual Unicode characters, not bytes)
    words_by_length = {}
    for word in all_words:
        length = len(list(word))  # Count Unicode characters
        if length not in words_by_length:
            words_by_length[length] = []
        words_by_length[length].append(word)

    # Create output structure with top words for each length (1-10 characters, capped)
    MAX_WORD_LENGTH = 10
    output = {}
    for length in range(1, MAX_WORD_LENGTH + 1):
        if length in words_by_length:
            # Take top 200 by frequency
            output[str(length)] = words_by_length[length][:200]
            print(f"  Length {length}: {len(output[str(length)])} words")
        else:
            output[str(length)] = []
            print(f"  Length {length}: 0 words")

    # Save to JSON
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"  Saved to {output_file}")


if __name__ == '__main__':
    # Generate for both GB and US dialects
    for dialect in ['gb', 'us']:
        word_freq_file = f'shavian-{dialect}-word-frequencies.txt'
        output_file = f'../site/words_{dialect}.json'

        print(f"\n{'='*60}")
        print(f"Generating play mode words for {dialect.upper()} English")
        print(f"{'='*60}")

        generate_play_words(word_freq_file, output_file, dialect)
