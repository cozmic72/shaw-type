// InputHandler - Manages input state and ligature formation
class InputHandler {
    constructor() {
        this.shadowInput = '';
        this.previousInput = '';
        this.maxEffectiveLength = 0;
        this.isInErrorState = false;
        this.lastAutoLigatureComponents = [];
        this.justSplitLigature = false;
        this.pendingReplacementStart = -1;
        this.pendingReplacementEnd = -1;
    }

    // Clear all input state
    clearState() {
        this.shadowInput = '';
        this.previousInput = '';
        this.maxEffectiveLength = 0;
        this.isInErrorState = false;
        this.lastAutoLigatureComponents = [];
        this.justSplitLigature = false;
    }

    // Get current shadow input
    getShadowInput() {
        return this.shadowInput;
    }

    // Set shadow input
    setShadowInput(value) {
        this.shadowInput = value;
    }

    // Convert string to array of Unicode code points for debugging
    toCodePoints(str) {
        return Array.from(str).map(c =>
            'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')
        ).join(' ');
    }

    // Normalize character array to merge VS1 with preceding character
    // Converts ['𐑻', '︀', '𐑮'] to ['𐑻︀', '𐑮']
    normalizeCharArray(chars) {
        const VS1 = '\uFE00';
        const result = [];
        for (let i = 0; i < chars.length; i++) {
            const char = chars[i];
            // Check if this is VS1 and we have a previous character
            if (char === VS1 && result.length > 0) {
                // Merge VS1 with the previous character
                result[result.length - 1] = result[result.length - 1] + VS1;
            } else {
                result.push(char);
            }
        }
        return result;
    }

    // Form ligatures in input string if enabled
    formLigatures(input, ligaturesActive, componentToLigature, debugFn) {
        // Don't re-form if we just split a ligature
        if (this.justSplitLigature) {
            this.justSplitLigature = false;
            return input;
        }

        if (!ligaturesActive) {
            this.lastAutoLigatureComponents = [];
            return input;
        }

        const chars = Array.from(input);

        // Normalize to treat base+VS1 as single units
        const normalizedChars = this.normalizeCharArray(chars);

        // Check if last 2 normalized characters form a ligature
        if (normalizedChars.length >= 2) {
            const lastTwo = normalizedChars[normalizedChars.length - 2] + normalizedChars[normalizedChars.length - 1];
            if (debugFn) {
                debugFn('🔗 LIGATURE CHECK: lastTwo="' + lastTwo + '" [' + this.toCodePoints(lastTwo) + ']' +
                      ' | maps to: ' + (componentToLigature[lastTwo] || 'none'));
            }
            if (componentToLigature[lastTwo]) {
                const result = normalizedChars.slice(0, -2).join('') + componentToLigature[lastTwo];
                if (debugFn) {
                    debugFn('✅ LIGATURE FORMED: "' + result + '" [' + this.toCodePoints(result) + ']');
                }
                // Track components for backspace splitting
                this.lastAutoLigatureComponents = [
                    normalizedChars[normalizedChars.length - 2],
                    normalizedChars[normalizedChars.length - 1]
                ];
                return result;
            }
        }

        this.lastAutoLigatureComponents = [];
        return input;
    }

    // Check if last character is a pending ligature start
    isPendingLigatureStart(inputChars, wordChars, ligaturesActive, ligatures) {
        if (!ligaturesActive || inputChars.length === 0) return false;

        // Normalize arrays to treat char+VS1 as single units
        const normalizedInput = this.normalizeCharArray(inputChars);
        const normalizedWord = this.normalizeCharArray(wordChars);

        const lastIdx = normalizedInput.length - 1;
        if (lastIdx >= normalizedWord.length) return false;

        const expectedChar = normalizedWord[lastIdx];
        const lastChar = normalizedInput[lastIdx];

        // Check if the last character is the first of any pair that forms the expected ligature
        if (ligatures[expectedChar]) {
            return ligatures[expectedChar].some(pair => pair[0] === lastChar);
        }

        return false;
    }

    // Update shadow input based on InputEvent
    // Returns the updated shadow input string
    updateShadowInput(inputType, eventData, browserValue, debugFn) {
        const VS1 = '\uFE00';

        switch (inputType) {
            case 'insertText':
                // Normal typing - append what was actually typed (preserves VS1)
                return this.shadowInput + (eventData || '');

            case 'deleteContentBackward':
                // Backspace - check if last character was auto-formed ligature
                const chars = Array.from(this.shadowInput); // Split into code points
                if (chars.length === 0) return '';

                // If last character was auto-formed ligature, split it back to components
                if (this.lastAutoLigatureComponents.length > 0 && chars.length > 0) {
                    const normalizedChars = this.normalizeCharArray(chars);
                    const result = normalizedChars.slice(0, -1).join('') + this.lastAutoLigatureComponents.join('');
                    this.lastAutoLigatureComponents = []; // Clear the flag
                    this.justSplitLigature = true; // Prevent re-forming this ligature
                    return result;
                }

                // Check if last code point is VS1 (U+FE00)
                if (chars.length >= 2 && chars[chars.length - 1].codePointAt(0) === 0xFE00) {
                    // Last code point is VS1, delete both base character and VS1
                    this.lastAutoLigatureComponents = []; // Clear flag on any deletion
                    this.justSplitLigature = false;
                    return chars.slice(0, -2).join('');
                }

                // Normal deletion - remove last code point
                this.lastAutoLigatureComponents = []; // Clear flag on any deletion
                this.justSplitLigature = false;
                return chars.slice(0, -1).join('');

            case 'deleteContentForward':
                // Delete key - remove first character (shouldn't happen in our UI)
                this.lastAutoLigatureComponents = [];
                this.justSplitLigature = false;
                const charsForward = Array.from(this.shadowInput);
                return charsForward.slice(1).join('');

            case 'insertReplacementText':
                // Safari uses this for ligature formation from virtual keyboard
                // Use the replacement range captured from beforeinput event
                this.lastAutoLigatureComponents = [];
                this.justSplitLigature = false;
                if (this.pendingReplacementStart >= 0 && this.pendingReplacementEnd >= 0) {
                    const chars = Array.from(this.shadowInput);
                    const before = chars.slice(0, this.pendingReplacementStart).join('');
                    const after = chars.slice(this.pendingReplacementEnd).join('');
                    const result = before + (eventData || '') + after;
                    this.pendingReplacementStart = -1;
                    this.pendingReplacementEnd = -1;
                    return result;
                }
                // Fall back to browser value if no replacement range
                return browserValue || this.shadowInput;

            default:
                // Other input types - sync with browser's value
                this.lastAutoLigatureComponents = [];
                this.justSplitLigature = false;
                return browserValue || this.shadowInput;
        }
    }

    // Handle beforeinput event (captures replacement range)
    handleBeforeInput(e) {
        if (e.inputType === 'insertReplacementText' && e.getTargetRanges) {
            const ranges = e.getTargetRanges();
            if (ranges && ranges.length > 0) {
                const range = ranges[0];
                this.pendingReplacementStart = range.startOffset;
                this.pendingReplacementEnd = range.endOffset;
            }
        }
    }
}
