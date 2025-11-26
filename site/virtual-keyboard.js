// Virtual Keyboard Functionality

// Physical keyboard detection for mobile devices
let hasPhysicalKeyboard = sessionStorage.getItem('hasPhysicalKeyboard') === 'true' ? true : null;

// Helper: Check if physical keyboard has been detected on mobile
function isPhysicalKeyboardDetected() {
    return hasPhysicalKeyboard === true;
}

// Initialize virtual keyboard - loads HTML and sets up
async function initVirtualKeyboard(containerElement, resourceVersion) {
    try {
        const response = await fetch(`virtual-keyboard.html?v=${resourceVersion}`);
        if (!response.ok) {
            console.error('Failed to load virtual keyboard HTML');
            return false;
        }
        const html = await response.text();
        containerElement.innerHTML = html;

        // Now that the HTML is loaded, make it draggable
        makeKeyboardDraggable();

        return true;
    } catch (error) {
        console.error('Error loading virtual keyboard:', error);
        return false;
    }
}

// Keyboard layouts - loaded from JSON
let KEYBOARD_MAPS = {};

// Load keyboard layouts from JSON (using versionedUrl from main script)
fetch(versionedUrl('keyboard_layouts.json'))
    .then(response => response.json())
    .then(data => {
        KEYBOARD_MAPS = data;
    })
    .catch(error => {
        console.error('Failed to load keyboard layouts:', error);
    });

// Helper: Execute function with input temporarily editable (removes readonly)
function withEditableInput(input, fn) {
    const wasReadonly = input.hasAttribute('readonly');
    if (wasReadonly) input.removeAttribute('readonly');
    try {
        fn();
    } finally {
        if (wasReadonly) input.setAttribute('readonly', 'readonly');
    }
}

// Helper: Set selection safely (ignores errors on readonly inputs)
function setSelectionSafe(input, pos) {
    try {
        input.setSelectionRange(pos, pos);
    } catch (e) {
        // Selection may fail on readonly/unfocused inputs - ignore
    }
}

// Helper: Dispatch input event
function dispatchInputEvent(input, type, data = null) {
    const event = new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: type,
        data: data
    });
    input.dispatchEvent(event);
}

// Translate input event data from Latin to Shavian if needed
// This is a decorator function that index.html can use
// Returns: { eventData: string, browserInput: string }
function translateInputEvent(e, browserInput, currentLayout, useVirtualKeyboard, debugFn) {
    let eventData = e.data || '';

    // Virtual keyboard: translate QWERTY input to Shavian if needed
    if (useVirtualKeyboard && e.inputType === 'insertText' && eventData.length > 0) {
        const layout = KEYBOARD_MAPS[currentLayout];
        const keyboardMap = layout ? layout.keys : null;
        if (keyboardMap) {
            // Check if the input data is a Latin character that needs translation
            const codePoint = eventData.codePointAt(0);
            const isShavian = codePoint >= 0x10450 && codePoint <= 0x1047F;

            if (!isShavian && keyboardMap[eventData]) {
                // Input is Latin and has a mapping - translate it
                const translatedChar = keyboardMap[eventData];
                if (debugFn) {
                    debugFn('⌨️  Translating: "' + eventData + '" → "' + translatedChar + '" [' +
                           eventData.split('').map(c => 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join(' ') +
                           ' → ' + translatedChar.split('').map(c => 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join(' ') + ']');
                }

                // Remove the Latin character that was inserted and replace with Shavian
                const originalLength = eventData.length;
                const selectionPos = e.target.selectionStart;
                const before = browserInput.substring(0, selectionPos - originalLength);
                const after = browserInput.substring(selectionPos);
                browserInput = before + after; // Remove the original character

                eventData = translatedChar;
            }
        }
    }

    return { eventData, browserInput };
}

// Track shift state
let isShiftActive = false;

// Track keyboard position
let keyboardPosition = { x: 0, y: 0 };

// Load keyboard state from localStorage
function loadKeyboardState() {
    const saved = localStorage.getItem('virtualKeyboardState');
    if (saved) {
        try {
            const state = JSON.parse(saved);
            keyboardPosition = state.position || { x: 0, y: 0 };
        } catch (e) {
            console.error('Failed to load keyboard state:', e);
        }
    }
}

// Save keyboard state to localStorage
function saveKeyboardState() {
    const state = {
        position: keyboardPosition
    };
    localStorage.setItem('virtualKeyboardState', JSON.stringify(state));
}

// Reset keyboard state (called when virtual keyboard is toggled off)
function resetKeyboardState() {
    keyboardPosition = { x: 0, y: 0 };
    localStorage.removeItem('virtualKeyboardState');
    const keyboard = document.getElementById('virtualKeyboard');
    if (keyboard) {
        updateKeyboardTransform(keyboard);
    }
}

// Update keyboard transform based on current position
function updateKeyboardTransform(el) {
    el.style.transform = `translate(${keyboardPosition.x}px, ${keyboardPosition.y}px)`;
}

// Make keyboard draggable
function makeKeyboardDraggable() {
    const keyboard = document.getElementById('virtualKeyboard');
    const header = keyboard.querySelector('.keyboard-header');
    let isDragging = false;
    let startX, startY;

    // Apply saved state
    loadKeyboardState();
    updateKeyboardTransform(keyboard);

    header.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    // Touch events for mobile
    header.addEventListener('touchstart', dragStart);
    document.addEventListener('touchmove', drag);
    document.addEventListener('touchend', dragEnd);

    function dragStart(e) {
        if (e.target === header || header.contains(e.target)) {
            if (e.target.classList.contains('keyboard-close')) {
                return; // Don't drag when clicking close button
            }
            isDragging = true;

            if (e.type === 'touchstart') {
                startX = e.touches[0].clientX - keyboardPosition.x;
                startY = e.touches[0].clientY - keyboardPosition.y;
            } else {
                startX = e.clientX - keyboardPosition.x;
                startY = e.clientY - keyboardPosition.y;
            }
        }
    }

    function drag(e) {
        if (isDragging) {
            e.preventDefault();

            if (e.type === 'touchmove') {
                keyboardPosition.x = e.touches[0].clientX - startX;
                keyboardPosition.y = e.touches[0].clientY - startY;
            } else {
                keyboardPosition.x = e.clientX - startX;
                keyboardPosition.y = e.clientY - startY;
            }

            updateKeyboardTransform(keyboard);
        }
    }

    function dragEnd(e) {
        if (isDragging) {
            isDragging = false;
            saveKeyboardState();
        }
    }
}

// Show/hide keyboard - these are now just UI helpers called from main script
function showVirtualKeyboard() {
    const keyboard = document.getElementById('virtualKeyboard');
    if (keyboard) {
        keyboard.style.display = 'block';
    }
}

function hideVirtualKeyboard() {
    const keyboard = document.getElementById('virtualKeyboard');
    if (keyboard) {
        keyboard.style.display = 'none';
    }
}

// Update keyboard labels with Shavian characters based on current layout
// Parameters passed from main script to avoid timing issues
function updateKeyboardLabels(keyboardMap, layoutName) {
    // Update keyboard body class for layout-specific styling
    const keyboardBody = document.querySelector('.keyboard-body');
    if (keyboardBody) {
        // Remove all existing layout classes
        keyboardBody.className = keyboardBody.className.replace(/layout-\S+/g, '').trim();
        // Add current layout class (convert to lowercase and remove spaces)
        const layoutClass = 'layout-' + layoutName.toLowerCase().replace(/\s+/g, '-');
        keyboardBody.classList.add(layoutClass);
    }

    // Update title to show keyboard name
    const titleElement = document.querySelector('.keyboard-title');
    if (titleElement) {
        const shiftIndicator = isShiftActive ? ' (Shift)' : '';
        titleElement.textContent = layoutName + shiftIndicator;
    }

    // Update key labels
    const keys = document.querySelectorAll('.key[data-key]');
    keys.forEach(key => {
        let keyValue = key.getAttribute('data-key');

        // If shift is active, try to get the shifted version
        let actualKey = keyValue;
        if (isShiftActive && keyValue.length === 1) {
            if (keyValue.match(/[a-z]/)) {
                actualKey = keyValue.toUpperCase();
            } else {
                // Map number row and punctuation to their shifted equivalents
                const shiftMap = {
                    '1': '!', '2': '@', '3': '#', '4': '$', '5': '%',
                    '6': '^', '7': '&', '8': '*', '9': '(', '0': ')',
                    '`': '~', '-': '_', '=': '+',
                    '[': '{', ']': '}', '\\': '|',
                    ';': ':', '\'': '"',
                    ',': '<', '.': '>', '/': '?'
                };
                if (shiftMap[keyValue]) {
                    actualKey = shiftMap[keyValue];
                }
            }
        }

        const shavianChar = keyboardMap[actualKey];

        if (isShiftActive) {
            // When shift is active, ONLY show Shavian characters that have shift mappings
            // Everything else is blank
            if (shavianChar) {
                key.innerHTML = shavianChar;
                key.setAttribute('data-shavian', shavianChar);
                key.setAttribute('data-actual-key', actualKey);
            } else {
                // No shift mapping - leave blank (except Shift key itself)
                if (keyValue === 'Shift') {
                    key.innerHTML = '⇧';
                } else {
                    key.innerHTML = '';
                }
                key.removeAttribute('data-shavian');
                key.removeAttribute('data-actual-key');
            }
        } else {
            // Normal (non-shift) mode
            if (shavianChar) {
                // Set the Shavian character as the key's content
                // Use innerHTML to preserve VS1 (U+FE00) characters
                key.innerHTML = shavianChar;
                key.setAttribute('data-shavian', shavianChar);
                key.setAttribute('data-actual-key', actualKey);
            } else {
                // For keys without mappings (Tab, Enter, etc.), restore special symbols
                const specialKeys = {
                    'Backspace': '⌫',
                    'Tab': '⇥',
                    'CapsLock': '⇪',
                    'Enter': '⏎',
                    'Shift': '⇧',
                    ' ': 'Space'
                };
                if (specialKeys[keyValue]) {
                    key.innerHTML = specialKeys[keyValue];
                }
                key.removeAttribute('data-shavian');
                key.removeAttribute('data-actual-key');
            }
        }
    });
}

// Highlight key when pressed
// keyCode is optional - used to distinguish left/right shift
function highlightKey(keyValue, keyCode) {
    let key;
    if (keyCode) {
        // Try to find by code first (for left/right shift distinction)
        key = document.querySelector(`.key[data-code="${keyCode}"]`);
    }
    if (!key) {
        // Fall back to data-key
        key = document.querySelector(`.key[data-key="${keyValue}"]`);
    }
    if (key) {
        key.classList.add('active');
    }
}

// Remove highlight from key
// keyCode is optional - used to distinguish left/right shift
function unhighlightKey(keyValue, keyCode) {
    let key;
    if (keyCode) {
        // Try to find by code first (for left/right shift distinction)
        key = document.querySelector(`.key[data-code="${keyCode}"]`);
    }
    if (!key) {
        // Fall back to data-key
        key = document.querySelector(`.key[data-key="${keyValue}"]`);
    }
    if (key) {
        key.classList.remove('active');
    }
}


// Toggle shift state (when clicking virtual shift key)
function toggleShift() {
    isShiftActive = !isShiftActive;

    // Trigger a label update from the main script
    if (typeof updateVirtualKeyboardLabels === 'function') {
        updateVirtualKeyboardLabels();
    }
}

// Handle key clicks to type characters
// keyboardMap passed from main script
function makeKeysClickable(keyboardMap) {
    const keys = document.querySelectorAll('.key[data-key]');
    keys.forEach(key => {
        // Remove existing click listeners
        const newKey = key.cloneNode(true);
        key.parentNode.replaceChild(newKey, key);

        newKey.addEventListener('click', (e) => {
            e.preventDefault();
            const keyValue = newKey.getAttribute('data-key');

            // Notify that user is using virtual keyboard (to prevent OS keyboard)
            if (typeof activateVirtualKeyboardMode === 'function') {
                activateVirtualKeyboardMode();
            }

            // Handle shift key specially
            if (keyValue === 'Shift') {
                toggleShift();
                return;
            }

            const typingInput = document.getElementById('typingInput');
            if (!typingInput) return;

            // Highlight the key briefly for click feedback
            highlightKey(keyValue);
            setTimeout(() => unhighlightKey(keyValue), 150);

            // Get the actual key (considering shift state)
            const actualKey = newKey.getAttribute('data-actual-key') || keyValue;

            // Get the Shavian character for this key
            const shavianChar = keyboardMap ? keyboardMap[actualKey] : null;

            if (shavianChar) {
                // Insert character using helper
                withEditableInput(typingInput, () => {
                    const start = typingInput.selectionStart || typingInput.value.length;
                    const end = typingInput.selectionEnd || typingInput.value.length;

                    typingInput.value = typingInput.value.substring(0, start) +
                                       shavianChar +
                                       typingInput.value.substring(end);

                    setSelectionSafe(typingInput, start + shavianChar.length);
                });

                // Trigger input event so the game logic processes it
                dispatchInputEvent(typingInput, 'insertText', shavianChar);

            } else if (keyValue === 'Backspace') {
                // Delete character using helper
                withEditableInput(typingInput, () => {
                    const start = typingInput.selectionStart || typingInput.value.length;
                    const end = typingInput.selectionEnd || typingInput.value.length;

                    if (start !== end) {
                        // Delete selection
                        typingInput.value = typingInput.value.substring(0, start) +
                                           typingInput.value.substring(end);
                        setSelectionSafe(typingInput, start);
                    } else if (start > 0) {
                        // Delete one character before cursor
                        const chars = Array.from(typingInput.value);
                        typingInput.value = chars.slice(0, start - 1).join('') +
                                           chars.slice(start).join('');
                        setSelectionSafe(typingInput, start - 1);
                    }
                });

                dispatchInputEvent(typingInput, 'deleteContentBackward');
            }
        });
    });
}

// Initialize keyboard UI - track physical keyboard state
// Note: makeKeyboardDraggable() is called from initVirtualKeyboard() after HTML loads
document.addEventListener('DOMContentLoaded', () => {
    // Track physical Shift and Caps Lock keys to update virtual keyboard
    document.addEventListener('keydown', (e) => {
        // Detect physical keyboard on mobile: if keydown fires when input doesn't have focus
        if (hasPhysicalKeyboard === null && typeof isMobileDevice === 'function' && isMobileDevice()) {
            const typingInput = document.getElementById('typingInput');
            if (typingInput && document.activeElement !== typingInput) {
                // Physical keyboard detected!
                hasPhysicalKeyboard = true;
                sessionStorage.setItem('hasPhysicalKeyboard', 'true');
                if (typeof debug === 'function') {
                    debug('🎹 Physical keyboard detected on mobile device');
                }
            }
        }

        // Highlight the key being pressed (pass e.code to distinguish left/right shift)
        highlightKey(e.key, e.code);

        // Check modifier state on every keypress
        const shouldShowShift = e.shiftKey || e.getModifierState('CapsLock');
        if (shouldShowShift !== isShiftActive) {
            isShiftActive = shouldShowShift;
            // Trigger label update from main script
            if (typeof updateVirtualKeyboardLabels === 'function') {
                updateVirtualKeyboardLabels();
            }
        }
    });

    document.addEventListener('keyup', (e) => {
        // Remove highlight from released key (pass e.code to distinguish left/right shift)
        unhighlightKey(e.key, e.code);

        // Check modifier state when keys are released
        const shouldShowShift = e.shiftKey || e.getModifierState('CapsLock');
        if (shouldShowShift !== isShiftActive) {
            isShiftActive = shouldShowShift;
            // Trigger label update from main script
            if (typeof updateVirtualKeyboardLabels === 'function') {
                updateVirtualKeyboardLabels();
            }
        }
    });
});
