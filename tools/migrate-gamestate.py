#!/usr/bin/env python3
"""
Migrate legacy global variables to gameState object in main.js
"""

import re

# Variables to migrate (variable name -> gameState property name)
MIGRATIONS = {
    'currentLevelWordPool': 'currentLevelWordPool',
    'currentLevelWordCount': 'currentLevelWordCount',
    'currentLevelTitle': 'currentLevelTitle',
    'currentLevelType': 'currentLevelType',
    'currentLevelTypeLabel': 'currentLevelTypeLabel',
    'currentLevelNumber': 'currentLevelNumber',
    'currentLevelCompletionCallback': 'currentLevelCompletionCallback',
    'wordsCompleted': 'wordsCompleted',
    'wordsInCurrentLevel': 'wordsInCurrentLevel',
    'totalLettersTyped': 'totalLettersTyped',
    'correctLetters': 'correctLetters',
    'startTime': 'startTime',
    'pauseStartTime': 'pauseStartTime',
    'totalPausedTime': 'totalPausedTime',
    'highScores': 'highScores',
    'levelStats': 'levelStats',
    'currentLevelLettersTyped': 'currentLevelLettersTyped',
    'currentLevelCorrectLetters': 'currentLevelCorrectLetters',
}

def migrate_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Step 1: Remove legacy variable declarations
    new_lines = []
    skip_line = False
    for line in lines:
        # Skip lines that declare the variables we're migrating
        # But DON'T skip if it's already been converted to gameState.property
        if re.match(r'let (gameState\.)', line):
            # This is a broken declaration from previous run - skip it
            continue

        # Check if this line declares one of our migration variables
        is_declaration = False
        for var_name in MIGRATIONS.keys():
            if re.match(rf'^let {re.escape(var_name)}\s*=', line):
                is_declaration = True
                break

        if not is_declaration:
            new_lines.append(line)

    content = ''.join(new_lines)

    # Step 2: Replace all usages of legacy variables with gameState.property
    for var_name, property_name in MIGRATIONS.items():
        # Use word boundary to match whole words only
        # But NOT if it's already preceded by gameState.
        pattern = r'(?<!gameState\.)(?<!\.)\b' + re.escape(var_name) + r'\b'
        replacement = f'gameState.{property_name}'
        content = re.sub(pattern, replacement, content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"✓ Migrated {filepath}")
    return True

if __name__ == '__main__':
    import sys
    filepath = sys.argv[1] if len(sys.argv) > 1 else 'site/main.js'
    migrate_file(filepath)
