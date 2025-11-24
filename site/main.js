// Words will be loaded from JSON file
let wordsByLength = {};
let learnWordsImperial = {};
let learnWordsImperialNoLig = {};
let learnWordsNewImperial = {};
let learnWordsNewImperialNoLig = {};
let learnWordsQwerty = {};
let learnWords2layer = {};
let learnWordsJafl = {};
let learnWordsJaflNoLig = {};
let wordsLoaded = false;

// Current level/lesson state
let currentLevelWordPool = []; // Source pool of words for current level/lesson
let currentLevelWordCount = 5; // Number of words to complete this level/lesson
let currentLevelTitle = ''; // Display title for current level/lesson
let currentLevelType = 'level'; // 'level' or 'lesson' for UI labels
let currentLevelTypeLabel = 'Level'; // Display label for UI
let currentLevelNumber = 1;
let currentLevelCompletionCallback = null; // Function to call when level completes

// Carousel: 4 slots, we track which slot index maps to which position
let carouselOffset = 0; // Current slot index for "current" word
let words = ['', '', '', '']; // Words in slots [0, 1, 2, 3]
let currentWord = ''; // The actual current word being typed
let wordsCompleted = 0;
let wordsInCurrentLevel = 0; // Words completed in current level
let totalLettersTyped = 0;
let correctLetters = 0;
let recentWords = []; // Track recent words to avoid repeats
let startTime = null; // Session start time
let pauseStartTime = null; // When timer was paused
let totalPausedTime = 0; // Cumulative paused time in milliseconds
let bestTime = null; // Legacy - migrated to highScores
let highScores = {}; // High scores keyed by level count: { '3': {time, wpm, accuracy}, '6': {...}, '10': {...} }
let levelStats = []; // Per-level statistics
let currentLevelLettersTyped = 0; // Letters typed in current level
let currentLevelCorrectLetters = 0; // Correct letters in current level

// Shadow input: faithful representation of what user typed (browsers may strip combining chars)
let shadowInput = '';

// Track replacement info from beforeinput event (for insertReplacementText)
let pendingReplacementStart = -1;
let pendingReplacementEnd = -1;

// Ligature mappings are now loaded from keyboard_layouts.json
// Each layout specifies its own ligatures and whether they're always on, optional, or never

// Variation Selector 1 - used in some ligature combinations (especially IGC)
const VS1 = '\uFE00';

// Get ligatures for current layout
function getCurrentLayoutLigatures() {
    if (!KEYBOARD_MAPS || !KEYBOARD_MAPS[currentLayout]) {
        return {};
    }
    return KEYBOARD_MAPS[currentLayout].ligatures || {};
}

// Get reverse mapping for current layout
function getCurrentComponentToLigature() {
    const ligatures = getCurrentLayoutLigatures();
    const mapping = {};
    Object.keys(ligatures).forEach(compound => {
        ligatures[compound].forEach(sequence => {
            const key = sequence.join('');
            mapping[key] = compound;
        });
    });
    return mapping;
}

// Check if ligatures should be active for current layout
function areLigaturesActive() {
    if (!KEYBOARD_MAPS || !KEYBOARD_MAPS[currentLayout]) {
        return false;
    }
    const autoLigatures = KEYBOARD_MAPS[currentLayout].autoLigatures;
    if (autoLigatures === 'always') {
        return true;
    } else if (autoLigatures === 'never') {
        return false;
    } else {
        // 'optional' - respect user setting
        return useLigatures;
    }
}

// Update ligature toggle UI based on current layout's policy
function updateLigatureToggleState() {
    if (!KEYBOARD_MAPS || !KEYBOARD_MAPS[currentLayout]) {
        return;
    }

    const ligatureOption = document.getElementById('ligatureSettingOption');
    const ligatureToggle = document.getElementById('ligatureToggleSettings');
    const ligatureLabel = document.getElementById('ligatures');
    const autoLigatures = KEYBOARD_MAPS[currentLayout].autoLigatures;

    // Always show the option
    ligatureOption.style.display = 'block';

    if (autoLigatures === 'never') {
        // Grey out and show "not supported" for layouts without ligatures
        // Don't change checked state - just visual display
        ligatureToggle.disabled = true;
        ligatureToggle.style.opacity = '0.5';
        ligatureToggle.style.cursor = 'not-allowed';
        ligatureLabel.textContent = 'Ligatures not supported';
    } else if (autoLigatures === 'always') {
        // Grey out and show "built in" for layouts with forced ligatures
        // Don't change checked state - just visual display
        ligatureToggle.disabled = true;
        ligatureToggle.style.opacity = '0.5';
        ligatureToggle.style.cursor = 'not-allowed';
        ligatureLabel.textContent = 'Ligatures built in';
    } else {
        // 'optional' - show and enable toggle with normal label
        // Restore user's preference from useLigatures variable
        ligatureToggle.checked = useLigatures;
        ligatureToggle.disabled = false;
        ligatureToggle.style.opacity = '1';
        ligatureToggle.style.cursor = 'pointer';
        ligatureLabel.textContent = 'Automatic ligatures (𐑩+𐑮→𐑼, 𐑘+𐑵→𐑿)';
    }
}

// QWERTY to Shavian keyboard mappings - loaded from keyboard_layouts.json by virtual-keyboard.js
// KEYBOARD_MAPS is defined in virtual-keyboard.js

// Virtual keyboard control functions
function getLayoutName(layout) {
    const layoutNames = {
        'imperial': 'Shaw Imperial',
        'igc': 'Imperial Good Companion',
        'qwerty': 'Shaw QWERTY',
        '2layer': 'Shaw 2-layer',
        'jafl': 'Shaw-JAFL'
    };
    return layoutNames[layout] || 'Virtual Keyboard';
}

function updateVirtualKeyboardLabels(retryCount = 0) {
    if (typeof updateKeyboardLabels === 'function' && typeof makeKeysClickable === 'function') {
        const layout = KEYBOARD_MAPS[currentLayout];
        if (!layout || !layout.keys) {
            debug('No keyboard map available for layout:', currentLayout);
            return; // Can't update labels if no map exists
        }
        const keyboardMap = layout.keys;
        const layoutName = getLayoutName(currentLayout);
        updateKeyboardLabels(keyboardMap, layoutName);
        makeKeysClickable(keyboardMap);

        // Update ligature toggle state when keyboard maps are available
        updateLigatureToggleState();
    } else if (retryCount < 20) {
        // Functions not loaded yet, try again soon
        setTimeout(() => updateVirtualKeyboardLabels(retryCount + 1), 50);
    } else {
        console.error('Virtual keyboard functions not available after retries');
    }
}

function toggleVirtualKeyboard() {
    const keyboard = document.getElementById('virtualKeyboard');
    const toggle = document.getElementById('virtualKeyboardToggle');

    if (keyboard.style.display === 'none') {
        // Show keyboard
        const typingInput = document.getElementById('typingInput');
        if (!typingInput || typingInput.style.display === 'none') {
            // No active game, don't show keyboard
            if (toggle) toggle.checked = false;
            localStorage.setItem('showVirtualKeyboard', 'false');
            return;
        }

        showVirtualKeyboard();
        updateVirtualKeyboardLabels();
        if (toggle) toggle.checked = true;
        localStorage.setItem('showVirtualKeyboard', 'true');
    } else {
        // Hide keyboard and reset position/scale
        hideVirtualKeyboard();
        if (typeof resetKeyboardState === 'function') {
            resetKeyboardState();
        }
        if (toggle) toggle.checked = false;
        localStorage.setItem('showVirtualKeyboard', 'false');
    }
}

// Track whether user is actively using virtual keyboard
let isUsingVirtualKeyboard = false;

// Central focus management: configure input based on virtual keyboard usage
function updateInputFocusMode() {
    const typingInput = document.getElementById('typingInput');
    if (!typingInput) return;

    const keyboard = document.getElementById('virtualKeyboard');
    const isVirtualKeyboardVisible = keyboard && keyboard.style.display !== 'none';

    if (isVirtualKeyboardVisible && isUsingVirtualKeyboard) {
        // User clicked virtual keyboard: prevent physical keyboard
        typingInput.setAttribute('readonly', 'readonly');
        typingInput.blur();
    } else {
        // Allow physical keyboard input
        typingInput.removeAttribute('readonly');
        if (typingInput.style.display !== 'none') {
            typingInput.focus();
        }
    }
}

// Called when user clicks on virtual keyboard
function activateVirtualKeyboardMode() {
    isUsingVirtualKeyboard = true;
    updateInputFocusMode();

    // Add visual indicator that virtual keyboard is active
    const typingInput = document.getElementById('typingInput');
    if (typingInput) {
        typingInput.style.border = '3px solid #667eea';
    }
}

// Called when user clicks on text input
function activatePhysicalKeyboardMode() {
    isUsingVirtualKeyboard = false;
    updateInputFocusMode();

    // Remove visual indicator
    const typingInput = document.getElementById('typingInput');
    if (typingInput) {
        typingInput.style.border = '';
    }
}

// Show virtual keyboard if user preference is enabled
function showVirtualKeyboardIfEnabled() {
    const savedShowKeyboard = localStorage.getItem('showVirtualKeyboard');
    if (savedShowKeyboard === 'true') {
        showVirtualKeyboard();
        updateVirtualKeyboardLabels();
        // Don't force readonly - let user choose by clicking
        isUsingVirtualKeyboard = false;
        updateInputFocusMode();
    }
}

// Hide virtual keyboard temporarily (preserves user preference)
function hideVirtualKeyboardTemporarily() {
    hideVirtualKeyboard();
    isUsingVirtualKeyboard = false;
    updateInputFocusMode();
}

// Form ligatures in a word by replacing component pairs with ligatures
function formLigaturesInWord(word) {
    const componentToLigature = getCurrentComponentToLigature();
    let result = word;
    let changed = true;

    while (changed) {
        changed = false;
        const chars = Array.from(result);

        for (let i = 0; i < chars.length - 1; i++) {
            const pair = chars[i] + chars[i + 1];
            if (componentToLigature[pair]) {
                result = chars.slice(0, i).join('') +
                        componentToLigature[pair] +
                        chars.slice(i + 2).join('');
                changed = true;
                break;
            }
        }
    }

    return result;
}


// Mode management
let currentMode = 'play'; // 'learn' or 'play'
let currentLayout = 'imperial'; // 'imperial' or 'qwerty'
let useLigatures = true; // Toggle for ligatures - ON by default
let selectedLevel = 1; // Level selection: 1-7
let levelCount = 6; // Number of levels in play mode (configurable: 3, 6, or 10)
let useShavianUI = false; // Toggle for Shavian UI
let currentDialect = 'gb'; // 'gb' or 'us' - English dialect for word lists
let debugMode = false; // Toggle for debug logging
let useVirtualKeyboard = true; // QWERTY virtual keyboard always enabled

// Debug logging function - only logs when debugMode is true
function debug(...args) {
    if (debugMode) {
        console.log(...args);
    }
}

// Helper function to toggle debug mode (can be called from console immediately)
// Usage: setDebug(true) or setDebug(false) or window.debugMode = true
window.setDebug = function(enabled) {
    debugMode = !!enabled;
    window.debugMode = debugMode; // Also expose on window for direct access
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

// Get current translations based on settings
// Note: translations are loaded synchronously in <head>
function getCurrentTranslations() {
    if (!useShavianUI) {
        return window.translations.latin || {};
    }

    // Use dialect-specific Shavian translations
    const dialectKey = currentDialect === 'gb' ? 'shavian_british' : 'shavian_american';
    return window.translations[dialectKey] || {};
}

const wordSlots = [
    document.getElementById('wordSlot0'),
    document.getElementById('wordSlot1'),
    document.getElementById('wordSlot2'),
    document.getElementById('wordSlot3')
];
const typingInput = document.getElementById('typingInput');
const wordCountEl = document.getElementById('wordCount');
const accuracyEl = document.getElementById('accuracyValue');
const levelDisplayEl = document.getElementById('levelDisplay');

// Get current level based on words completed (5 words per level)
function getCurrentLevel() {
    if (currentMode === 'learn' && currentLayout === 'imperial' && areLigaturesActive()) {
        // Imperial with ligatures has 7 levels (compound letters at level 5)
        if (wordsCompleted < 5) return 1;
        if (wordsCompleted < 10) return 2;
        if (wordsCompleted < 15) return 3;
        if (wordsCompleted < 20) return 4;
        if (wordsCompleted < 25) return 5; // Compound letters lesson
        if (wordsCompleted < 30) return 6; // Almost Complete
        return 7; // All Keys
    } else {
        // Other modes use 6 levels (5 words per level = 30 words total)
        if (wordsCompleted < 5) return 1;
        if (wordsCompleted < 10) return 2;
        if (wordsCompleted < 15) return 3;
        if (wordsCompleted < 20) return 4;
        if (wordsCompleted < 25) return 5;
        return 6;
    }
}

// UI Navigation
function goHome() {
    // Cancel any running countdown
    cancelCountdown();

    // Hide virtual keyboard when returning to home
    hideVirtualKeyboardTemporarily();

    // Hide game content and countdown, show home screen
    document.getElementById('gameContent').classList.add('hidden');
    document.getElementById('countdownScreen').classList.add('hidden');
    document.getElementById('homeScreen').classList.remove('hidden');
    document.getElementById('backBtn').classList.add('hidden');

    // Reset subtitle to default
    const t = getCurrentTranslations();
    document.getElementById('mainSubtitle').textContent = t.subtitle;

    // Clear any modals
    closeLessonModal();
    document.getElementById('completionModal').classList.remove('show');
}

function showGameContent() {
    document.getElementById('homeScreen').classList.add('hidden');
    document.getElementById('countdownScreen').classList.add('hidden');
    document.getElementById('gameContent').classList.remove('hidden');
    document.getElementById('backBtn').classList.remove('hidden');
}

function startPlay() {
    currentMode = 'play';
    localStorage.setItem('currentMode', currentMode);

    // Hide home screen, show back button
    document.getElementById('homeScreen').classList.add('hidden');
    document.getElementById('backBtn').classList.remove('hidden');

    // Reset all stats
    wordsCompleted = 0;
    totalLettersTyped = 0;
    correctLetters = 0;
    currentLevelNumber = 1;
    recentWords = [];
    levelStats = [];
    pauseStartTime = null;
    totalPausedTime = 0;

    // Update display
    updateStats();
    updateLevel();
    updateSubtitleForGame();

    // Show/hide lesson info
    document.getElementById('currentLessonInfo').style.display = 'none';

    // Update UI language
    updateUILanguage();

    // Show countdown, then start game
    const t = getCurrentTranslations();
    const levelData = getPlayLevelData(1);
    showCountdown(levelData.wordPool, levelData.wordCount, 'level', levelData.title, t.level_label, null);
}

function playAgain() {
    // Hide completion modal
    document.getElementById('completionModal').style.display = 'none';

    // Reset all stats
    wordsCompleted = 0;
    totalLettersTyped = 0;
    correctLetters = 0;
    currentLevelNumber = 1;
    recentWords = [];
    levelStats = [];
    pauseStartTime = null;
    totalPausedTime = 0;

    // Update display
    updateStats();
    updateLevel();
    updateSubtitleForGame();

    // Show/hide lesson info
    document.getElementById('currentLessonInfo').style.display = 'none';

    // Show countdown, then start game
    const t = getCurrentTranslations();
    const levelData = getPlayLevelData(1);
    showCountdown(levelData.wordPool, levelData.wordCount, 'level', levelData.title, t.level_label, null);
}

function startPractice() {
    currentMode = 'learn';
    localStorage.setItem('currentMode', currentMode);

    // Open lesson selector first
    openLessonSelector();
}

function updateSubtitleForGame() {
    const t = getCurrentTranslations();
    const subtitle = document.getElementById('mainSubtitle');

    if (currentMode === 'play') {
        subtitle.textContent = `${t.level_label} ${currentLevelNumber}`;
    } else if (currentMode === 'learn') {
        // Lesson name will be set when lesson is selected
        subtitle.textContent = '';
    }
}

// Mode switching (legacy - now mainly used internally)
function setMode(mode) {
    currentMode = mode;
    localStorage.setItem('currentMode', currentMode);

    // Show/hide lesson info
    document.getElementById('currentLessonInfo').style.display =
        mode === 'learn' ? 'block' : 'none';

    // Update subtitle
    updateSubtitleForGame();

    // Open lesson selector when switching to practice mode
    if (mode === 'learn') {
        openLessonSelector();
    }

    // Update stat label based on mode
    updateUILanguage();

    // Reset and reload
    resetPractice();
}

function onDialectChangeSettings() {
    const selected = document.querySelector('input[name="dialectSettings"]:checked');
    if (selected) {
        currentDialect = selected.value;
        localStorage.setItem('dialect', currentDialect);
        // Update UI translations for new dialect
        updateUILanguage();
        // Reload words with new dialect
        loadWords().then(() => {
            updateLevelSelector();
            // Dialect change will take effect on next game
        });
    }
}

function onLayoutChangeSettings() {
    currentLayout = document.getElementById('layoutSelectSettings').value;
    localStorage.setItem('keyboardLayout', currentLayout);

    // Update ligature toggle visibility and state based on layout policy
    updateLigatureToggleState();
    updateLevelSelector();

    // Only reinitialize if not in an active game
    const isGameActive = !document.getElementById('gameContent').classList.contains('hidden');
    if (!isGameActive) {
        initializeGame();
    }

    // Update virtual keyboard labels
    updateVirtualKeyboardLabels();
}

function onLigatureToggleSettings() {
    useLigatures = document.getElementById('ligatureToggleSettings').checked;
    localStorage.setItem('useLigatures', useLigatures);
    updateLevelSelector();

    // Only reinitialize if not in an active game
    const isGameActive = !document.getElementById('gameContent').classList.contains('hidden');
    if (!isGameActive) {
        initializeGame();
    }
}

function onLevelCountChange() {
    levelCount = parseInt(document.getElementById('levelCountSelect').value);
    localStorage.setItem('levelCount', levelCount.toString());
}

function onLevelChange() {
    selectedLevel = document.getElementById('levelSelect').value;
    initializeGame();
}

function getLearnWords() {
    // Get the appropriate word list for current layout and ligature settings
    if (currentLayout === 'imperial') {
        return areLigaturesActive() ? learnWordsImperial : learnWordsImperialNoLig;
    } else if (currentLayout === 'igc') {
        return areLigaturesActive() ? learnWordsNewImperial : learnWordsNewImperialNoLig;
    } else if (currentLayout === 'qwerty') {
        return learnWordsQwerty;
    } else if (currentLayout === '2layer') {
        return learnWords2layer;
    } else if (currentLayout === 'jafl') {
        return areLigaturesActive() ? learnWordsJafl : learnWordsJaflNoLig;
    }
    return null;
}

function translateLessonName(nameKey) {
    const t = getCurrentTranslations();
    return t[nameKey] || nameKey;
}

function translateLessonDescription(descKey) {
    const t = getCurrentTranslations();
    return t[descKey] || descKey;
}

function updateLevelSelector() {
    const levelSelect = document.getElementById('levelSelect');

    // Level selector only exists in the main UI, not in settings
    if (!levelSelect) {
        return;
    }

    // Get the appropriate word list for current settings
    const learnWords = getLearnWords();

    // Clear existing options
    const t = getCurrentTranslations();
    levelSelect.innerHTML = ``;

    // Add lesson options with names
    if (learnWords) {
        const maxLevel = Object.keys(learnWords).length;

        for (let i = 1; i <= maxLevel; i++) {
            const levelData = learnWords[i];
            if (levelData) {
                const option = document.createElement('option');
                option.value = i;
                const translatedName = translateLessonName(levelData.nameKey);
                option.textContent = `${i}. ${translatedName}`;
                levelSelect.appendChild(option);
            }
        }
    }

    // Reset to level 1 if selected level is now unavailable
    const maxLevel = (currentLayout === 'imperial' && useLigatures) ? 7 : 6;
    if (parseInt(selectedLevel) > maxLevel) {
        selectedLevel = 1;
    }

    // Restore selected value
    levelSelect.value = selectedLevel;
}

// Level configuration for different level counts
const LEVEL_CONFIGS = {
    3: [
        { lengths: [1, 2, 3], titleKey: 'shortWords' },
        { lengths: [3, 4, 5], titleKey: 'mediumWords' },
        { lengths: [5, 6, 7], titleKey: 'longWords' }
    ],
    6: [
        { lengths: [1, 2], count: '1-2', unitKey: 'letters' },
        { lengths: [2, 3], count: '2-3', unitKey: 'letters' },
        { lengths: [3, 4], count: '3-4', unitKey: 'letters' },
        { lengths: [4, 5, 6], count: '4-6', unitKey: 'letters' },
        { lengths: [5, 6, 7], count: '5+', unitKey: 'letters' },
        { lengths: [6, 7], count: '6+', unitKey: 'letters' }
    ],
    10: [
        { lengths: [1], count: '1', unitKey: 'letter' },
        { lengths: [2], count: '2', unitKey: 'letters' },
        { lengths: [3], count: '3', unitKey: 'letters' },
        { lengths: [4], count: '4', unitKey: 'letters' },
        { lengths: [5], count: '5', unitKey: 'letters' },
        { lengths: [6], count: '6', unitKey: 'letters' },
        { lengths: [7], count: '7', unitKey: 'letters' },
        { lengths: [5, 6], count: '5-6', unitKey: 'letters' },
        { lengths: [6, 7], count: '6-7', unitKey: 'letters' },
        { lengths: [7], count: '7+', unitKey: 'letters' }
    ]
};

// Get word pool and metadata for a play level
function getPlayLevelData(levelNum) {
    // Return null if beyond configured level count
    if (levelNum > levelCount || levelNum < 1) {
        return null;
    }

    const config = LEVEL_CONFIGS[levelCount];
    if (!config || levelNum > config.length) {
        return null;
    }

    const levelConfig = config[levelNum - 1];
    const pool = [];

    // Combine words from all specified lengths
    levelConfig.lengths.forEach(length => {
        if (wordsByLength[length]) {
            pool.push(...wordsByLength[length]);
        }
    });

    const t = getCurrentTranslations();
    let title;
    if (levelConfig.titleKey) {
        // For 3-level mode: shortWords, mediumWords, longWords
        title = t[levelConfig.titleKey];
    } else {
        // For 6 and 10-level modes: programmatically build title like "1-2 Letters"
        title = `${levelConfig.count} ${t[levelConfig.unitKey]}`;
    }

    return {
        wordPool: pool,
        wordCount: 5,
        title: title
    };
}

// Get word pool and metadata for a learn lesson
function getLearnLessonData(lessonIndex) {
    let learnWords;

    if (currentLayout === 'imperial') {
        learnWords = areLigaturesActive() ? learnWordsImperial : learnWordsImperialNoLig;
    } else if (currentLayout === 'igc') {
        learnWords = areLigaturesActive() ? learnWordsNewImperial : learnWordsNewImperialNoLig;
    } else if (currentLayout === 'qwerty') {
        learnWords = learnWordsQwerty;
    } else if (currentLayout === '2layer') {
        learnWords = learnWords2layer;
    } else if (currentLayout === 'jafl') {
        learnWords = areLigaturesActive() ? learnWordsJafl : learnWordsJaflNoLig;
    }

    const levelData = learnWords[lessonIndex];
    if (levelData && levelData.words) {
        const t = getCurrentTranslations();
        const translatedName = t[levelData.nameKey] || levelData.nameKey;
        return {
            wordPool: levelData.words,
            wordCount: 10,
            title: translatedName
        };
    }

    return null;
}

// Load words from JSON
async function loadWords() {
    try {
        // Load practice words
        const wordsResponse = await fetch(versionedUrl(`words_${currentDialect}.json`));
        const wordsData = await wordsResponse.json();
        // Convert string keys to numbers
        Object.keys(wordsData).forEach(key => {
            wordsByLength[parseInt(key)] = wordsData[key];
        });

        // Load learn mode words for Imperial
        const learnImperialResponse = await fetch(versionedUrl(`learn_words_imperial_${currentDialect}.json`));
        const learnImperialData = await learnImperialResponse.json();
        // Convert string keys to numbers
        Object.keys(learnImperialData).forEach(key => {
            learnWordsImperial[parseInt(key)] = learnImperialData[key];
        });

        // Load learn mode words for QWERTY
        const learnQwertyResponse = await fetch(versionedUrl(`learn_words_qwerty_${currentDialect}.json`));
        const learnQwertyData = await learnQwertyResponse.json();
        // Convert string keys to numbers
        Object.keys(learnQwertyData).forEach(key => {
            learnWordsQwerty[parseInt(key)] = learnQwertyData[key];
        });

        // Load learn mode words for Imperial (no ligatures)
        const learnImperialNoLigResponse = await fetch(versionedUrl(`learn_words_imperial_${currentDialect}_no_lig.json`));
        const learnImperialNoLigData = await learnImperialNoLigResponse.json();
        // Convert string keys to numbers
        Object.keys(learnImperialNoLigData).forEach(key => {
            learnWordsImperialNoLig[parseInt(key)] = learnImperialNoLigData[key];
        });

        // Load learn mode words for New Imperial
        const learnNewImperialResponse = await fetch(versionedUrl(`learn_words_igc_${currentDialect}.json`));
        const learnNewImperialData = await learnNewImperialResponse.json();
        // Convert string keys to numbers
        Object.keys(learnNewImperialData).forEach(key => {
            learnWordsNewImperial[parseInt(key)] = learnNewImperialData[key];
        });

        // Load learn mode words for New Imperial (no ligatures)
        const learnNewImperialNoLigResponse = await fetch(versionedUrl(`learn_words_igc_${currentDialect}_no_lig.json`));
        const learnNewImperialNoLigData = await learnNewImperialNoLigResponse.json();
        // Convert string keys to numbers
        Object.keys(learnNewImperialNoLigData).forEach(key => {
            learnWordsNewImperialNoLig[parseInt(key)] = learnNewImperialNoLigData[key];
        });

        // Load learn mode words for Shaw 2-layer
        const learn2layerResponse = await fetch(versionedUrl(`learn_words_2layer_${currentDialect}.json`));
        const learn2layerData = await learn2layerResponse.json();
        // Convert string keys to numbers
        Object.keys(learn2layerData).forEach(key => {
            learnWords2layer[parseInt(key)] = learn2layerData[key];
        });

        // Load learn mode words for Shaw-JAFL (with ligatures)
        const learnJaflResponse = await fetch(versionedUrl(`learn_words_jafl_${currentDialect}.json`));
        const learnJaflData = await learnJaflResponse.json();
        // Convert string keys to numbers
        Object.keys(learnJaflData).forEach(key => {
            learnWordsJafl[parseInt(key)] = learnJaflData[key];
        });

        // Load learn mode words for Shaw-JAFL (no ligatures)
        const learnJaflNoLigResponse = await fetch(versionedUrl(`learn_words_jafl_${currentDialect}_no_lig.json`));
        const learnJaflNoLigData = await learnJaflNoLigResponse.json();
        // Convert string keys to numbers
        Object.keys(learnJaflNoLigData).forEach(key => {
            learnWordsJaflNoLig[parseInt(key)] = learnJaflNoLigData[key];
        });

        wordsLoaded = true;
        return true;
    } catch (error) {
        console.error('Failed to load words:', error);
        alert('Failed to load word list. Please refresh the page.');
        return false;
    }
}

// Initialize
async function init() {
    // Initialize virtual keyboard (encapsulated in virtual-keyboard.js)
    await initVirtualKeyboard(
        document.getElementById('virtualKeyboardContainer'),
        RESOURCE_VERSION
    );

    await loadWords();
    if (wordsLoaded) {
        // Show splash for all users (first-time and returning)
        // Splash will then show setup dialog for first-time users
        showSplashIfNeeded();
        // Start on home screen - don't auto-load game
        // User will click Play or Practice to start
    }
}

// Countdown state
let countdownTimeouts = [];
let countdownCancelled = false;

// Countdown animation before starting level
function showCountdown(wordPool, wordCount, type, title, typeLabel, completionCallback) {
    debug('[showCountdown] Starting countdown');

    // Show virtual keyboard if enabled (game is about to start)
    showVirtualKeyboardIfEnabled();

    // Clear any existing countdown
    cancelCountdown();
    countdownCancelled = false;

    const countdownScreen = document.getElementById('countdownScreen');
    const gameContent = document.getElementById('gameContent');
    const text = document.getElementById('countdownText');

    // Set instructions in subtitle
    const t = getCurrentTranslations();
    document.getElementById('mainSubtitle').textContent = t.gameInstructions;

    // Show countdown, hide game content
    countdownScreen.classList.remove('hidden');
    gameContent.classList.add('hidden');

    let count = 3;
    function updateCountdown() {
        if (countdownCancelled) return; // Stop if cancelled

        if (count > 0) {
            text.textContent = count;
            // Reset animation
            text.style.animation = 'none';
            const animTimeout = setTimeout(() => {
                if (countdownCancelled) return;
                text.style.animation = 'countdown-pulse 0.5s ease-in-out';
            }, 10);
            countdownTimeouts.push(animTimeout);
            count--;
            const nextTimeout = setTimeout(updateCountdown, 800);
            countdownTimeouts.push(nextTimeout);
        } else {
            // Hide countdown, show game content
            countdownScreen.classList.add('hidden');
            gameContent.classList.remove('hidden');
            // Call startLevel with the parameters
            startLevel(wordPool, wordCount, type, title, typeLabel, completionCallback);
        }
    }

    updateCountdown();
}

function cancelCountdown() {
    countdownCancelled = true;
    countdownTimeouts.forEach(timeout => clearTimeout(timeout));
    countdownTimeouts = [];
}

// Start a new level/lesson with given word pool, count, and metadata
function startLevel(wordPool, wordCount, type, title, typeLabel, completionCallback) {
    debug(`[startLevel] Starting ${type}: "${title}" (${wordCount} words from pool of ${wordPool.length})`);

    // Set level state
    currentLevelWordPool = wordPool;
    currentLevelWordCount = wordCount;
    currentLevelType = type;
    currentLevelTitle = title;
    currentLevelTypeLabel = typeLabel;
    currentLevelCompletionCallback = completionCallback;
    wordsInCurrentLevel = 0;
    currentLevelLettersTyped = 0;
    currentLevelCorrectLetters = 0;
    recentWords = [];

    // Initialize game (loads words)
    initializeGame();

    // Clear input and shadow
    typingInput.value = '';
    shadowInput = '';
    previousInput = '';
    maxEffectiveLength = 0;
    isInErrorState = false;

    // Start timer only for play mode at level 1 (beginning of game)
    if (currentMode === 'play' && currentLevelNumber === 1 && wordsCompleted === 0) {
        startTime = Date.now();
    }

    // Show virtual keyboard if setting is enabled
    // This will blur the input to prevent mobile OS keyboard
    showVirtualKeyboardIfEnabled();

    // Only focus input if virtual keyboard is NOT enabled
    const savedShowKeyboard = localStorage.getItem('showVirtualKeyboard');
    if (savedShowKeyboard !== 'true') {
        typingInput.focus();
    }
}

function pickRandomWord() {
    const pool = currentLevelWordPool;
    if (!pool || pool.length === 0) {
        console.error('No word pool available!');
        return '';
    }

    const historySize = Math.min(10, Math.floor(pool.length / 2));
    let newWord;
    let attempts = 0;
    const maxAttempts = 50;

    do {
        newWord = pool[Math.floor(Math.random() * pool.length)];
        attempts++;
    } while (recentWords.includes(newWord) && attempts < maxAttempts);

    // Update recent words history
    recentWords.push(newWord);
    if (recentWords.length > historySize) {
        recentWords.shift();
    }

    return newWord;
}

function loadNewWord() {
    // Check if this is the last word of the level
    const isLastWordOfLevel = (wordsInCurrentLevel === currentLevelWordCount - 1);

    debug(`[loadNewWord] wordsInCurrentLevel=${wordsInCurrentLevel}, wordCount=${currentLevelWordCount}, isLastWord=${isLastWordOfLevel}`);

    // BEFORE advancing: update the slot that will become "next" after rotation
    // The slot at prev-prev position will rotate to next position
    const prevPrevSlot = (carouselOffset - 2 + 4) % 4;
    const slot = wordSlots[prevPrevSlot];

    // For the last word of a level, put an empty string in the next slot
    const newWord = isLastWordOfLevel ? '' : pickRandomWord();
    words[prevPrevSlot] = newWord;

    debug(`[loadNewWord] newWord="${newWord}", slot=${prevPrevSlot}`);

    if (newWord) {
        // Load a new word normally
        // Disable transitions for the new slot so it appears instantly
        slot.style.transition = 'none';

        // Form ligatures in the word if enabled (for display purposes)
        const displayWord = areLigaturesActive() ? formLigaturesInWord(newWord) : newWord;

        // Update the slot's HTML content so offsetWidth is accurate
        let html = '';
        const wordChars = Array.from(displayWord);
        for (let j = 0; j < wordChars.length; j++) {
            html += `<span class="char">${wordChars[j]}</span>`;
        }
        slot.innerHTML = html;

        // Position it at next-next location (after current next word) BEFORE advancing
        // Calculate where next-next should be
        const currentSlotIndex = carouselOffset;
        const nextSlotIndex = (carouselOffset + 1) % 4;
        const carouselWidth = wordSlots[0].parentElement.clientWidth;
        const currentWidth = wordSlots[currentSlotIndex].offsetWidth;
        const nextWidth = wordSlots[nextSlotIndex].offsetWidth;
        const currentX = (carouselWidth / 2) - (currentWidth / 2);
        const nextX = currentX + currentWidth;
        const nextNextX = nextX + nextWidth;

        // Position the new slot at next-next location and make it visible
        slot.classList.remove('pos-prev-prev', 'pos-prev', 'pos-current', 'pos-next');
        slot.classList.add('pos-next-next');
        slot.style.transform = `translateX(${nextNextX}px) translateY(-50%)`;

        // Force reflow to apply the next-next position
        slot.offsetHeight;

        // Re-enable transitions so it can animate when repositioned
        slot.style.transition = '';
    } else {
        // Empty slot for after last word
        debug('[loadNewWord] Last word - empty next slot');
        slot.innerHTML = '';
    }

    // NOW advance carousel
    carouselOffset = (carouselOffset + 1) % 4;

    // Get current word from carousel
    currentWord = words[carouselOffset];

    // If ligatures are enabled, form them in the expected word
    if (areLigaturesActive()) {
        currentWord = formLigaturesInWord(currentWord);
    }

    // Append space or period to currentWord
    if (isLastWordOfLevel) {
        currentWord = currentWord + '.';
    } else {
        currentWord = currentWord + ' ';
    }

    // Store the processed word back (with ligatures if enabled, and space if needed)
    words[carouselOffset] = currentWord;

    typingInput.value = '';
    shadowInput = '';
    previousInput = '';
    maxEffectiveLength = 0;
    isInErrorState = false;
    updateWordDisplay();

    updateLevel();
}

function initializeGame() {
    debug(`[initializeGame] wordPool length: ${currentLevelWordPool.length}, wordCount: ${currentLevelWordCount}`);
    // Reset carousel completely
    words = ['', '', '', ''];
    carouselOffset = 2; // Will advance to 3, then 0
    // Run the cycle twice to load first two words
    loadNewWord(); // Loads first word, advances to offset 3
    loadNewWord(); // Loads second word, advances to offset 0 (current)
}

function advanceToNextWord() {
    // Just call loadNewWord - carousel positions will update via CSS transitions
    loadNewWord();
}

function updateLevel() {
    // Display the current level/lesson number
    levelDisplayEl.textContent = currentLevelNumber;
}

// Calculate appropriate font size based on max word length
function getFontSizeForMaxLength(maxLength) {
    const baseFontSize = 48;
    // Reduce font size as max length increases: 48px for short words, down to 24px for very long
    if (maxLength <= 4) return baseFontSize;
    if (maxLength <= 6) return 42;
    if (maxLength <= 8) return 36;
    if (maxLength <= 10) return 30;
    return 24;
}

function updateWordDisplay() {
    const userInput = typingInput.value;

    // Calculate max word length in current pool for font sizing
    let maxWordLength = 4;
    if (currentLevelWordPool && currentLevelWordPool.length > 0) {
        maxWordLength = Math.max(...currentLevelWordPool.map(w => Array.from(w).length));
    }
    const fontSize = getFontSizeForMaxLength(maxWordLength);

    // Update each carousel slot
    for (let i = 0; i < 4; i++) {
        const slot = wordSlots[i];
        const word = words[i];

        // Calculate position relative to current
        const posOffset = (i - carouselOffset + 4) % 4;

        // Remove old position classes
        slot.className = 'word-slot slot-' + i;

        // Set font size based on max word length
        slot.style.fontSize = fontSize + 'px';

        // Add appropriate position class
        if (posOffset === 0) {
            // Current word
            slot.classList.add('pos-current');

            // Build HTML with coloring for current word
            let html = '';
            const wordChars = Array.from(currentWord);
            const inputChars = Array.from(userInput);

            // Normalize arrays to treat char+VS1 as single units for comparison
            const normalizedWordChars = normalizeCharArray(wordChars);
            const normalizedInputChars = normalizeCharArray(inputChars);
            const isPending = isPendingLigatureStart(inputChars, wordChars);

            for (let j = 0; j < normalizedWordChars.length; j++) {
                const char = normalizedWordChars[j];
                let className = '';

                if (j < normalizedInputChars.length) {
                    // User has typed this position
                    if (normalizedInputChars[j] === char) {
                        className = 'correct';
                    } else if (isPending && j === normalizedInputChars.length - 1) {
                        // Waiting for ligature completion - don't mark as wrong yet
                        className = '';
                    } else {
                        className = 'incorrect';
                    }
                }
                // else: not typed yet, no className

                html += `<span class="char ${className}">${char}</span>`;
            }
            slot.innerHTML = html;
        } else if (posOffset === 1) {
            // Next word
            slot.classList.add('pos-next');
            const displayWord = (useLigatures && word) ? formLigaturesInWord(word) : (word || '');
            let html = '';
            const wordChars = Array.from(displayWord);
            for (let j = 0; j < wordChars.length; j++) {
                html += `<span class="char">${wordChars[j]}</span>`;
            }
            slot.innerHTML = html;
        } else if (posOffset === 3) {
            // Previous word (already has ligatures formed when it was current)
            slot.classList.add('pos-prev');
            let html = '';
            const wordChars = Array.from(word || '');
            for (let j = 0; j < wordChars.length; j++) {
                html += `<span class="char">${wordChars[j]}</span>`;
            }
            slot.innerHTML = html;
        } else {
            // Previous-previous word (off screen)
            slot.classList.add('pos-prev-prev');
            slot.innerHTML = '';
        }
    }

    // Calculate positions based on actual widths
    // Wait for next frame to ensure content is rendered
    requestAnimationFrame(() => {
        const carouselWidth = wordSlots[0].parentElement.clientWidth;

        // Find which slot is at each position
        let currentSlot = -1, prevSlot = -1, nextSlot = -1, nextNextSlot = -1;
        for (let i = 0; i < 4; i++) {
            const posOffset = (i - carouselOffset + 4) % 4;
            if (posOffset === 0) currentSlot = i;
            else if (posOffset === 1) nextSlot = i;
            else if (posOffset === 2) nextNextSlot = i;
            else if (posOffset === 3) prevSlot = i;
        }

        // Get widths
        const currentWidth = wordSlots[currentSlot].offsetWidth;
        const prevWidth = prevSlot >= 0 ? wordSlots[prevSlot].offsetWidth : 0;
        const nextWidth = nextSlot >= 0 ? wordSlots[nextSlot].offsetWidth : 0;

        // Calculate positions - center current word, position others relative to it
        const currentX = (carouselWidth / 2) - (currentWidth / 2);
        const prevX = currentX - prevWidth;
        const nextX = currentX + currentWidth;
        const nextNextX = nextX + nextWidth;

        // Apply transforms (include translateY for vertical centering)
        wordSlots[currentSlot].style.transform = `translateX(${currentX}px) translateY(-50%)`;
        if (prevSlot >= 0) wordSlots[prevSlot].style.transform = `translateX(${prevX}px) translateY(-50%)`;
        if (nextSlot >= 0) wordSlots[nextSlot].style.transform = `translateX(${nextX}px) translateY(-50%)`;
        if (nextNextSlot >= 0) wordSlots[nextNextSlot].style.transform = `translateX(${nextNextX}px) translateY(-50%)`;
    });
}

function updateStats() {
    wordCountEl.textContent = wordsCompleted;
    const accuracy = totalLettersTyped === 0 ? 100 : ((correctLetters / totalLettersTyped) * 100).toFixed(1);
    accuracyEl.textContent = accuracy + '%';
}

function checkCompletion() {
    const userInput = typingInput.value;

    // Check if user typed the complete word correctly
    if (userInput === currentWord) {
        // Word completed correctly
        wordsCompleted++;
        wordsInCurrentLevel++;
        debug(`[checkCompletion] Word ${wordsInCurrentLevel}/${currentLevelWordCount} of level completed (total: ${wordsCompleted}), currentMode=${currentMode}, currentLevelNumber=${currentLevelNumber}, levelCount=${levelCount}`);
        updateStats();

        // After first word, update subtitle with level/lesson info
        if (wordsCompleted === 1) {
            document.getElementById('mainSubtitle').textContent =
                `${currentLevelTypeLabel} ${currentLevelNumber}: ${currentLevelTitle}`;
        }

        // Check if level is complete
        if (wordsInCurrentLevel >= currentLevelWordCount) {
            // Level completed - transition to next level
            debug(`[checkCompletion] ${currentLevelType.toUpperCase()} COMPLETED - calling transitionToNextLevel()`);
            transitionToNextLevel();
        } else {
            // Advance to next word
            debug(`[checkCompletion] Advancing to next word`);
            advanceToNextWord();
        }
    }
}

function transitionToNextLevel() {
    debug(`[transitionToNextLevel] Starting transition - currentMode=${currentMode}, currentLevelNumber=${currentLevelNumber}, levelCount=${levelCount}, wordsInCurrentLevel=${wordsInCurrentLevel}, currentLevelWordCount=${currentLevelWordCount}, hasCallback=${!!currentLevelCompletionCallback}`);

    // Save stats for completed level
    const finalLevelAccuracy = currentLevelLettersTyped === 0 ? 100.0 :
        ((currentLevelCorrectLetters / currentLevelLettersTyped) * 100);
    levelStats.push({
        level: currentLevelNumber,
        accuracy: finalLevelAccuracy,
        lettersTyped: currentLevelLettersTyped,
        correctLetters: currentLevelCorrectLetters
    });

    // If there's a completion callback, use it
    if (currentLevelCompletionCallback) {
        debug(`[transitionToNextLevel] Calling completion callback`);
        currentLevelCompletionCallback();
        return;
    }

    // Default behavior: try to advance to next level
    let nextLevelData = null;
    if (currentMode === 'learn') {
        const nextLessonIndex = parseInt(selectedLevel) + 1;
        debug(`[transitionToNextLevel] LEARN mode: checking for next lesson ${nextLessonIndex}`);
        nextLevelData = getLearnLessonData(nextLessonIndex);
        if (nextLevelData) {
            debug(`[transitionToNextLevel] Found next lesson data`);
            selectedLevel = nextLessonIndex.toString();
            currentLevelNumber = nextLessonIndex;
        } else {
            debug(`[transitionToNextLevel] No more lessons available`);
        }
    } else {
        const nextLevelNum = currentLevelNumber + 1;
        debug(`[transitionToNextLevel] PLAY mode: currentLevelNumber=${currentLevelNumber}, nextLevelNum=${nextLevelNum}, levelCount=${levelCount}`);
        // Try to get next level data (getPlayLevelData will return null if beyond available levels)
        nextLevelData = getPlayLevelData(nextLevelNum);
        if (nextLevelData) {
            debug(`[transitionToNextLevel] Found next level data for level ${nextLevelNum}`);
            currentLevelNumber = nextLevelNum;
        } else {
            debug(`[transitionToNextLevel] No more levels available after level ${currentLevelNumber}`);
        }
    }

    if (nextLevelData) {
        debug(`[transitionToNextLevel] Starting next level`);
        // Start new level with new words (no countdown between levels!)
        const t = getCurrentTranslations();
        const type = currentMode === 'learn' ? 'lesson' : 'level';
        const typeLabel = type === 'lesson' ? t.lesson_label : t.level_label;

        // Set subtitle based on mode
        if (type === 'lesson') {
            // For lessons, show instructions initially (will update after first word)
            document.getElementById('mainSubtitle').textContent = t.gameInstructions;
        } else {
            // For play mode, immediately show the level info
            document.getElementById('mainSubtitle').textContent =
                `${typeLabel} ${currentLevelNumber}: ${nextLevelData.title}`;
        }

        // Just start the level directly (both play and practice)
        startLevel(nextLevelData.wordPool, nextLevelData.wordCount, type, nextLevelData.title, typeLabel, currentLevelCompletionCallback);
    } else {
        debug(`[transitionToNextLevel] No more levels - showing completion modal`);
        // No more levels/lessons - show completion modal
        showCompletionModal();
    }
}

function showLessonCompletionDialog() {
    // Hide virtual keyboard temporarily while modal is shown
    hideVirtualKeyboardTemporarily();

    // Calculate stats for this lesson
    const accuracy = totalLettersTyped === 0 ? 100.0 : ((correctLetters / totalLettersTyped) * 100);
    const accuracyFormatted = accuracy.toFixed(1) + '%';

    // Set modal content for lesson completion
    const t = getCurrentTranslations();
    document.getElementById('congratulations').textContent = t.lessonComplete;

    // Hide game-specific stats
    document.getElementById('finalScore').style.display = 'none';
    document.getElementById('finalWPM').parentElement.style.display = 'none';
    document.getElementById('finalLPM').parentElement.style.display = 'none';
    document.getElementById('levelReachedRow').style.display = 'none';
    document.getElementById('levelStatsContainer').style.display = 'none';

    // Show accuracy
    document.getElementById('finalAccuracy').textContent = accuracyFormatted;
    document.getElementById('finalAccuracy').parentElement.style.display = 'block';

    // Show lesson completion buttons
    const learnWords = getLearnWords();
    const maxLesson = learnWords ? Object.keys(learnWords).length : 6;
    const hasNextLesson = parseInt(selectedLevel) < maxLesson;

    document.getElementById('completionButtons').innerHTML = `
        <button onclick="continueLesson()">Keep practicing this lesson</button>
        ${hasNextLesson ? '<button onclick="nextLesson()" style="margin-left: 10px;">Next lesson</button>' : ''}
        <button onclick="chooseDifferentLesson()" style="margin-left: 10px; background: white; color: #667eea; border: 2px solid #667eea;">Choose Different Lesson</button>
    `;

    document.getElementById('completionModal').classList.add('show');
}

function showCompletionModal() {
    // Hide virtual keyboard temporarily while modal is shown
    hideVirtualKeyboardTemporarily();

    // Stats already saved in transitionToNextLevel
    const accuracy = totalLettersTyped === 0 ? 100.0 : ((correctLetters / totalLettersTyped) * 100);
    const accuracyFormatted = accuracy.toFixed(1) + '%';

    // Calculate time-based metrics (excluding paused time)
    const endTime = Date.now();
    const elapsedMilliseconds = (endTime - startTime) - totalPausedTime;
    const elapsedSeconds = elapsedMilliseconds / 1000;
    const elapsedMinutes = elapsedSeconds / 60;
    const wpm = wordsCompleted / elapsedMinutes;
    const lettersPerMinute = totalLettersTyped / elapsedMinutes;

    // Format time as MM:SS
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = Math.floor(elapsedSeconds % 60);
    const timeFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    // Track high scores per level count
    const levelCountKey = levelCount.toString();
    if (!highScores[levelCountKey]) {
        highScores[levelCountKey] = { time: null, wpm: null, accuracy: null };
    }

    const currentHighScores = highScores[levelCountKey];
    let isNewTimeRecord = false;
    let isNewWPMRecord = false;
    let isNewAccuracyRecord = false;

    // Check and update time record (lower is better)
    if (currentHighScores.time === null || elapsedSeconds < currentHighScores.time) {
        currentHighScores.time = elapsedSeconds;
        isNewTimeRecord = true;
    }

    // Check and update WPM record (higher is better)
    if (currentHighScores.wpm === null || wpm > currentHighScores.wpm) {
        currentHighScores.wpm = wpm;
        isNewWPMRecord = true;
    }

    // Check and update accuracy record (higher is better)
    if (currentHighScores.accuracy === null || accuracy > currentHighScores.accuracy) {
        currentHighScores.accuracy = accuracy;
        isNewAccuracyRecord = true;
    }

    // Save high scores
    localStorage.setItem('highScores', JSON.stringify(highScores));

    // Legacy bestTime support
    const isNewBest = bestTime === null || elapsedSeconds < bestTime;
    if (isNewBest) {
        bestTime = elapsedSeconds;
    }

    // Get translations
    const t = getCurrentTranslations();

    // Customize modal based on mode
    if (currentMode === 'learn') {
        document.getElementById('congratulations').textContent = t.sessionComplete;
        document.getElementById('levelReachedRow').style.display = 'none';
        document.getElementById('levelStatsContainer').style.display = 'none';

        // Show buttons for continue or choose lesson
        document.getElementById('completionButtons').innerHTML = `
            <button onclick="continueLesson()">Continue</button>
            <button onclick="chooseDifferentLesson()" style="margin-left: 10px; background: white; color: #667eea; border: 2px solid #667eea;">Choose Different Lesson</button>
        `;
    } else {
        document.getElementById('congratulations').textContent = t.congratulations;
        document.getElementById('levelReachedRow').style.display = 'block';
        document.getElementById('levelStatsContainer').style.display = 'block';

        document.getElementById('finalLevel').textContent = currentLevelNumber;

        // Generate per-level stats HTML
        let levelStatsHTML = '';
        levelStats.forEach(stat => {
            const levelAccuracyFormatted = stat.accuracy.toFixed(1);
            const levelLabel = currentMode === 'learn' ? t.lesson_label : t.level_label;
            levelStatsHTML += `<div class="level-stat">${levelLabel} ${stat.level}: ${levelAccuracyFormatted}%</div>`;
        });
        document.getElementById('levelStatsContainer').innerHTML = levelStatsHTML;

        document.getElementById('completionButtons').innerHTML = `
            <button onclick="playAgain()">${t.practiceAgain}</button>
        `;
    }

    // Update main display (time is the primary score)
    // Show "New Personal Best:" label above time if it's a record
    const pbLabel = document.getElementById('personalBestLabel');
    if (isNewTimeRecord) {
        pbLabel.textContent = t.newPersonalBest || 'New Personal Best:';
        pbLabel.style.display = 'block';
    } else {
        pbLabel.style.display = 'none';
    }

    document.getElementById('finalScore').textContent = timeFormatted;
    document.getElementById('finalScore').style.display = 'block';

    // Update all stat rows and show them for play mode
    const accuracyRow = document.getElementById('finalAccuracy').parentElement;
    document.getElementById('finalAccuracy').textContent = accuracyFormatted;
    accuracyRow.style.display = 'block';
    if (isNewAccuracyRecord) {
        accuracyRow.style.color = '#28a745';
        document.getElementById('finalAccuracy').textContent = accuracyFormatted + pbText;
    } else {
        accuracyRow.style.color = '';
        document.getElementById('finalAccuracy').textContent = accuracyFormatted;
    }

    const wpmRow = document.getElementById('finalWPM').parentElement;
    document.getElementById('finalWPM').textContent = wpm.toFixed(1);
    wpmRow.style.display = 'block';
    if (isNewWPMRecord) {
        wpmRow.style.color = '#28a745';
    } else {
        wpmRow.style.color = '';
    }

    document.getElementById('finalLPM').textContent = lettersPerMinute.toFixed(0);
    document.getElementById('finalLPM').parentElement.style.display = 'block';

    document.getElementById('completionModal').classList.add('show');
}

function resetPractice() {
    // Reset all stats
    wordsCompleted = 0;
    totalLettersTyped = 0;
    correctLetters = 0;
    currentLevelNumber = 1;
    recentWords = [];
    levelStats = [];

    // Hide modal
    document.getElementById('completionModal').classList.remove('show');

    // Update display
    updateStats();
    updateLevel();

    // Start first level
    const t = getCurrentTranslations();

    if (currentMode === 'play') {
        const levelData = getPlayLevelData(1);
        // Set instructions in subtitle
        document.getElementById('mainSubtitle').textContent = t.gameInstructions;
        startLevel(levelData.wordPool, levelData.wordCount, 'level', levelData.title, t.level_label, null);
    } else {
        // In learn mode, use the selected lesson
        // Set instructions in subtitle
        document.getElementById('mainSubtitle').textContent = t.gameInstructions;

        const levelData = getLearnLessonData(parseInt(selectedLevel));
        if (levelData) {
            currentLevelNumber = parseInt(selectedLevel);
            startLevel(levelData.wordPool, levelData.wordCount, 'lesson', levelData.title, t.lesson_label, showLessonCompletionDialog);
        }
    }
}

function continueLesson() {
    // Reset session stats but keep same lesson
    wordsCompleted = 0;
    totalLettersTyped = 0;
    correctLetters = 0;

    // Hide modal
    document.getElementById('completionModal').classList.remove('show');

    // Update display
    updateStats();

    // Restart current level/lesson with same word pool
    startLevel(currentLevelWordPool, currentLevelWordCount, currentLevelType, currentLevelTitle, currentLevelTypeLabel, currentLevelCompletionCallback);
    // Note: startLevel handles focus based on virtual keyboard setting
}

function nextLesson() {
    // Advance to next lesson
    const nextLessonNum = parseInt(selectedLevel) + 1;
    const learnWords = getLearnWords();
    const maxLesson = learnWords ? Object.keys(learnWords).length : 6;

    if (nextLessonNum <= maxLesson) {
        selectedLevel = nextLessonNum.toString();

        // Hide modal
        document.getElementById('completionModal').classList.remove('show');

        // Reset session stats
        wordsCompleted = 0;
        totalLettersTyped = 0;
        correctLetters = 0;
        recentWords = [];
        currentLevelLettersTyped = 0;
        currentLevelCorrectLetters = 0;
        updateStats();

        // Start next lesson
        const t = getCurrentTranslations();
        const levelData = getLearnLessonData(nextLessonNum);
        if (levelData) {
            currentLevelNumber = nextLessonNum;
            startLevel(levelData.wordPool, levelData.wordCount, 'lesson', levelData.title, t.lesson_label, showLessonCompletionDialog);
            // Note: startLevel handles focus based on virtual keyboard setting
        }
    }
}

function chooseDifferentLesson() {
    // Hide completion modal
    document.getElementById('completionModal').classList.remove('show');

    // Reset session stats
    wordsCompleted = 0;
    totalLettersTyped = 0;
    correctLetters = 0;
    recentWords = [];
    currentLevelLettersTyped = 0;
    currentLevelCorrectLetters = 0;
    updateStats();

    // Open lesson selector
    openLessonSelector();
}

// Expose helper functions for console testing
// Helper function to set the current word (for testing)
// Usage: loadWord("𐑕𐑩𐑥𐑢𐑻𐑛")
window.loadWord = function(word) {
    const currentSlot = carouselOffset;
    words[currentSlot] = word;
    currentWord = word;

    // Clear input and reset state
    typingInput.value = '';
    shadowInput = '';
    previousInput = '';
    maxEffectiveLength = 0;
    isInErrorState = false;

    // Temporarily modify word pool to include this word at max length for font sizing test
    const wordLength = Array.from(word).length;
    const tempPool = [...(currentLevelWordPool || []), word];
    currentLevelWordPool = tempPool;

    // Update display to show the word and apply font sizing
    updateWordDisplay();

    debug(`[loadWord] Current word set to: "${word}" (length: ${wordLength})`);
};

// Helper function to advance to next word with a specific word (for testing)
// Usage: setNextWord("𐑕𐑩𐑥𐑢𐑻𐑛")
window.setNextWord = function(word) {
    // Advance carousel as if completing current word
    carouselOffset = (carouselOffset + 1) % 4;

    // Set the new "next-next" word (slot that will become next after this rotation)
    const nextNextSlot = (carouselOffset + 2) % 4;
    words[nextNextSlot] = word;

    // Update currentWord to the new current slot
    currentWord = words[carouselOffset];

    // Clear input and reset state for new word
    typingInput.value = '';
    shadowInput = '';
    previousInput = '';
    maxEffectiveLength = 0;
    isInErrorState = false;

    // Temporarily modify word pool to include this word at max length for font sizing test
    const wordLength = Array.from(word).length;
    const tempPool = [...(currentLevelWordPool || []), word];
    currentLevelWordPool = tempPool;

    // Update display to show the rotated carousel and apply font sizing
    updateWordDisplay();

    debug(`[setNextWord] Advanced carousel, current="${currentWord}", queued="${word}" (length: ${wordLength})`);
};

// Event listeners
let previousInput = '';  // For error state reversion
let maxEffectiveLength = 0;  // High water mark for counting (excludes pending ligature starts)
let isInErrorState = false; // Track if last typed character was incorrect

// Helper: Convert string to array of Unicode code points for debugging
function toCodePoints(str) {
    return Array.from(str).map(c =>
        'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')
    ).join(' ');
}

// Helper: Form ligatures in input string if enabled
function formLigatures(input) {
    if (!areLigaturesActive()) return input;
    const componentToLigature = getCurrentComponentToLigature();
    const chars = Array.from(input);

    // Normalize to treat base+VS1 as single units
    const normalizedChars = normalizeCharArray(chars);

    // Check if last 2 normalized characters form a ligature
    if (normalizedChars.length >= 2) {
        const lastTwo = normalizedChars[normalizedChars.length - 2] + normalizedChars[normalizedChars.length - 1];
        debug('🔗 LIGATURE CHECK: lastTwo="' + lastTwo + '" [' + toCodePoints(lastTwo) + ']' +
              ' | maps to: ' + (componentToLigature[lastTwo] || 'none'));
        if (componentToLigature[lastTwo]) {
            const result = normalizedChars.slice(0, -2).join('') + componentToLigature[lastTwo];
            debug('✅ LIGATURE FORMED: "' + result + '" [' + toCodePoints(result) + ']');
            return result;
        }
    }

    return input;
}

// Helper: Normalize character array to merge VS1 with preceding character
// Converts ['𐑻', '︀', '𐑮'] to ['𐑻︀', '𐑮']
function normalizeCharArray(chars) {
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

// Helper: Check if last character is a pending ligature start
function isPendingLigatureStart(inputChars, wordChars) {
    if (!areLigaturesActive() || inputChars.length === 0) return false;

    // Normalize arrays to treat char+VS1 as single units
    const normalizedInput = normalizeCharArray(inputChars);
    const normalizedWord = normalizeCharArray(wordChars);

    const lastIdx = normalizedInput.length - 1;
    if (lastIdx >= normalizedWord.length) return false;

    const expectedChar = normalizedWord[lastIdx];
    const lastChar = normalizedInput[lastIdx];

    // Check if the last character is the first of any pair that forms the expected ligature
    const ligatures = getCurrentLayoutLigatures();
    if (ligatures[expectedChar]) {
        return ligatures[expectedChar].some(pair => pair[0] === lastChar);
    }

    return false;
}

// Helper: Update shadow input based on InputEvent
// Returns the updated shadow input string
// browserValue is what the browser's input field currently shows (after the event)
function updateShadowInput(inputType, eventData, currentShadow, browserValue) {
    switch (inputType) {
        case 'insertText':
            // Normal typing - append what was actually typed (preserves VS1)
            return currentShadow + (eventData || '');

        case 'deleteContentBackward':
            // Backspace - remove last character (treating base+VS1 as single unit)
            const chars = Array.from(currentShadow); // Split into code points
            if (chars.length === 0) return '';

            // Check if last code point is VS1 (U+FE00)
            if (chars.length >= 2 && chars[chars.length - 1].codePointAt(0) === 0xFE00) {
                // Last code point is VS1, delete both base character and VS1
                return chars.slice(0, -2).join('');
            }

            // Normal deletion - remove last code point
            return chars.slice(0, -1).join('');

        case 'deleteContentForward':
            // Delete key - remove first character (shouldn't happen in our UI)
            const charsForward = Array.from(currentShadow);
            return charsForward.slice(1).join('');

        case 'insertReplacementText':
            // Safari uses this for ligature formation from virtual keyboard
            // Use the replacement range captured from beforeinput event
            if (pendingReplacementStart >= 0 && pendingReplacementEnd >= 0) {
                const chars = Array.from(currentShadow);
                const before = chars.slice(0, pendingReplacementStart).join('');
                const after = chars.slice(pendingReplacementEnd).join('');
                const result = before + (eventData || '') + after;
                // Reset pending replacement
                pendingReplacementStart = -1;
                pendingReplacementEnd = -1;
                return result;
            }
            // Fallback if we didn't capture the range
            return browserValue;

        case 'insertFromPaste':
        case 'insertFromDrop':
            // Paste or drop - replace entire content
            return eventData || browserValue;

        case 'deleteWordBackward':
        case 'deleteWordForward':
        case 'deleteByCut':
            // Word deletion or cut - use browser's resulting value
            return browserValue;

        case 'insertCompositionText':
            // IME composition - trust browser value
            return browserValue;

        default:
            // Unknown or null inputType - trust browser value
            return browserValue;
    }
}

// Helper: Update statistics based on new input length
function updateInputStatistics(effectiveLength, inputChars, wordChars) {
    if (effectiveLength < maxEffectiveLength) {
        // Backspace or deletion - clear error state
        isInErrorState = false;
        maxEffectiveLength = effectiveLength;
    } else if (effectiveLength > maxEffectiveLength) {
        // New characters to count
        const numNew = effectiveLength - maxEffectiveLength;
        totalLettersTyped += numNew;
        currentLevelLettersTyped += numNew;

        // Check correctness
        let allCorrect = true;
        for (let i = maxEffectiveLength; i < effectiveLength; i++) {
            if (i >= wordChars.length || inputChars[i] !== wordChars[i]) {
                allCorrect = false;
                break;
            }
        }

        if (allCorrect) {
            correctLetters += numNew;
            currentLevelCorrectLetters += numNew;
            isInErrorState = false;
        } else {
            isInErrorState = true;
        }

        maxEffectiveLength = effectiveLength;
    }
}

// Helper: Convert UTF-16 code unit position to character index
function codeUnitPosToCharIndex(str, codeUnitPos) {
    let charIndex = 0;
    let codeUnitIndex = 0;
    for (const char of str) {
        if (codeUnitIndex >= codeUnitPos) break;
        codeUnitIndex += char.length; // Shavian chars are 2 code units
        charIndex++;
    }
    return charIndex;
}

// Capture target ranges before input is processed (for insertReplacementText)
typingInput.addEventListener('beforeinput', (e) => {
    if (e.inputType === 'insertReplacementText') {
        // Get the selection/range being replaced (in UTF-16 code units)
        const startCodeUnit = typingInput.selectionStart;
        const endCodeUnit = typingInput.selectionEnd;

        // Convert to character positions for shadow input
        const currentValue = typingInput.value;
        pendingReplacementStart = codeUnitPosToCharIndex(currentValue, startCodeUnit);
        pendingReplacementEnd = codeUnitPosToCharIndex(currentValue, endCodeUnit);

        debug('🔍 BEFOREINPUT: replacing code units ' + startCodeUnit + '-' + endCodeUnit +
              ' (chars ' + pendingReplacementStart + '-' + pendingReplacementEnd + ')' +
              ' with "' + (e.data || '') + '" [' + toCodePoints(e.data || '') + ']');
    }
});

typingInput.addEventListener('input', (e) => {
    let browserInput = e.target.value;
    let eventData = e.data || '';

    // Use virtual keyboard translator to handle QWERTY -> Shavian translation
    if (typeof translateInputEvent === 'function') {
        const translated = translateInputEvent(e, browserInput, currentLayout, useVirtualKeyboard, debug);
        eventData = translated.eventData;
        browserInput = translated.browserInput;
    }

    // Check if this character would complete a ligature
    let completesLigature = false;
    if (areLigaturesActive() && e.inputType === 'insertText' && eventData) {
        const chars = Array.from(shadowInput);
        const normalizedChars = normalizeCharArray(chars);
        if (normalizedChars.length > 0) {
            const potentialPair = normalizedChars[normalizedChars.length - 1] + eventData;
            const componentToLigature = getCurrentComponentToLigature();
            completesLigature = !!componentToLigature[potentialPair];
        }
    }

    // Block if user is in error state and trying to add more characters
    // (but allow ligature completion)
    const isAddingCharacters = e.inputType === 'insertText' ||
                              e.inputType === 'insertFromPaste' ||
                              e.inputType === 'insertReplacementText';

    if (isInErrorState && isAddingCharacters && !completesLigature) {
        // Block the input - revert and flash red
        typingInput.value = previousInput;
        typingInput.style.animation = 'none';
        setTimeout(() => {
            typingInput.style.animation = 'error-flash 0.4s ease-out';
        }, 10);
        debug('🚫 BLOCKED: user in error state, rejecting input');
        return;
    }

    if (completesLigature) {
        debug('✅ ALLOWING: completes ligature' + (isInErrorState ? ' (in error state)' : ''));
    }

    // Update shadow input based on what was actually typed
    shadowInput = updateShadowInput(e.inputType, eventData, shadowInput, browserInput);

    // Debug: log raw input with Unicode code points
    debug('📥 INPUT: browser="' + browserInput + '" [' + toCodePoints(browserInput) + ']' +
          ' | inputType=' + e.inputType +
          ' | event.data="' + eventData + '" [' + toCodePoints(eventData) + ']' +
          ' | shadow="' + shadowInput + '" [' + toCodePoints(shadowInput) + ']' +
          ' | expected="' + currentWord + '" [' + toCodePoints(currentWord) + ']');

    // Use shadow input as source of truth
    let userInput = shadowInput;

    // Ignore leading spaces at the start of the level
    if (maxEffectiveLength === 0 && userInput.trim() === '') {
        shadowInput = '';
        typingInput.value = '';
        return;
    }

    // Form ligatures if enabled (for keyboards that don't do it themselves)
    userInput = formLigatures(userInput);

    // Update both shadow and display to match formed ligatures
    shadowInput = userInput;
    typingInput.value = userInput;

    // Get character arrays for comparison
    const inputChars = Array.from(userInput);
    const wordChars = Array.from(currentWord);

    // Normalize to treat char+VS1 as single units
    const normalizedInputChars = normalizeCharArray(inputChars);
    const normalizedWordChars = normalizeCharArray(wordChars);

    // Calculate effective length (excludes pending ligature start)
    const pendingLigature = isPendingLigatureStart(inputChars, wordChars);
    const effectiveLength = pendingLigature ? normalizedInputChars.length - 1 : normalizedInputChars.length;

    // Update statistics
    const result = updateInputStatistics(effectiveLength, normalizedInputChars, normalizedWordChars);
    previousInput = typingInput.value;

    // Debug: log final state
    debug('📊 POSTCONDITION: input=' + JSON.stringify(typingInput.value) +
          ', correct=' + correctLetters + '/' + totalLettersTyped +
          ', maxEffectiveLength=' + maxEffectiveLength +
          ', isInErrorState=' + isInErrorState);

    updateWordDisplay();
    updateStats();
    checkCompletion();
});

// No need for separate keydown handler - space is part of the word now
// Auto-advance happens in checkCompletion when word+space is typed

// Burger menu functions
function toggleBurgerMenu() {
    const dropdown = document.getElementById('burgerDropdown');
    dropdown.classList.toggle('show');
}

function closeBurgerMenu() {
    const dropdown = document.getElementById('burgerDropdown');
    dropdown.classList.remove('show');
}

// Close burger menu if clicking outside
window.addEventListener('click', function(e) {
    if (!e.target.matches('.burger-btn') && !e.target.closest('.burger-menu')) {
        closeBurgerMenu();
    }
});

// Content modal functions
async function openContentModal(page) {
    closeBurgerMenu();

    // Hide virtual keyboard temporarily while modal is shown
    hideVirtualKeyboardTemporarily();

    // Pause timer if in play mode
    if (currentMode === 'play') {
        pauseTimer();
    }

    const modal = document.getElementById('contentModal');
    const bodyEl = document.getElementById('contentModalBody');

    bodyEl.innerHTML = 'Loading...';

    // Show modal
    modal.classList.add('show');

    // Load content based on current dialect (for Shavian) or use latin
    let filename;
    if (useShavianUI) {
        // Use dialect-specific Shavian content
        filename = `${page}_${currentDialect}.html`;
    } else {
        // Use Latin content (no dialect variation needed)
        filename = `${page}_latin.html`;
    }

    try {
        const response = await fetch(filename);
        if (response.ok) {
            const html = await response.text();
            bodyEl.innerHTML = html;
        } else {
            bodyEl.innerHTML = '<p>Content not found.</p>';
        }
    } catch (error) {
        bodyEl.innerHTML = '<p>Error loading content.</p>';
        console.error('Error loading content:', error);
    }
}

function closeContentModal() {
    document.getElementById('contentModal').classList.remove('show');

    // Show virtual keyboard if enabled (returning to game)
    showVirtualKeyboardIfEnabled();

    // Resume timer if in play mode
    if (currentMode === 'play') {
        resumeTimer();
    }
}

// Welcome modal functions
// Setup dialog functions
function onDialectChangeSetup() {
    const selected = document.querySelector('input[name="dialectSetup"]:checked');
    if (selected) {
        currentDialect = selected.value;
        localStorage.setItem('dialect', currentDialect);
        // Update UI translations for new dialect
        updateUILanguage();
        // Reload words with new dialect
        loadWords().then(() => {
            updateLevelSelector();
            // Dialect change will take effect on next game
        });
    }
}

function onLayoutChangeSetup() {
    currentLayout = document.getElementById('layoutSelectSetup').value;
    localStorage.setItem('keyboardLayout', currentLayout);
}

function updateWelcomeLanguage() {
    const lang = useShavianUI ? 'shavian' : 'latin';
    // TODO: Add Shavian translations for welcome screen
    if (useShavianUI) {
        document.getElementById('welcomeTitle').textContent = '𐑢𐑧𐑤𐑒𐑳𐑥 𐑑 ·𐑖𐑷 𐑑𐑲𐑐!';
        document.getElementById('welcomeSubtitle').textContent = '𐑗𐑵𐑟 𐑘𐑹 𐑐𐑮𐑧𐑓𐑼𐑩𐑯𐑕𐑩𐑟 𐑑 𐑜𐑧𐑑 𐑕𐑑𐑸𐑑𐑩𐑛:';
        document.getElementById('welcomeDialectLabel').textContent = '𐑗𐑵𐑟 𐑕𐑐𐑧𐑤𐑦𐑙';
        document.getElementById('welcomeDialectBritish').textContent = '𐑚𐑮𐑦𐑑𐑦𐑖';
        document.getElementById('welcomeDialectAmerican').textContent = '𐑩𐑥𐑧𐑮𐑦𐑒𐑩𐑯';
        document.getElementById('welcomeLayoutLabel').textContent = '𐑒𐑰𐑚𐑪𐑮𐑛 𐑤𐑱𐑬𐑑';
        document.getElementById('welcomeLigatureLabel').textContent = '𐑷𐑑𐑩𐑥𐑨𐑑𐑦𐑒 𐑤𐑦𐑜𐑩𐑗𐑼𐑟 (𐑩+𐑮→𐑼, 𐑘+𐑵→𐑿)';
        document.getElementById('welcomeShavianUILabel').textContent = '𐑛𐑦𐑕𐑐𐑤𐑱 UI 𐑦𐑯 ·𐑖𐑱𐑝𐑾𐑯';
        document.getElementById('welcomeStartButton').textContent = '𐑕𐑑𐑸𐑑';
    } else {
        document.getElementById('welcomeTitle').textContent = 'Welcome to Shaw Type!';
        document.getElementById('welcomeSubtitle').textContent = 'Choose your preferences to get started:';
        document.getElementById('welcomeDialectLabel').textContent = 'Choose spelling';
        document.getElementById('welcomeDialectBritish').textContent = 'British';
        document.getElementById('welcomeDialectAmerican').textContent = 'American';
        document.getElementById('welcomeLayoutLabel').textContent = 'Keyboard Layout';
        document.getElementById('welcomeLigatureLabel').textContent = 'Automatic ligatures (𐑩+𐑮→𐑼, 𐑘+𐑵→𐑿)';
        document.getElementById('welcomeShavianUILabel').textContent = 'Display UI in Shavian';
        document.getElementById('welcomeStartButton').textContent = 'Start';
    }
}

// Splash screen functions
const APP_VERSION = '{{VERSION}}';

function closeSplashModal() {
    const dontShow = document.getElementById('dontShowSplash').checked;

    if (dontShow) {
        // Store the current version so we don't show splash again for this version
        localStorage.setItem('lastSeenVersion', APP_VERSION);
    }
    document.getElementById('splashModal').classList.remove('show');

    // After closing splash, show setup dialog for first-time users
    showSetupIfNeeded();
}

async function showSplashIfNeeded() {
    const lastSeenVersion = localStorage.getItem('lastSeenVersion');

    // Show splash if version doesn't match (first time or version changed)
    const shouldShowSplash = lastSeenVersion !== APP_VERSION;

    if (shouldShowSplash) {
        document.getElementById('splashModal').classList.add('show');

        // Load content based on UI language preference
        const lang = useShavianUI ? currentDialect : 'latin';
        const filename = `whats_new_${lang}.html`;
        const contentEl = document.getElementById('splashContent');

        try {
            const response = await fetch(filename);
            if (response.ok) {
                const html = await response.text();
                contentEl.innerHTML = html;
            } else {
                contentEl.innerHTML = '<p>Content not found.</p>';
            }
        } catch (error) {
            contentEl.innerHTML = '<p>Error loading content.</p>';
            console.error('Error loading splash content:', error);
        }

        // Set focus on Continue button
        setTimeout(() => {
            document.getElementById('continueButton').focus();
        }, 100);
    }
}

// First-time setup dialog functions
function closeSetupModal() {
    // Save current settings to localStorage (in case user didn't change anything)
    localStorage.setItem('keyboardLayout', currentLayout);
    localStorage.setItem('dialect', currentDialect);
    localStorage.setItem('currentMode', 'play');

    // Save virtual keyboard preference
    const vkToggleSetup = document.getElementById('virtualKeyboardToggleSetup');
    if (vkToggleSetup) {
        localStorage.setItem('showVirtualKeyboard', vkToggleSetup.checked ? 'true' : 'false');
        // Sync with settings toggle
        const vkToggleSettings = document.getElementById('virtualKeyboardToggle');
        if (vkToggleSettings) vkToggleSettings.checked = vkToggleSetup.checked;
    }

    document.getElementById('setupModal').classList.remove('show');
    currentMode = 'play';
}

function showSetupIfNeeded() {
    const hasKeyboard = localStorage.getItem('keyboardLayout');
    if (!hasKeyboard) {
        // First-time user - sync setup modal with defaults
        const dialectRadio = document.querySelector(`input[name="dialectSetup"][value="${currentDialect}"]`);
        if (dialectRadio) dialectRadio.checked = true;
        document.getElementById('layoutSelectSetup').value = currentLayout;

        // Initialize virtual keyboard checkbox (default to false for new users)
        const vkToggleSetup = document.getElementById('virtualKeyboardToggleSetup');
        if (vkToggleSetup) {
            const savedShowKeyboard = localStorage.getItem('showVirtualKeyboard');
            vkToggleSetup.checked = savedShowKeyboard === 'true';
        }

        document.getElementById('setupModal').classList.add('show');
        return true;
    }
    return false;
}

// Settings functions
function pauseTimer() {
    if (startTime !== null && pauseStartTime === null) {
        pauseStartTime = Date.now();
    }
}

function resumeTimer() {
    if (pauseStartTime !== null) {
        totalPausedTime += Date.now() - pauseStartTime;
        pauseStartTime = null;
    }
}

function openSettings() {
    // Hide virtual keyboard temporarily while modal is shown
    hideVirtualKeyboardTemporarily();

    // Pause timer if in play mode
    if (currentMode === 'play') {
        pauseTimer();
    }

    // Sync settings with current state
    const dialectRadio = document.querySelector(`input[name="dialectSettings"][value="${currentDialect}"]`);
    if (dialectRadio) dialectRadio.checked = true;

    document.getElementById('layoutSelectSettings').value = currentLayout;
    document.getElementById('ligatureToggleSettings').checked = useLigatures;


    // Show/hide ligature option based on current layout
    const supportsLigatures = currentLayout === 'imperial' ||
                             currentLayout === 'igc' ||
                             currentLayout === 'qwerty' ||
                             currentLayout === 'jafl';
    document.getElementById('ligatureSettingOption').style.display =
        supportsLigatures ? 'block' : 'none';

    document.getElementById('settingsModal').classList.add('show');
}

function closeSettings() {
    document.getElementById('settingsModal').classList.remove('show');

    // Show virtual keyboard if enabled (returning to game)
    showVirtualKeyboardIfEnabled();

    // Resume timer if in play mode
    if (currentMode === 'play') {
        resumeTimer();
    }
}

function openHighScores() {
    // Hide virtual keyboard temporarily while modal is shown
    hideVirtualKeyboardTemporarily();

    // Pause timer if in play mode
    if (currentMode === 'play') {
        pauseTimer();
    }
    // Get current translations
    const t = getCurrentTranslations();

    // Populate high scores content
    let html = '';

    if (Object.keys(highScores).length === 0) {
        html = `<p style="text-align: center; color: #999;">${t.noScoresYet}</p>`;
    } else {
        html = '<div style="display: flex; flex-direction: column; gap: 20px;">';

        // Show high scores for each level count
        ['3', '6', '10'].forEach(levelCountKey => {
            if (highScores[levelCountKey]) {
                const scores = highScores[levelCountKey];
                const totalWords = parseInt(levelCountKey) * 5;

                html += `<div style="border: 2px solid #e0e0e0; border-radius: 8px; padding: 15px;">`;
                html += `<h3 style="margin-top: 0; color: #667eea;">${levelCountKey} ${t.levels} (${totalWords} ${t.words})</h3>`;

                if (scores.time !== null) {
                    const minutes = Math.floor(scores.time / 60);
                    const seconds = Math.floor(scores.time % 60);
                    const timeFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                    html += `<div style="margin: 8px 0;"><strong>${t.bestTime}</strong> ${timeFormatted}</div>`;
                } else {
                    html += `<div style="margin: 8px 0;"><strong>${t.bestTime}</strong> N/A</div>`;
                }

                if (scores.wpm !== null) {
                    html += `<div style="margin: 8px 0;"><strong>${t.bestWPM}</strong> ${scores.wpm.toFixed(1)}</div>`;
                } else {
                    html += `<div style="margin: 8px 0;"><strong>${t.bestWPM}</strong> N/A</div>`;
                }

                if (scores.accuracy !== null) {
                    html += `<div style="margin: 8px 0;"><strong>${t.bestAccuracy}</strong> ${scores.accuracy.toFixed(1)}%</div>`;
                } else {
                    html += `<div style="margin: 8px 0;"><strong>${t.bestAccuracy}</strong> N/A</div>`;
                }

                html += `</div>`;
            }
        });

        html += '</div>';
    }

    document.getElementById('highScoresContent').innerHTML = html;
    document.getElementById('highScoresModal').classList.add('show');
}

function closeHighScores() {
    document.getElementById('highScoresModal').classList.remove('show');

    // Show virtual keyboard if enabled (returning to game)
    showVirtualKeyboardIfEnabled();

    // Resume timer if in play mode
    if (currentMode === 'play') {
        resumeTimer();
    }
}

// Lesson selector functions
function openLessonSelector() {
    // Get current translations
    const t = getCurrentTranslations();

    // Get the appropriate word list for current settings
    const learnWords = getLearnWords();

    const lessonList = document.getElementById('lessonList');
    lessonList.innerHTML = '';

    // Dynamically determine max level from actual data
    const maxLevel = learnWords ? Object.keys(learnWords).length : 6;

    // Add lesson options
    for (let i = 1; i <= maxLevel; i++) {
        const levelData = learnWords[i];

        if (levelData) {
            const lessonBtn = document.createElement('div');
            lessonBtn.className = 'lesson-option';
            const translatedName = translateLessonName(levelData.nameKey);
            const translatedDescription = translateLessonDescription(levelData.descKey);
            lessonBtn.innerHTML = `
                <strong>${t.lessonPrefix} ${i}: ${translatedName}</strong>
                <p style="margin: 5px 0 0 0; font-size: 12px; color: #888;">${translatedDescription}</p>
            `;
            lessonBtn.onclick = () => selectLesson(i);
            if (selectedLevel == i) {
                lessonBtn.style.background = '#f0f0ff';
            }
            lessonList.appendChild(lessonBtn);
        }
    }

    document.getElementById('lessonModal').classList.add('show');
}

function selectLesson(level) {
    selectedLevel = level;
    closeLessonModal();

    // Show game content
    showGameContent();

    // Reset session stats
    wordsCompleted = 0;
    totalLettersTyped = 0;
    correctLetters = 0;
    levelStats = [];

    updateStats();

    // Start the selected lesson
    const t = getCurrentTranslations();

    // Set instructions in subtitle
    document.getElementById('mainSubtitle').textContent = t.gameInstructions;

    const levelData = getLearnLessonData(parseInt(level));
    if (levelData) {
        currentLevelNumber = parseInt(level);
        startLevel(levelData.wordPool, levelData.wordCount, 'lesson', levelData.title, t.lesson_label, showLessonCompletionDialog);
    }
}

function closeLessonModal() {
    document.getElementById('lessonModal').classList.remove('show');
}

function toggleShavianUI() {
    useShavianUI = document.getElementById('shavianUIToggle').checked;
    localStorage.setItem('useShavianUI', useShavianUI);
    updateUILanguage();
}

function updateUILanguage() {
    const t = getCurrentTranslations();

    if (!t || Object.keys(t).length === 0) {
        console.error('Translations not loaded yet!');
        return;
    }

    updateUIWithTranslations(t);
}

function updateUIWithTranslations(t) {
    // Simple 1:1 mapping: loop through all translation keys and try to find matching element IDs
    for (const [key, value] of Object.entries(t)) {
        const element = document.getElementById(key);
        if (element) {
            element.textContent = value;
        }
    }

    // Special case: subtitle - depends on current state
    const subtitle = document.getElementById('mainSubtitle');
    const homeScreen = document.getElementById('homeScreen');
    if (subtitle) {
        if (!homeScreen.classList.contains('hidden')) {
            subtitle.textContent = t.subtitle;
        } else {
            updateSubtitleForGame();
        }
    }

    // Special case: level label - depends on mode
    const levelLabel = document.getElementById('levelLabel');
    if (levelLabel) {
        levelLabel.textContent = currentMode === 'learn' ? t.lesson_label : t.level_label;
    }

    // Special case: reload splash content if modal is showing
    const splashModal = document.getElementById('splashModal');
    if (splashModal && splashModal.classList.contains('show')) {
        const lang = useShavianUI ? currentDialect : 'latin';
        const filename = `whats_new_${lang}.html`;
        const contentEl = document.getElementById('splashContent');
        if (contentEl) {
            fetch(filename)
                .then(response => response.ok ? response.text() : '<p>Content not found.</p>')
                .then(html => contentEl.innerHTML = html)
                .catch(error => {
                    contentEl.innerHTML = '<p>Error loading content.</p>';
                    console.error('Error loading splash content:', error);
                });
        }
    }

    // Update layout select options
    updateLayoutSelectOptions();
}

function updateLayoutSelectOptions() {
    const t = getCurrentTranslations();

    // Update both layout selects (settings and welcome)
    const selects = [
        document.getElementById('layoutSelectSettings'),
        document.getElementById('layoutSelectWelcome')
    ];

    selects.forEach(select => {
        if (select) {
            const currentValue = select.value;
            const options = select.querySelectorAll('option');

            options.forEach(option => {
                const value = option.value;
                switch(value) {
                    case 'imperial':
                        option.textContent = t.layoutImperial;
                        break;
                    case 'igc':
                        option.textContent = t.layoutIGC;
                        break;
                    case 'qwerty':
                        option.textContent = t.layoutQwerty;
                        break;
                    case '2layer':
                        option.textContent = t.layout2layer;
                        break;
                    case 'jafl':
                        option.textContent = t.layoutJafl;
                        break;
                }
            });

            // Restore selected value
            select.value = currentValue;
        }
    });
}

// Load saved preferences
// localStorage patch system - sorted list of patches to apply
const PATCHES = [
    [1, function patch1_clearBestTime() {
        // Clear best time due to timer bug fix
        localStorage.removeItem('bestTime');
        debug('Patch 1: Cleared bestTime from localStorage');
    }],
    [2, function patch2_migrateToHighScores() {
        // Migrate old bestTime to new highScores structure
        const oldBestTime = localStorage.getItem('bestTime');
        if (oldBestTime !== null) {
            // Load existing high scores or create new object
            const highScoresJSON = localStorage.getItem('highScores');
            const highScores = highScoresJSON ? JSON.parse(highScoresJSON) : {};
            const timeValue = parseFloat(oldBestTime);
            // Copy the old best time to the 6-level entry (only if not already set)
            if (!highScores['6'] || highScores['6'].time === null) {
                highScores['6'] = { time: timeValue, wpm: null, accuracy: null };
            }
            localStorage.setItem('highScores', JSON.stringify(highScores));
            localStorage.removeItem('bestTime');
            debug('Patch 2: Migrated bestTime to highScores[6]');
        } else {
            debug('Patch 2: No bestTime to migrate');
        }
    }]
];

function applyPatches() {
    const currentPatchLevel = parseInt(localStorage.getItem('patchLevel') || '0');
    debug(`Current patch level: ${currentPatchLevel}`);

    // Apply all patches greater than current level
    PATCHES.forEach(([patchNumber, patchFunction]) => {
        if (patchNumber > currentPatchLevel) {
            debug(`Applying patch ${patchNumber}...`);
            patchFunction();
        }
    });

    // Update patch level to highest patch number
    if (PATCHES.length > 0) {
        const latestPatch = PATCHES[PATCHES.length - 1][0];
        if (latestPatch > currentPatchLevel) {
            localStorage.setItem('patchLevel', latestPatch.toString());
            debug(`Updated patch level to ${latestPatch}`);
        }
    }
}

function loadPreferences() {
    // Load Shavian UI preference
    const savedShavianUI = localStorage.getItem('useShavianUI');
    if (savedShavianUI !== null) {
        useShavianUI = savedShavianUI === 'true';
        document.getElementById('shavianUIToggle').checked = useShavianUI;
    }

    // Load dialect preference
    const savedDialect = localStorage.getItem('dialect');
    if (savedDialect !== null && (savedDialect === 'gb' || savedDialect === 'us')) {
        currentDialect = savedDialect;
    }

    // Load keyboard layout
    let savedLayout = localStorage.getItem('keyboardLayout');
    // Migration: rename "new-imperial" to "igc"
    if (savedLayout === 'new-imperial') {
        savedLayout = 'igc';
        localStorage.setItem('keyboardLayout', 'igc');
    }
    if (savedLayout !== null) {
        currentLayout = savedLayout;
    }

    // Load ligature preference
    const savedLigatures = localStorage.getItem('useLigatures');
    if (savedLigatures !== null) {
        useLigatures = savedLigatures === 'true';
    }
    document.getElementById('ligatureToggleSettings').checked = useLigatures;

    // Load current mode (just restore the value, no UI updates needed on home screen)
    const savedMode = localStorage.getItem('currentMode');
    if (savedMode !== null && (savedMode === 'learn' || savedMode === 'play')) {
        currentMode = savedMode;
    }

    // Load best time (legacy - now migrated to highScores)
    const savedBestTime = localStorage.getItem('bestTime');
    if (savedBestTime !== null) {
        bestTime = parseFloat(savedBestTime);
    }

    // Load high scores
    const savedHighScores = localStorage.getItem('highScores');
    if (savedHighScores !== null) {
        try {
            highScores = JSON.parse(savedHighScores);
        } catch (e) {
            console.error('Failed to parse highScores:', e);
            highScores = {};
        }
    }

    // Load level count preference
    const savedLevelCount = localStorage.getItem('levelCount');
    if (savedLevelCount !== null) {
        const count = parseInt(savedLevelCount);
        if ([3, 6, 10].includes(count)) {
            levelCount = count;
            document.getElementById('levelCountSelect').value = count.toString();
        }
    }

    // Load debug mode preference
    const savedDebugMode = localStorage.getItem('debugMode');
    if (savedDebugMode !== null) {
        debugMode = savedDebugMode === 'true';
    }

    // Load virtual keyboard preference
    const savedShowKeyboard = localStorage.getItem('showVirtualKeyboard');
    if (savedShowKeyboard === 'true') {
        document.getElementById('virtualKeyboardToggle').checked = true;
    }
}

// Keyboard support for dialogs
document.addEventListener('keydown', (e) => {
    // Check which modal is open
    const completionModal = document.getElementById('completionModal');
    const settingsModal = document.getElementById('settingsModal');
    const lessonModal = document.getElementById('lessonModal');
    const contentModal = document.getElementById('contentModal');

    const isModalOpen = completionModal.classList.contains('show') ||
                       settingsModal.classList.contains('show') ||
                       lessonModal.classList.contains('show') ||
                       contentModal.classList.contains('show');

    if (!isModalOpen) return;

    // Handle Escape key - close/back action
    if (e.key === 'Escape') {
        e.preventDefault();
        if (completionModal.classList.contains('show')) {
            goHome();
        } else if (settingsModal.classList.contains('show')) {
            closeSettings();
        } else if (lessonModal.classList.contains('show')) {
            closeLessonModal();
        } else if (contentModal.classList.contains('show')) {
            closeContentModal();
        }
        return;
    }

    // Handle Enter key - activate first/default button
    if (e.key === 'Enter') {
        e.preventDefault();
        if (completionModal.classList.contains('show')) {
            const firstButton = completionModal.querySelector('button');
            if (firstButton) firstButton.click();
        } else if (lessonModal.classList.contains('show')) {
            // In lesson selector, no default button action
        }
        return;
    }

    // Handle Tab key - cycle between buttons
    if (e.key === 'Tab') {
        const activeModal = completionModal.classList.contains('show') ? completionModal :
                          settingsModal.classList.contains('show') ? settingsModal :
                          lessonModal.classList.contains('show') ? lessonModal :
                          contentModal;

        const buttons = Array.from(activeModal.querySelectorAll('button'));
        if (buttons.length > 1) {
            e.preventDefault();
            const currentFocus = document.activeElement;
            const currentIndex = buttons.indexOf(currentFocus);

            let nextIndex;
            if (e.shiftKey) {
                // Shift+Tab - go backwards
                nextIndex = currentIndex <= 0 ? buttons.length - 1 : currentIndex - 1;
            } else {
                // Tab - go forwards
                nextIndex = currentIndex >= buttons.length - 1 ? 0 : currentIndex + 1;
            }

            buttons[nextIndex].focus();
        }
    }
});

// Start the app
applyPatches();
loadPreferences();

// Translations are already loaded synchronously in <head>
// Initialize the app
init();
updateUILanguage();
