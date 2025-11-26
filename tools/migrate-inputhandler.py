#!/usr/bin/env python3
"""
Migrate input-related code to use InputHandler class.
"""

import re
import sys

def migrate_file(file_path):
    """Migrate a JavaScript file to use InputHandler class."""

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # Step 1: Add inputHandler instance after gameState declaration
    # Find: let gameState = new GameState();
    # Add after it: let inputHandler = new InputHandler();
    content = re.sub(
        r'(let gameState = new GameState\(\);)',
        r'\1\nlet inputHandler = new InputHandler();',
        content,
        count=1
    )

    # Step 2: Remove old variable declarations
    # Remove lines like: let shadowInput = '';
    content = re.sub(r'^let shadowInput = .*?;?\n', '', content, flags=re.MULTILINE)
    content = re.sub(r'^let pendingReplacementStart = .*?;?\n', '', content, flags=re.MULTILINE)
    content = re.sub(r'^let pendingReplacementEnd = .*?;?\n', '', content, flags=re.MULTILINE)
    content = re.sub(r'^let previousInput = .*?;?\n', '', content, flags=re.MULTILINE)
    content = re.sub(r'^let maxEffectiveLength = .*?;?\n', '', content, flags=re.MULTILINE)
    content = re.sub(r'^let isInErrorState = .*?;?\n', '', content, flags=re.MULTILINE)
    content = re.sub(r'^let lastAutoLigatureComponents = .*?;?\n', '', content, flags=re.MULTILINE)
    content = re.sub(r'^let justSplitLigature = .*?;?\n', '', content, flags=re.MULTILINE)

    # Step 3: Remove old function definitions
    # Remove clearInputState function
    content = re.sub(
        r'^// Helper: Clear all input state variables\n'
        r'function clearInputState\(\) \{[^}]*\}\n+',
        '',
        content,
        flags=re.MULTILINE | re.DOTALL
    )

    # Remove formLigatures function
    content = re.sub(
        r'^// Helper: Form ligatures in input string if enabled\n'
        r'function formLigatures\(input\) \{.*?\n\}\n+',
        '',
        content,
        flags=re.MULTILINE | re.DOTALL
    )

    # Remove normalizeCharArray function
    content = re.sub(
        r'^// Helper: Normalize character array to merge VS1 with preceding character\n'
        r'// Converts.*?\n'
        r'function normalizeCharArray\(chars\) \{.*?\n\}\n+',
        '',
        content,
        flags=re.MULTILINE | re.DOTALL
    )

    # Remove isPendingLigatureStart function
    content = re.sub(
        r'^// Helper: Check if last character is a pending ligature start\n'
        r'function isPendingLigatureStart\(inputChars, wordChars\) \{.*?\n\}\n+',
        '',
        content,
        flags=re.MULTILINE | re.DOTALL
    )

    # Remove updateShadowInput function
    content = re.sub(
        r'^// Helper: Update shadow input based on InputEvent\n'
        r'// Returns the updated shadow input string\n'
        r'// browserValue is what.*?\n'
        r'function updateShadowInput\(inputType, eventData, currentShadow, browserValue\) \{.*?^\}\n+',
        '',
        content,
        flags=re.MULTILINE | re.DOTALL
    )

    # Step 4: Replace function calls
    # clearInputState() -> inputHandler.clearState() + typingInput.value = ''
    content = re.sub(
        r'clearInputState\(\)',
        "typingInput.value = ''; inputHandler.clearState()",
        content
    )

    # formLigatures(input) -> inputHandler.formLigatures(input, areLigaturesActive(), getCurrentComponentToLigature(), debug)
    content = re.sub(
        r'formLigatures\(([^)]+)\)',
        r'inputHandler.formLigatures(\1, areLigaturesActive(), getCurrentComponentToLigature(), debug)',
        content
    )

    # isPendingLigatureStart(a, b) -> inputHandler.isPendingLigatureStart(a, b, areLigaturesActive(), getCurrentLayoutLigatures())
    content = re.sub(
        r'isPendingLigatureStart\(([^,]+),\s*([^)]+)\)',
        r'inputHandler.isPendingLigatureStart(\1, \2, areLigaturesActive(), getCurrentLayoutLigatures())',
        content
    )

    # updateShadowInput(...) -> inputHandler.updateShadowInput(...)
    # First, handle the case where it's assigned: shadowInput = updateShadowInput(...)
    content = re.sub(
        r'shadowInput = updateShadowInput\(',
        r'inputHandler.setShadowInput(inputHandler.updateShadowInput(',
        content
    )
    # Then add closing paren - but this is tricky, let's handle manually

    # Step 5: Replace variable references
    # shadowInput (read access) -> inputHandler.getShadowInput()
    # This is tricky - need to distinguish read from write
    # Let's do writes first, then reads

    # shadowInput = value -> inputHandler.setShadowInput(value)
    content = re.sub(
        r'\bshadowInput\s*=\s*([^;]+);',
        r'inputHandler.setShadowInput(\1);',
        content
    )

    # shadowInput (read) -> inputHandler.getShadowInput()
    # But avoid replacing inside strings and comments
    content = re.sub(
        r'\bshadowInput\b',
        r'inputHandler.getShadowInput()',
        content
    )

    # previousInput = value -> inputHandler.previousInput = value
    content = re.sub(
        r'\bpreviousInput\s*=',
        r'inputHandler.previousInput =',
        content
    )
    content = re.sub(
        r'\bpreviousInput\b',
        r'inputHandler.previousInput',
        content
    )

    # maxEffectiveLength = value -> inputHandler.maxEffectiveLength = value
    content = re.sub(
        r'\bmaxEffectiveLength\s*=',
        r'inputHandler.maxEffectiveLength =',
        content
    )
    content = re.sub(
        r'\bmaxEffectiveLength\b',
        r'inputHandler.maxEffectiveLength',
        content
    )

    # isInErrorState = value -> inputHandler.isInErrorState = value
    content = re.sub(
        r'\bisInErrorState\s*=',
        r'inputHandler.isInErrorState =',
        content
    )
    content = re.sub(
        r'\bisInErrorState\b',
        r'inputHandler.isInErrorState',
        content
    )

    # pendingReplacementStart/End - these are handled internally by InputHandler
    # So we can remove references to them (they're used in updateShadowInput which is now in the class)

    # Write the migrated content
    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ Migrated {file_path}")
        return True
    else:
        print(f"⚠️  No changes made to {file_path}")
        return False

def main():
    if len(sys.argv) < 2:
        print("Usage: migrate-inputhandler.py <file>")
        sys.exit(1)

    file_path = sys.argv[1]
    migrate_file(file_path)

if __name__ == '__main__':
    main()
