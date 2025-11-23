// Virtual Keyboard Functionality

// Track shift state
let isShiftActive = false;

// Track keyboard position and scale
let keyboardPosition = { x: 0, y: 0 };
let keyboardScale = 1;

// Load keyboard state from localStorage
function loadKeyboardState() {
    const saved = localStorage.getItem('virtualKeyboardState');
    if (saved) {
        try {
            const state = JSON.parse(saved);
            keyboardPosition = state.position || { x: 0, y: 0 };
            keyboardScale = state.scale || 1;
        } catch (e) {
            console.error('Failed to load keyboard state:', e);
        }
    }
}

// Save keyboard state to localStorage
function saveKeyboardState() {
    const state = {
        position: keyboardPosition,
        scale: keyboardScale
    };
    localStorage.setItem('virtualKeyboardState', JSON.stringify(state));
}

// Reset keyboard state (called when virtual keyboard is toggled off)
function resetKeyboardState() {
    keyboardPosition = { x: 0, y: 0 };
    keyboardScale = 1;
    localStorage.removeItem('virtualKeyboardState');
    const keyboard = document.getElementById('virtualKeyboard');
    if (keyboard) {
        updateKeyboardTransform(keyboard);
    }
}

// Update keyboard transform based on current position and scale
function updateKeyboardTransform(el) {
    el.style.transform = `translate(${keyboardPosition.x}px, ${keyboardPosition.y}px) scale(${keyboardScale})`;
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

// Make keyboard resizable with corner drag
function makeKeyboardResizable() {
    const keyboard = document.getElementById('virtualKeyboard');
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'resize-handle';
    keyboard.appendChild(resizeHandle);

    let isResizing = false;
    let startX, startY, startScale, startPosition;
    let keyboardWidth, keyboardHeight;

    resizeHandle.addEventListener('mousedown', startResize);
    resizeHandle.addEventListener('touchstart', startResize);

    function startResize(e) {
        e.preventDefault();
        e.stopPropagation();
        isResizing = true;
        startScale = keyboardScale;
        startPosition = { ...keyboardPosition };

        // Get the original dimensions before scaling
        const rect = keyboard.getBoundingClientRect();
        keyboardWidth = rect.width / keyboardScale;
        keyboardHeight = rect.height / keyboardScale;

        if (e.type === 'touchstart') {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        } else {
            startX = e.clientX;
            startY = e.clientY;
        }

        document.addEventListener('mousemove', resize);
        document.addEventListener('mouseup', stopResize);
        document.addEventListener('touchmove', resize);
        document.addEventListener('touchend', stopResize);
    }

    function resize(e) {
        if (!isResizing) return;

        let currentX, currentY;
        if (e.type === 'touchmove') {
            currentX = e.touches[0].clientX;
            currentY = e.touches[0].clientY;
        } else {
            currentX = e.clientX;
            currentY = e.clientY;
        }

        const deltaX = currentX - startX;
        const deltaY = currentY - startY;

        // Calculate new scale based on diagonal resize
        const diagonal = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const scaleDelta = diagonal / 500;

        // Determine if dragging towards (down-right) or away (up-left) from keyboard
        const direction = (deltaX > 0 && deltaY > 0) ? 1 : -1;
        const newScale = Math.max(0.5, Math.min(2, startScale + (scaleDelta * direction)));

        // Adjust position so bottom-right corner stays fixed while scaling
        // When scale changes, top-left moves, so we compensate
        const scaleDiff = newScale - startScale;
        keyboardPosition.x = startPosition.x - (keyboardWidth * scaleDiff);
        keyboardPosition.y = startPosition.y - (keyboardHeight * scaleDiff);
        keyboardScale = newScale;

        updateKeyboardTransform(keyboard);
    }

    function stopResize() {
        if (isResizing) {
            isResizing = false;
            saveKeyboardState();
            document.removeEventListener('mousemove', resize);
            document.removeEventListener('mouseup', stopResize);
            document.removeEventListener('touchmove', resize);
            document.removeEventListener('touchend', stopResize);
        }
    }
}

// Toggle shift state
function toggleShift() {
    isShiftActive = !isShiftActive;

    // Update shift key visual state
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
    makeKeyboardResizable();

    // Listen for keydown events to highlight keys
    document.addEventListener('keydown', (e) => {
        highlightKey(e.key);
    });
});
