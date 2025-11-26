// Common Utilities - loaded before all other scripts

// Debug logging - enabled by setting debugMode=true in localStorage
let debugMode = localStorage.getItem('debugMode') === 'true';

function debug(...args) {
    if (debugMode) {
        console.log(...args);
    }
}

// Helper function to toggle debug mode (can be called from console)
// Usage: setDebug(true) or setDebug(false) or window.debugMode = true
window.setDebug = function(enabled) {
    debugMode = !!enabled;
    window.debugMode = debugMode;
    localStorage.setItem('debugMode', debugMode);
    console.log('Debug mode ' + (debugMode ? 'enabled' : 'disabled') + ' and saved to localStorage');
    return debugMode;
};

// Expose debugMode on window and make it a getter/setter
Object.defineProperty(window, 'debugMode', {
    get: function() { return debugMode; },
    set: function(value) {
        debugMode = !!value;
        localStorage.setItem('debugMode', debugMode);
        console.log('Debug mode ' + (debugMode ? 'enabled' : 'disabled'));
    }
});

// Helper: Detect if user is on a mobile device
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
}
