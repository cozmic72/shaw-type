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
    keyboard.style.display = 'block';
    updateKeyboardLabels();
    localStorage.setItem('showVirtualKeyboard', 'true');
}

function hideVirtualKeyboard() {
    const keyboard = document.getElementById('virtualKeyboard');
    keyboard.style.display = 'none';
    localStorage.setItem('showVirtualKeyboard', 'false');
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
    const keyboardMap = KEYBOARD_MAPS[currentLayout];
    if (!keyboardMap) return;

    const keys = document.querySelectorAll('.key[data-key]');
    keys.forEach(key => {
        const keyValue = key.getAttribute('data-key');
        const shavianChar = keyboardMap[keyValue];
        if (shavianChar) {
            key.setAttribute('data-shavian', shavianChar);
        } else {
            key.removeAttribute('data-shavian');
        }
    });
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

// Initialize keyboard on page load
document.addEventListener('DOMContentLoaded', () => {
    makeKeyboardDraggable();

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
