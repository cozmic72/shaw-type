// Virtual Keyboard Functionality

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
    keyboard.style.display = 'block';
}

function hideVirtualKeyboard() {
    const keyboard = document.getElementById('virtualKeyboard');
    keyboard.style.display = 'none';
}

// Update keyboard labels with Shavian characters based on current layout
// Parameters passed from main script to avoid timing issues
function updateKeyboardLabels(keyboardMap, layoutName) {
    console.log('updateKeyboardLabels called with:', layoutName, 'keyboardMap:', keyboardMap, 'shift:', isShiftActive);

    // Update title to show keyboard name
    const titleElement = document.querySelector('.keyboard-title');
    if (titleElement) {
        const shiftIndicator = isShiftActive ? ' (Shift)' : '';
        titleElement.textContent = layoutName + shiftIndicator;
        console.log('Title updated to:', layoutName + shiftIndicator);
    }

    // Update key labels
    const keys = document.querySelectorAll('.key[data-key]');
    console.log('Found', keys.length, 'keys to update');
    keys.forEach(key => {
        let keyValue = key.getAttribute('data-key');

        // If shift is active, try to get the shifted version
        let actualKey = keyValue;
        if (isShiftActive && keyValue.length === 1 && keyValue.match(/[a-z]/)) {
            actualKey = keyValue.toUpperCase();
        }

        const shavianChar = keyboardMap[actualKey];

        if (isShiftActive) {
            // When shift is active, ONLY show Shavian characters that have shift mappings
            // Everything else is blank
            if (shavianChar) {
                key.innerHTML = shavianChar;
                key.setAttribute('data-shavian', shavianChar);
                key.setAttribute('data-actual-key', actualKey);
                console.log('Set shift key', keyValue, '(actual:', actualKey, ') to', shavianChar);
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
                console.log('Set key', keyValue, '(actual:', actualKey, ') to', shavianChar);
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
                    console.log('Set special key', keyValue, 'to', specialKeys[keyValue]);
                }
                key.removeAttribute('data-shavian');
                key.removeAttribute('data-actual-key');
            }
        }
    });
    console.log('updateKeyboardLabels complete');
}

// Highlight key when pressed
function highlightKey(keyValue) {
    const key = document.querySelector(`.key[data-key="${keyValue}"]`);
    if (key) {
        key.classList.add('active');
        setTimeout(() => {
            key.classList.remove('active');
        }, 150);
    }
}


// Toggle shift state (when clicking virtual shift key)
function toggleShift() {
    isShiftActive = !isShiftActive;

    // Update shift key visuals manually since we don't have an event object
    const shiftKeys = document.querySelectorAll('.key[data-key="Shift"]');
    shiftKeys.forEach(key => {
        if (isShiftActive) {
            key.classList.add('shift-active');
        } else {
            key.classList.remove('shift-active');
        }
    });

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

            // Handle shift key specially
            if (keyValue === 'Shift') {
                toggleShift();
                return;
            }

            const typingInput = document.getElementById('typingInput');
            if (!typingInput) return;

            // Highlight the key
            highlightKey(keyValue);

            // Get the actual key (considering shift state)
            const actualKey = newKey.getAttribute('data-actual-key') || keyValue;

            // Get the Shavian character for this key
            const shavianChar = keyboardMap ? keyboardMap[actualKey] : null;

            if (shavianChar) {
                // Insert the Shavian character
                const start = typingInput.selectionStart;
                const end = typingInput.selectionEnd;
                const currentValue = typingInput.value;

                const newValue = currentValue.substring(0, start) + shavianChar + currentValue.substring(end);
                typingInput.value = newValue;

                // Move cursor after inserted character
                const newCursorPos = start + shavianChar.length;
                typingInput.setSelectionRange(newCursorPos, newCursorPos);

                // Trigger input event so the game logic processes it
                const inputEvent = new InputEvent('input', {
                    bubbles: true,
                    cancelable: true,
                    inputType: 'insertText',
                    data: shavianChar
                });
                typingInput.dispatchEvent(inputEvent);
            } else if (keyValue === 'Backspace') {
                // Handle backspace
                const start = typingInput.selectionStart;
                const end = typingInput.selectionEnd;

                if (start !== end) {
                    // Delete selection
                    typingInput.value = typingInput.value.substring(0, start) + typingInput.value.substring(end);
                    typingInput.setSelectionRange(start, start);
                } else if (start > 0) {
                    // Delete one character before cursor
                    const chars = Array.from(typingInput.value);
                    const before = chars.slice(0, start - 1).join('');
                    const after = chars.slice(start).join('');
                    typingInput.value = before + after;
                    typingInput.setSelectionRange(start - 1, start - 1);
                }

                const inputEvent = new InputEvent('input', {
                    bubbles: true,
                    cancelable: true,
                    inputType: 'deleteContentBackward'
                });
                typingInput.dispatchEvent(inputEvent);
            }

            // Focus the input
            typingInput.focus();
        });
    });
}

// Initialize keyboard UI on page load - main script handles showing/hiding
document.addEventListener('DOMContentLoaded', () => {
    makeKeyboardDraggable();

    // Track physical Shift and Caps Lock keys to update virtual keyboard
    document.addEventListener('keydown', (e) => {
        // Highlight the key being pressed
        highlightKey(e.key);

        // Check modifier state on every keypress
        const shouldShowShift = e.shiftKey || e.getModifierState('CapsLock');
        if (shouldShowShift !== isShiftActive) {
            isShiftActive = shouldShowShift;
            // Trigger label update from main script
            if (typeof updateVirtualKeyboardLabels === 'function') {
                updateVirtualKeyboardLabels();
            }
        }

        // Update shift and caps lock key highlighting
        updateModifierKeyVisuals(e);
    });

    document.addEventListener('keyup', (e) => {
        // Check modifier state when keys are released
        const shouldShowShift = e.shiftKey || e.getModifierState('CapsLock');
        if (shouldShowShift !== isShiftActive) {
            isShiftActive = shouldShowShift;
            // Trigger label update from main script
            if (typeof updateVirtualKeyboardLabels === 'function') {
                updateVirtualKeyboardLabels();
            }
        }

        // Update shift and caps lock key highlighting
        updateModifierKeyVisuals(e);
    });
});

// Helper to update shift and caps lock key visuals based on actual modifier state
function updateModifierKeyVisuals(e) {
    // Update Shift keys
    const shiftKeys = document.querySelectorAll('.key[data-key="Shift"]');
    shiftKeys.forEach(key => {
        if (e.shiftKey) {
            key.classList.add('shift-active');
        } else {
            key.classList.remove('shift-active');
        }
    });

    // Update CapsLock key
    const capsLockKey = document.querySelector('.key[data-key="CapsLock"]');
    if (capsLockKey) {
        if (e.getModifierState('CapsLock')) {
            capsLockKey.classList.add('shift-active');
        } else {
            capsLockKey.classList.remove('shift-active');
        }
    }
}
