#!/usr/bin/env python3
"""
Post-transliteration correction tool for Shavian namer dots.
Reads from stdin, applies corrections from a mapping file, writes to stdout.
"""
import sys
import re
from pathlib import Path

def load_corrections(corrections_file):
    """Load corrections from a space-separated file."""
    corrections = {}
    if not corrections_file.exists():
        return corrections
    
    with open(corrections_file, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            parts = line.split(None, 1)  # Split on first whitespace
            if len(parts) == 2:
                wrong, correct = parts
                corrections[wrong] = correct
    
    return corrections

def apply_corrections(text, corrections):
    """Apply word-level corrections to text."""
    if not corrections:
        return text
    
    # Create a regex pattern that matches whole words from the corrections dict
    # Sort by length (longest first) to handle overlapping corrections properly
    patterns = sorted(corrections.keys(), key=len, reverse=True)
    pattern = '|'.join(re.escape(p) for p in patterns)
    
    if not pattern:
        return text
    
    # Replace using word boundaries
    def replacer(match):
        return corrections.get(match.group(0), match.group(0))
    
    return re.sub(pattern, replacer, text)

def main():
    script_dir = Path(__file__).parent
    corrections_file = script_dir / "namer-dots.txt"
    
    corrections = load_corrections(corrections_file)
    
    # Read from stdin, apply corrections, write to stdout
    for line in sys.stdin:
        corrected = apply_corrections(line, corrections)
        sys.stdout.write(corrected)

if __name__ == "__main__":
    main()
