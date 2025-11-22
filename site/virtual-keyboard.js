// Virtual Keyboard Functionality

// Make keyboard draggable
function makeKeyboardDraggable() {
    const keyboard = document.getElementById('virtualKeyboard');
    const header = keyboard.querySelector('.keyboard-header');
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    header.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    // Touch events for mobile
    header.addEventListener('touchstart', dragStart);
    document.addEventListener('touchmove', drag);
    document.addEventListener('touchend', dragEnd);

    function dragStart(e) {
        if (e.type === 'touchstart') {
            initialX = e.touches[0].clientX - xOffset;
            initialY = e.touches[0].clientY - yOffset;
        } else {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
        }

        if (e.target === header || header.contains(e.target)) {
            if (e.target.classList.contains('keyboard-close')) {
                return; // Don't drag when clicking close button
            }
            isDragging = true;
        }
    }

    function drag(e) {
        if (isDragging) {
            e.preventDefault();

            if (e.type === 'touchmove') {
                currentX = e.touches[0].clientX - initialX;
                currentY = e.touches[0].clientY - initialY;
            } else {
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
            }

            xOffset = currentX;
            yOffset = currentY;

            setTranslate(currentX, currentY, keyboard);
        }
    }

    function dragEnd(e) {
        initialX = currentX;
        initialY = currentY;
        isDragging = false;
    }

    function setTranslate(xPos, yPos, el) {
        el.style.transform = `translate(${xPos}px, ${yPos}px)`;
    }
}

// Show/hide keyboard
function showVirtualKeyboard() {
    const keyboard = document.getElementById('virtualKeyboard');

    // Only show if a game is in progress (typingInput exists and is visible)
    const typingInput = document.getElementById('typingInput');
    if (!typingInput || typingInput.style.display === 'none') {
        console.log('Not showing keyboard - no active game');
        return;
    }

    keyboard.style.display = 'block';
    updateKeyboardLabels();
    makeKeysClickable(); // Rebind click handlers after labels are updated
    localStorage.setItem('showVirtualKeyboard', 'true');

    // Update the settings checkbox
    const toggle = document.getElementById('virtualKeyboardToggle');
    if (toggle) {
        toggle.checked = true;
    }
}

function hideVirtualKeyboard() {
    const keyboard = document.getElementById('virtualKeyboard');
    keyboard.style.display = 'none';
    localStorage.setItem('showVirtualKeyboard', 'false');

    // Update the settings checkbox
    const toggle = document.getElementById('virtualKeyboardToggle');
    if (toggle) {
        toggle.checked = false;
    }
}

function toggleVirtualKeyboard() {
    const keyboard = document.getElementById('virtualKeyboard');
    if (keyboard.style.display === 'none') {
        showVirtualKeyboard();
    } else {
        hideVirtualKeyboard();
    }
}

// Update keyboard labels with Shavian characters based on current layout
function updateKeyboardLabels() {
    console.log('updateKeyboardLabels called, currentLayout:', typeof currentLayout !== 'undefined' ? currentLayout : 'UNDEFINED');
    console.log('KEYBOARD_MAPS available:', typeof KEYBOARD_MAPS !== 'undefined');

    if (typeof currentLayout === 'undefined' || typeof KEYBOARD_MAPS === 'undefined') {
        console.log('Waiting for main script to load...');
        setTimeout(updateKeyboardLabels, 100);
        return;
    }

    const keyboardMap = KEYBOARD_MAPS[currentLayout];
    if (!keyboardMap) {
        console.log('No keyboard map found for layout:', currentLayout);
        return;
    }

    console.log('Updating keyboard labels for layout:', currentLayout);

    // Update title to show keyboard name
    const titleElement = document.querySelector('.keyboard-title');
    if (titleElement) {
        const layoutNames = {
            'imperial': 'Shaw Imperial',
            'new-imperial': 'New Shaw Imperial',
            'qwerty': 'Shaw QWERTY',
            '2layer': 'Shaw 2-layer',
            'jafl': 'Shaw-JAFL'
        };
        titleElement.textContent = layoutNames[currentLayout] || 'Virtual Keyboard';
    }

    // Update key labels
    const keys = document.querySelectorAll('.key[data-key]');
    console.log('Found', keys.length, 'keys to update');
    keys.forEach(key => {
        const keyValue = key.getAttribute('data-key');
        const shavianChar = keyboardMap[keyValue];
        if (shavianChar) {
            // Set the Shavian character as the key's content
            // Use innerHTML to preserve VS1 (U+FE00) characters
            key.innerHTML = shavianChar;
            key.setAttribute('data-shavian', shavianChar);
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
        }
    });

    console.log('Keyboard labels updated');
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
    let startWidth, startHeight, startX, startY;

    resizeHandle.addEventListener('mousedown', startResize);
    resizeHandle.addEventListener('touchstart', startResize);

    function startResize(e) {
        e.preventDefault();
        e.stopPropagation();
        isResizing = true;

        const rect = keyboard.getBoundingClientRect();
        startWidth = rect.width;
        startHeight = rect.height;

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
        const scaleFactor = 1 + (diagonal / 500);

        keyboard.style.transform = keyboard.style.transform.replace(/scale\([^)]*\)/, '') + ` scale(${scaleFactor})`;
    }

    function stopResize() {
        isResizing = false;
        document.removeEventListener('mousemove', resize);
        document.removeEventListener('mouseup', stopResize);
        document.removeEventListener('touchmove', resize);
        document.removeEventListener('touchend', stopResize);
    }
}

// Handle key clicks to type characters
function makeKeysClickable() {
    const keys = document.querySelectorAll('.key[data-key]');
    keys.forEach(key => {
        key.addEventListener('click', (e) => {
            e.preventDefault();
            const keyValue = key.getAttribute('data-key');
            const typingInput = document.getElementById('typingInput');

            if (!typingInput) return;

            // Highlight the key
            highlightKey(keyValue);

            // Get the Shavian character for this key
            const keyboardMap = KEYBOARD_MAPS[currentLayout];
            const shavianChar = keyboardMap ? keyboardMap[keyValue] : null;

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

// Initialize keyboard on page load
document.addEventListener('DOMContentLoaded', () => {
    makeKeyboardDraggable();
    makeKeyboardResizable();

    // Load saved preference
    const showKeyboard = localStorage.getItem('showVirtualKeyboard');
    if (showKeyboard === 'true') {
        showVirtualKeyboard();
    }

    // Listen for keydown events to highlight keys
    document.addEventListener('keydown', (e) => {
        highlightKey(e.key);
    });
});
