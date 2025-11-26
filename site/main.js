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

// Game state - encapsulates all session state and statistics
let gameState = new GameState();

// Carousel: 4 slots, we track which slot index maps to which position
let carouselOffset = 0; // Current slot index for "current" word
let words = ['', '', '', '']; // Words in slots [0, 1, 2, 3]
let currentWord = ''; // The actual current word being typed
let recentWords = []; // Track recent words to avoid repeats
let bestTime = null; // Legacy - migrated to gameState.highScores

// Shadow input: faithful representation of what user typed (browsers may strip combining chars)
let shadowInput = '';

// Track replacement info from beforeinput event (for insertReplacementText)
let pendingReplacementStart = -1;
let pendingReplacementEnd = -1;

// Track if input had focus before opening a modal (for mobile keyboard management)
let inputHadFocusBeforeModal = false;

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
    const t = getCurrentTranslations();

    // Always show the option
    ligatureOption.style.display = 'block';

    if (autoLigatures === 'never') {
        // Grey out and show "not supported" for layouts without ligatures
        // Don't change checked state - just visual display
        ligatureToggle.disabled = true;
        ligatureToggle.style.opacity = '0.5';
        ligatureToggle.style.cursor = 'not-allowed';
        ligatureLabel.textContent = t ? t.ligaturesNotSupported : 'Ligatures not supported';
    } else if (autoLigatures === 'always') {
        // Grey out and show "built in" for layouts with forced ligatures
        // Don't change checked state - just visual display
        ligatureToggle.disabled = true;
        ligatureToggle.style.opacity = '0.5';
        ligatureToggle.style.cursor = 'not-allowed';
        ligatureLabel.textContent = t ? t.ligaturesBuiltIn : 'Ligatures built in';
    } else {
        // 'optional' - show and enable toggle with normal label
        // Restore user's preference from useLigatures variable
        ligatureToggle.checked = useLigatures;
        ligatureToggle.disabled = false;
        ligatureToggle.style.opacity = '1';
        ligatureToggle.style.cursor = 'pointer';
        ligatureLabel.textContent = t ? t.ligatures : 'Automatic ligatures (𐑩+𐑮→𐑼, 𐑘+𐑵→𐑿)';
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

        // Update virtual keyboard title
        updateVirtualKeyboardTitle();
    } else if (retryCount < 20) {
        // Functions not loaded yet, try again soon
        setTimeout(() => updateVirtualKeyboardLabels(retryCount + 1), 50);
    } else {
        console.error('Virtual keyboard functions not available after retries');
    }
}

function updateVirtualKeyboardTitle() {
    const titleElement = document.getElementById('virtualKeyboardTitle');
    if (!titleElement) return;

    const t = getCurrentTranslations();
    if (!t) return;

    // Map layout codes to translation keys
    const titleKeys = {
        'imperial': 'virtualKeyboardTitleImperial',
        'igc': 'virtualKeyboardTitleIGC',
        'qwerty': 'virtualKeyboardTitleQwerty',
        '2layer': 'virtualKeyboardTitle2layer',
        'jafl': 'virtualKeyboardTitleJafl'
    };

    const titleKey = titleKeys[currentLayout];
    if (titleKey && t[titleKey]) {
        titleElement.textContent = t[titleKey];
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
// restoreFocus parameter controls whether to restore focus (true/false/'auto')
// 'auto' means restore focus based on inputHadFocusBeforeModal flag
function updateInputFocusMode(restoreFocus = true) {
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

        // Determine whether to restore focus
        const shouldRestoreFocus = restoreFocus === 'auto' ? inputHadFocusBeforeModal : restoreFocus;

        if (typingInput.style.display !== 'none' && shouldRestoreFocus) {
            typingInput.focus();
        }

        // Reset the flag if we used 'auto' mode
        if (restoreFocus === 'auto') {
            inputHadFocusBeforeModal = false;
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
        updateInputFocusMode('auto'); // Only restore focus if input had it before modal
    }
}

// Hide virtual keyboard temporarily (preserves user preference)
function hideVirtualKeyboardTemporarily() {
    hideVirtualKeyboard();
    isUsingVirtualKeyboard = false;
    updateInputFocusMode(false); // Don't restore focus when hiding for modals
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
let useVirtualKeyboard = true; // QWERTY virtual keyboard always enabled

// Debug function to jump to a specific level/lesson for testing
// Usage: setLevel(5) - jumps to level 5 with appropriate state
window.setLevel = function(targetLevel) {
    if (!currentMode) {
        console.error('No game in progress. Start a game first with startPlay() or startPractice()');
        return;
    }

    const isPlayMode = currentMode === 'play';
    const levelType = isPlayMode ? 'level' : 'lesson';

    // Validate target level
    let maxLevel;
    if (isPlayMode) {
        maxLevel = levelCount;
    } else {
        const learnWords = getLearnWords();
        maxLevel = learnWords ? Object.keys(learnWords).length : 0;
    }

    if (targetLevel < 1 || targetLevel > maxLevel) {
        console.error(`Invalid ${levelType} number. Must be between 1 and ${maxLevel}`);
        return;
    }

    console.log(`Jumping to ${levelType} ${targetLevel}...`);

    // Calculate stats as if we completed all previous levels
    gameState.levelStats = [];
    for (let i = 1; i < targetLevel; i++) {
        gameState.levelStats.push({
            level: i,
            accuracy: 95 + Math.random() * 5, // Random accuracy 95-100%
            lettersTyped: 50,
            correctLetters: 48
        });
    }

    // Set word counts as if we completed previous levels
    const wordsPerLevel = isPlayMode ? 5 : 10;
    gameState.wordsCompleted = (targetLevel - 1) * wordsPerLevel;
    gameState.totalLettersTyped = (targetLevel - 1) * 50;
    gameState.correctLetters = Math.floor(gameState.totalLettersTyped * 0.97); // 97% accuracy

    // Update level number
    gameState.currentLevelNumber = targetLevel;
    if (!isPlayMode) {
        selectedLevel = targetLevel.toString();
    }

    // For play mode, start the timer if it hasn't been started
    if (isPlayMode && !gameState.startTime) {
        gameState.startTime = Date.now();
    }

    // Get level data and start it
    const levelData = isPlayMode ? getPlayLevelData(targetLevel) : getLearnLessonData(targetLevel);
    if (!levelData) {
        console.error(`Could not load ${levelType} ${targetLevel} data`);
        return;
    }

    const t = getCurrentTranslations();
    const typeLabel = isPlayMode ? t.level_label : t.lesson_label;
    const callback = isPlayMode ? onPlayLevelComplete : showLessonCompletionDialog;

    // Start the level
    startLevel(levelData.wordPool, levelData.wordCount, levelType, levelData.title, typeLabel, callback);

    // Update display
    updateStats();
    updateLevel();

    console.log(`Now on ${levelType} ${targetLevel}: ${levelData.title}`);
    console.log(`State: ${gameState.wordsCompleted} words completed, ${gameState.levelStats.length} ${levelType}s in stats`);
    return true;
};

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
        if (gameState.wordsCompleted < 5) return 1;
        if (gameState.wordsCompleted < 10) return 2;
        if (gameState.wordsCompleted < 15) return 3;
        if (gameState.wordsCompleted < 20) return 4;
        if (gameState.wordsCompleted < 25) return 5; // Compound letters lesson
        if (gameState.wordsCompleted < 30) return 6; // Almost Complete
        return 7; // All Keys
    } else {
        // Other modes use 6 levels (5 words per level = 30 words total)
        if (gameState.wordsCompleted < 5) return 1;
        if (gameState.wordsCompleted < 10) return 2;
        if (gameState.wordsCompleted < 15) return 3;
        if (gameState.wordsCompleted < 20) return 4;
        if (gameState.wordsCompleted < 25) return 5;
        return 6;
    }
}

// UI Navigation
function closeAllCompletionModals() {
    document.getElementById('lessonCompletionModal').classList.remove('show');
    document.getElementById('sessionCompletionModal').classList.remove('show');
    document.getElementById('playCompletionModal').classList.remove('show');
}

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
    closeAllCompletionModals();
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
    gameState.wordsCompleted = 0;
    gameState.totalLettersTyped = 0;
    gameState.correctLetters = 0;
    gameState.currentLevelNumber = 1;
    recentWords = [];
    gameState.levelStats = [];
    gameState.pauseStartTime = null;
    gameState.totalPausedTime = 0;

    // Update display
    updateStats();
    updateLevel();
    updateSubtitleForGame();

    // Show/hide lesson info
    document.getElementById('currentLessonInfo').style.display = 'none';

    // Update UI language
    updateUILanguage();

    // Show countdown, then start game with callback
    const t = getCurrentTranslations();
    const levelData = getPlayLevelData(1);
    showCountdown(levelData.wordPool, levelData.wordCount, 'level', levelData.title, t.level_label, onPlayLevelComplete);
}

// Completion callback for play mode - handles advancing to next level or showing final modal
function onPlayLevelComplete() {
    debug(`[onPlayLevelComplete] Level ${gameState.currentLevelNumber} complete, checking for next level`);

    const nextLevelNum = gameState.currentLevelNumber + 1;
    const nextLevelData = getPlayLevelData(nextLevelNum);

    if (nextLevelData) {
        // There's another level - start it immediately
        debug(`[onPlayLevelComplete] Starting next level ${nextLevelNum}`);
        gameState.currentLevelNumber = nextLevelNum;

        const t = getCurrentTranslations();
        document.getElementById('mainSubtitle').textContent =
            `${t.level_label} ${gameState.currentLevelNumber}: ${nextLevelData.title}`;

        startLevel(nextLevelData.wordPool, nextLevelData.wordCount, 'level',
                   nextLevelData.title, t.level_label, onPlayLevelComplete);
    } else {
        // No more levels - show final completion modal
        debug(`[onPlayLevelComplete] No more levels, showing final completion modal`);
        showCompletionModal();
    }
}

function playAgain() {
    // Hide completion modal
    closeAllCompletionModals();

    // Reset all stats
    gameState.wordsCompleted = 0;
    gameState.totalLettersTyped = 0;
    gameState.correctLetters = 0;
    gameState.currentLevelNumber = 1;
    recentWords = [];
    gameState.levelStats = [];
    gameState.pauseStartTime = null;
    gameState.totalPausedTime = 0;

    // Update display
    updateStats();
    updateLevel();
    updateSubtitleForGame();

    // Show/hide lesson info
    document.getElementById('currentLessonInfo').style.display = 'none';

    // Show countdown, then start game with callback
    const t = getCurrentTranslations();
    const levelData = getPlayLevelData(1);
    showCountdown(levelData.wordPool, levelData.wordCount, 'level', levelData.title, t.level_label, onPlayLevelComplete);
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
        subtitle.textContent = `${t.level_label} ${gameState.currentLevelNumber}`;
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

    // Update virtual keyboard labels
    updateVirtualKeyboardLabels();
}

function onLigatureToggleSettings() {
    useLigatures = document.getElementById('ligatureToggleSettings').checked;
    localStorage.setItem('useLigatures', useLigatures);
    updateLevelSelector();
}

function onLevelCountChange() {
    levelCount = parseInt(document.getElementById('levelCountSelect').value);
    localStorage.setItem('levelCount', levelCount.toString());
}

function onLevelChange() {
    selectedLevel = document.getElementById('levelSelect').value;
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

// Minimize Safari/browser UI chrome by scrolling slightly
function minimizeBrowserUI() {
    // Small delay to ensure page is fully loaded
    setTimeout(() => {
        // Scroll down slightly to trigger minimal UI mode in mobile browsers
        window.scrollTo(0, 1);
        // Scroll back to top smoothly
        setTimeout(() => {
            window.scrollTo(0, 0);
        }, 10);
    }, 100);
}

// Check if app is running in standalone mode (added to home screen)
function isStandalone() {
    // iOS
    if (window.navigator.standalone) return true;
    // Android
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
    return false;
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

    // Minimize browser UI if not running in standalone mode
    if (!isStandalone()) {
        minimizeBrowserUI();
    }

    // Log standalone status for debugging
    debug(`App running in ${isStandalone() ? 'standalone' : 'browser'} mode`);
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
    gameState.currentLevelWordPool = wordPool;
    gameState.currentLevelWordCount = wordCount;
    gameState.currentLevelType = type;
    gameState.currentLevelTitle = title;
    gameState.currentLevelTypeLabel = typeLabel;
    gameState.currentLevelCompletionCallback = completionCallback;
    gameState.wordsInCurrentLevel = 0;
    gameState.currentLevelLettersTyped = 0;
    gameState.currentLevelCorrectLetters = 0;
    recentWords = [];

    // Initialize game (loads words)
    initializeGame();

    // Clear input state
    clearInputState();

    // Start timer only for play mode at level 1 (beginning of game)
    if (currentMode === 'play' && gameState.currentLevelNumber === 1 && gameState.wordsCompleted === 0) {
        gameState.startTime = Date.now();
    }

    // Show virtual keyboard if setting is enabled
    // This will blur the input to prevent mobile OS keyboard
    showVirtualKeyboardIfEnabled();

    // Auto-focus decision: if virtual keyboard is NOT enabled, auto-focus
    // (user will type with OS keyboard - physical or mobile)
    // If virtual keyboard IS enabled, don't auto-focus (user will tap virtual keys)
    const savedShowKeyboard = localStorage.getItem('showVirtualKeyboard');
    if (savedShowKeyboard !== 'true') {
        typingInput.focus();
    } else {
        // Add visual indicator to show where to tap/type
        typingInput.style.border = '3px solid #667eea';
    }

    // Remove visual indicator when user interacts
    const removeVisualIndicator = () => {
        if (typingInput.style.border) {
            typingInput.style.border = '';
        }
    };
    typingInput.addEventListener('focus', removeVisualIndicator, { once: true });
    typingInput.addEventListener('input', removeVisualIndicator, { once: true });
}

function pickRandomWord() {
    const pool = gameState.currentLevelWordPool;
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
    const isLastWordOfLevel = (gameState.wordsInCurrentLevel === gameState.currentLevelWordCount - 1);

    debug(`[loadNewWord] gameState.wordsInCurrentLevel=${gameState.wordsInCurrentLevel}, wordCount=${gameState.currentLevelWordCount}, isLastWord=${isLastWordOfLevel}`);

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

    clearInputState();
    updateWordDisplay();

    updateLevel();
}

function initializeGame() {
    debug(`[initializeGame] wordPool length: ${gameState.currentLevelWordPool.length}, wordCount: ${gameState.currentLevelWordCount}`);
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
    levelDisplayEl.textContent = gameState.currentLevelNumber;
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
    if (gameState.currentLevelWordPool && gameState.currentLevelWordPool.length > 0) {
        maxWordLength = Math.max(...gameState.currentLevelWordPool.map(w => Array.from(w).length));
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
    wordCountEl.textContent = gameState.wordsCompleted;
    const accuracy = gameState.totalLettersTyped === 0 ? 100 : ((gameState.correctLetters / gameState.totalLettersTyped) * 100).toFixed(1);
    accuracyEl.textContent = accuracy + '%';
}

function checkCompletion() {
    const userInput = typingInput.value;

    // Check if user typed the complete word correctly
    if (userInput === currentWord) {
        // Word completed correctly
        gameState.wordsCompleted++;
        gameState.wordsInCurrentLevel++;
        debug(`[checkCompletion] Word ${gameState.wordsInCurrentLevel}/${gameState.currentLevelWordCount} of level completed (total: ${gameState.wordsCompleted}), currentMode=${currentMode}, gameState.currentLevelNumber=${gameState.currentLevelNumber}, levelCount=${levelCount}`);
        updateStats();

        // After first word, update subtitle with level/lesson info
        if (gameState.wordsCompleted === 1) {
            document.getElementById('mainSubtitle').textContent =
                `${gameState.currentLevelTypeLabel} ${gameState.currentLevelNumber}: ${gameState.currentLevelTitle}`;
        }

        // Check if level is complete
        if (gameState.wordsInCurrentLevel >= gameState.currentLevelWordCount) {
            // Level completed - transition to next level
            debug(`[checkCompletion] ${gameState.currentLevelType.toUpperCase()} COMPLETED - calling transitionToNextLevel()`);
            transitionToNextLevel();
        } else {
            // Advance to next word
            debug(`[checkCompletion] Advancing to next word`);
            advanceToNextWord();
        }
    }
}

// Unified level completion handler - simply saves stats and delegates to callback
function transitionToNextLevel() {
    debug(`[transitionToNextLevel] Level ${gameState.currentLevelNumber} complete - saving stats and calling callback`);

    // Save stats for completed level
    const finalLevelAccuracy = gameState.currentLevelLettersTyped === 0 ? 100.0 :
        ((gameState.currentLevelCorrectLetters / gameState.currentLevelLettersTyped) * 100);
    gameState.levelStats.push({
        level: gameState.currentLevelNumber,
        accuracy: finalLevelAccuracy,
        lettersTyped: gameState.currentLevelLettersTyped,
        correctLetters: gameState.currentLevelCorrectLetters
    });

    // Delegate to the completion callback
    // The callback is responsible for deciding what happens next:
    // - For play mode: advance to next level or show final completion modal
    // - For practice mode: show lesson completion dialog
    if (gameState.currentLevelCompletionCallback) {
        debug(`[transitionToNextLevel] Calling completion callback`);
        gameState.currentLevelCompletionCallback();
    } else {
        console.error('[transitionToNextLevel] No completion callback set! This should not happen.');
    }
}

// Track completion event (simple pixel tracking)
function trackCompletion(params) {
    try {
        const queryString = Object.keys(params)
            .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
            .join('&');

        const img = new Image();
        img.src = `track.gif?${queryString}`;
        // No need to append to DOM or wait for load
    } catch (e) {
        // Silently fail - tracking is optional
    }
}

function showLessonCompletionDialog() {
    // Track if input had focus before opening modal
    const typingInput = document.getElementById('typingInput');
    inputHadFocusBeforeModal = typingInput && document.activeElement === typingInput;

    // Hide virtual keyboard temporarily while modal is shown
    hideVirtualKeyboardTemporarily();

    // Blur typing input to prevent mobile keyboard from appearing
    if (typingInput) {
        typingInput.blur();
    }

    // Calculate stats for this lesson
    const accuracy = gameState.totalLettersTyped === 0 ? 100.0 : ((gameState.correctLetters / gameState.totalLettersTyped) * 100);
    const accuracyFormatted = accuracy.toFixed(1) + '%';

    // Track lesson completion
    trackCompletion({
        m: 'l',  // mode: lesson
        k: currentLayout,  // keyboard layout
        d: currentDialect,  // dialect
        n: selectedLevel,  // lesson number
        v: isUsingVirtualKeyboard ? '1' : '0'  // virtual keyboard used
    });

    // Show accuracy
    document.getElementById('lessonAccuracy').textContent = accuracyFormatted;

    // Show/hide "Next lesson" button based on whether there's a next lesson
    const learnWords = getLearnWords();
    const maxLesson = learnWords ? Object.keys(learnWords).length : 6;
    const hasNextLesson = parseInt(selectedLevel) < maxLesson;
    document.getElementById('nextLesson').style.display = hasNextLesson ? 'inline-block' : 'none';

    document.getElementById('lessonCompletionModal').classList.add('show');
}

function showCompletionModal() {
    // Track if input had focus before opening modal
    const typingInput = document.getElementById('typingInput');
    inputHadFocusBeforeModal = typingInput && document.activeElement === typingInput;

    // Hide virtual keyboard temporarily while modal is shown
    hideVirtualKeyboardTemporarily();

    // Blur typing input to prevent mobile keyboard from appearing
    if (typingInput) {
        typingInput.blur();
    }

    // Stats already saved in transitionToNextLevel
    const accuracy = gameState.totalLettersTyped === 0 ? 100.0 : ((gameState.correctLetters / gameState.totalLettersTyped) * 100);
    const accuracyFormatted = accuracy.toFixed(1) + '%';

    // Calculate time-based metrics (excluding paused time)
    const endTime = Date.now();
    const elapsedMilliseconds = (endTime - gameState.startTime) - gameState.totalPausedTime;
    const elapsedSeconds = elapsedMilliseconds / 1000;
    const elapsedMinutes = elapsedSeconds / 60;
    const wpm = gameState.wordsCompleted / elapsedMinutes;
    const lettersPerMinute = gameState.totalLettersTyped / elapsedMinutes;

    // Format time as MM:SS
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = Math.floor(elapsedSeconds % 60);
    const timeFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    // Track high scores per level count
    const levelCountKey = levelCount.toString();
    if (!gameState.highScores[levelCountKey]) {
        gameState.highScores[levelCountKey] = { time: null, wpm: null, accuracy: null };
    }

    const currentHighScores = gameState.highScores[levelCountKey];
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
    localStorage.setItem('highScores', JSON.stringify(gameState.highScores));

    // Legacy bestTime support
    const isNewBest = bestTime === null || elapsedSeconds < bestTime;
    if (isNewBest) {
        bestTime = elapsedSeconds;
    }

    // Get translations
    const t = getCurrentTranslations();

    // Show play completion modal (this function is only called from play mode)
    const pbLabel = document.getElementById('personalBestLabel');
    if (isNewTimeRecord) {
        pbLabel.textContent = t.newPersonalBest || 'New Personal Best:';
        pbLabel.style.display = 'block';
    } else {
        pbLabel.style.display = 'none';
    }

    document.getElementById('finalScore').textContent = timeFormatted;
    document.getElementById('finalLevel').textContent = gameState.currentLevelNumber;

    // Update stats with personal best highlighting
    const accuracyRow = document.getElementById('finalAccuracy').parentElement;
    document.getElementById('finalAccuracy').textContent = accuracyFormatted;
    if (isNewAccuracyRecord) {
        accuracyRow.style.color = '#28a745';
        document.getElementById('finalAccuracy').textContent = accuracyFormatted + ' ' + t.personalBest;
    } else {
        accuracyRow.style.color = '';
    }

    const wpmRow = document.getElementById('finalWPM').parentElement;
    document.getElementById('finalWPM').textContent = wpm.toFixed(1);
    if (isNewWPMRecord) {
        wpmRow.style.color = '#28a745';
    } else {
        wpmRow.style.color = '';
    }

    document.getElementById('finalLPM').textContent = lettersPerMinute.toFixed(0);

    // Generate per-level stats HTML
    let levelStatsHTML = '';
    gameState.levelStats.forEach(stat => {
        const levelAccuracyFormatted = stat.accuracy.toFixed(1);
        const levelLabel = t.level_label;
        levelStatsHTML += `<div class="level-stat">${levelLabel} ${stat.level}: ${levelAccuracyFormatted}%</div>`;
    });
    document.getElementById('levelStatsContainer').innerHTML = levelStatsHTML;

    // Track game completion
    trackCompletion({
        m: 'p',  // mode: play
        k: currentLayout,  // keyboard layout
        d: currentDialect,  // dialect
        l: levelCount,  // level count
        t: Math.round(elapsedSeconds),  // time in seconds (rounded)
        a: Math.round(accuracy),  // accuracy percentage (rounded)
        v: isUsingVirtualKeyboard ? '1' : '0'  // virtual keyboard used
    });

    document.getElementById('playCompletionModal').classList.add('show');
}

function resetPractice() {
    // Reset all stats
    gameState.wordsCompleted = 0;
    gameState.totalLettersTyped = 0;
    gameState.correctLetters = 0;
    gameState.currentLevelNumber = 1;
    recentWords = [];
    gameState.levelStats = [];

    // Hide modal
    closeAllCompletionModals();

    // Update display
    updateStats();
    updateLevel();

    // Start first level
    const t = getCurrentTranslations();
    document.getElementById('mainSubtitle').textContent = t.gameInstructions;

    if (currentMode === 'play') {
        const levelData = getPlayLevelData(1);
        startLevel(levelData.wordPool, levelData.wordCount, 'level', levelData.title, t.level_label, onPlayLevelComplete);
    } else {
        // In learn mode, use the selected lesson
        const levelData = getLearnLessonData(parseInt(selectedLevel));
        if (levelData) {
            gameState.currentLevelNumber = parseInt(selectedLevel);
            startLevel(levelData.wordPool, levelData.wordCount, 'lesson', levelData.title, t.lesson_label, showLessonCompletionDialog);
        }
    }
}

function continueLesson() {
    // Reset session stats but keep same lesson
    gameState.wordsCompleted = 0;
    gameState.totalLettersTyped = 0;
    gameState.correctLetters = 0;

    // Hide modal
    closeAllCompletionModals();

    // Update display
    updateStats();

    // Restart current level/lesson with same word pool
    startLevel(gameState.currentLevelWordPool, gameState.currentLevelWordCount, gameState.currentLevelType, gameState.currentLevelTitle, gameState.currentLevelTypeLabel, gameState.currentLevelCompletionCallback);
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
        closeAllCompletionModals();

        // Reset session stats
        gameState.wordsCompleted = 0;
        gameState.totalLettersTyped = 0;
        gameState.correctLetters = 0;
        recentWords = [];
        gameState.currentLevelLettersTyped = 0;
        gameState.currentLevelCorrectLetters = 0;
        updateStats();

        // Start next lesson
        const t = getCurrentTranslations();
        const levelData = getLearnLessonData(nextLessonNum);
        if (levelData) {
            gameState.currentLevelNumber = nextLessonNum;
            startLevel(levelData.wordPool, levelData.wordCount, 'lesson', levelData.title, t.lesson_label, showLessonCompletionDialog);
            // Note: startLevel handles focus based on virtual keyboard setting
        }
    }
}

function chooseDifferentLesson() {
    // Hide completion modal
    closeAllCompletionModals();

    // Reset session stats
    gameState.wordsCompleted = 0;
    gameState.totalLettersTyped = 0;
    gameState.correctLetters = 0;
    recentWords = [];
    gameState.currentLevelLettersTyped = 0;
    gameState.currentLevelCorrectLetters = 0;
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

    // Clear input state
    clearInputState();

    // Temporarily modify word pool to include this word at max length for font sizing test
    const wordLength = Array.from(word).length;
    const tempPool = [...(gameState.currentLevelWordPool || []), word];
    gameState.currentLevelWordPool = tempPool;

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

    // Clear input state for new word
    clearInputState();

    // Temporarily modify word pool to include this word at max length for font sizing test
    const wordLength = Array.from(word).length;
    const tempPool = [...(gameState.currentLevelWordPool || []), word];
    gameState.currentLevelWordPool = tempPool;

    // Update display to show the rotated carousel and apply font sizing
    updateWordDisplay();

    debug(`[setNextWord] Advanced carousel, current="${currentWord}", queued="${word}" (length: ${wordLength})`);
};

// Event listeners
let previousInput = '';  // For error state reversion
let maxEffectiveLength = 0;  // High water mark for counting (excludes pending ligature starts)
let isInErrorState = false; // Track if last typed character was incorrect
let lastAutoLigatureComponents = []; // Track components if last char was auto-formed ligature (e.g., ['𐑩', '𐑮'])
let justSplitLigature = false; // Track if we just split a ligature (to prevent re-forming it)

// Helper: Clear all input state variables
function clearInputState() {
    typingInput.value = '';
    shadowInput = '';
    previousInput = '';
    maxEffectiveLength = 0;
    isInErrorState = false;
    lastAutoLigatureComponents = [];
    justSplitLigature = false;
}

// Helper: Convert string to array of Unicode code points for debugging
function toCodePoints(str) {
    return Array.from(str).map(c =>
        'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')
    ).join(' ');
}

// Helper: Form ligatures in input string if enabled
function formLigatures(input) {
    // Don't re-form if we just split a ligature
    if (justSplitLigature) {
        justSplitLigature = false;
        return input;
    }

    if (!areLigaturesActive()) {
        lastAutoLigatureComponents = [];
        return input;
    }

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
            // Track components for backspace splitting
            lastAutoLigatureComponents = [
                normalizedChars[normalizedChars.length - 2],
                normalizedChars[normalizedChars.length - 1]
            ];
            return result;
        }
    }

    lastAutoLigatureComponents = [];
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
            // Backspace - check if last character was auto-formed ligature
            const chars = Array.from(currentShadow); // Split into code points
            if (chars.length === 0) return '';

            // If last character was auto-formed ligature, split it back to components
            if (lastAutoLigatureComponents.length > 0 && chars.length > 0) {
                const normalizedChars = normalizeCharArray(chars);
                const result = normalizedChars.slice(0, -1).join('') + lastAutoLigatureComponents.join('');
                lastAutoLigatureComponents = []; // Clear the flag
                justSplitLigature = true; // Prevent re-forming this ligature
                return result;
            }

            // Check if last code point is VS1 (U+FE00)
            if (chars.length >= 2 && chars[chars.length - 1].codePointAt(0) === 0xFE00) {
                // Last code point is VS1, delete both base character and VS1
                lastAutoLigatureComponents = []; // Clear flag on any deletion
                justSplitLigature = false;
                return chars.slice(0, -2).join('');
            }

            // Normal deletion - remove last code point
            lastAutoLigatureComponents = []; // Clear flag on any deletion
            justSplitLigature = false;
            return chars.slice(0, -1).join('');

        case 'deleteContentForward':
            // Delete key - remove first character (shouldn't happen in our UI)
            lastAutoLigatureComponents = [];
            justSplitLigature = false;
            const charsForward = Array.from(currentShadow);
            return charsForward.slice(1).join('');

        case 'insertReplacementText':
            // Safari uses this for ligature formation from virtual keyboard
            // Use the replacement range captured from beforeinput event
            lastAutoLigatureComponents = [];
            justSplitLigature = false;
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
            lastAutoLigatureComponents = [];
            justSplitLigature = false;
            return eventData || browserValue;

        case 'deleteWordBackward':
        case 'deleteWordForward':
        case 'deleteByCut':
            // Word deletion or cut - use browser's resulting value
            lastAutoLigatureComponents = [];
            justSplitLigature = false;
            return browserValue;

        case 'insertCompositionText':
            // IME composition - trust browser value
            lastAutoLigatureComponents = [];
            justSplitLigature = false;
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
        gameState.totalLettersTyped += numNew;
        gameState.currentLevelLettersTyped += numNew;

        // Check correctness
        let allCorrect = true;
        for (let i = maxEffectiveLength; i < effectiveLength; i++) {
            if (i >= wordChars.length || inputChars[i] !== wordChars[i]) {
                allCorrect = false;
                break;
            }
        }

        if (allCorrect) {
            gameState.correctLetters += numNew;
            gameState.currentLevelCorrectLetters += numNew;
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
        lastAutoLigatureComponents = [];
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
          ', correct=' + gameState.correctLetters + '/' + gameState.totalLettersTyped +
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

    // Track if input had focus before opening modal
    const typingInput = document.getElementById('typingInput');
    inputHadFocusBeforeModal = typingInput && document.activeElement === typingInput;

    // Hide virtual keyboard temporarily while modal is shown
    hideVirtualKeyboardTemporarily();

    // Blur typing input to prevent mobile keyboard from appearing
    if (typingInput) {
        typingInput.blur();
    }

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

// Splash screen functions
const APP_VERSION = '{{FULL_VERSION}}';

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
    if (gameState.startTime !== null && gameState.pauseStartTime === null) {
        gameState.pauseStartTime = Date.now();
    }
}

function resumeTimer() {
    if (gameState.pauseStartTime !== null) {
        gameState.totalPausedTime += Date.now() - gameState.pauseStartTime;
        gameState.pauseStartTime = null;
    }
}

function openSettings() {
    // Track if input had focus before opening modal
    const typingInput = document.getElementById('typingInput');
    inputHadFocusBeforeModal = typingInput && document.activeElement === typingInput;

    // Hide virtual keyboard temporarily while modal is shown
    hideVirtualKeyboardTemporarily();

    // Blur typing input to prevent mobile keyboard from appearing
    if (typingInput) {
        typingInput.blur();
    }

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
    // Track if input had focus before opening modal
    const typingInput = document.getElementById('typingInput');
    inputHadFocusBeforeModal = typingInput && document.activeElement === typingInput;

    // Hide virtual keyboard temporarily while modal is shown
    hideVirtualKeyboardTemporarily();

    // Blur typing input to prevent mobile keyboard from appearing
    if (typingInput) {
        typingInput.blur();
    }

    // Pause timer if in play mode
    if (currentMode === 'play') {
        pauseTimer();
    }
    // Get current translations
    const t = getCurrentTranslations();

    // Populate high scores content
    let html = '';

    if (Object.keys(gameState.highScores).length === 0) {
        html = `<p style="text-align: center; color: #999;">${t.noScoresYet}</p>`;
    } else {
        html = '<div style="display: flex; flex-direction: column; gap: 20px;">';

        // Show high scores for each level count
        ['3', '6', '10'].forEach(levelCountKey => {
            if (gameState.highScores[levelCountKey]) {
                const scores = gameState.highScores[levelCountKey];
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
    // Track if input had focus before opening modal
    const typingInput = document.getElementById('typingInput');
    inputHadFocusBeforeModal = typingInput && document.activeElement === typingInput;

    // Blur typing input to prevent mobile keyboard from appearing
    if (typingInput) {
        typingInput.blur();
    }

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
    gameState.wordsCompleted = 0;
    gameState.totalLettersTyped = 0;
    gameState.correctLetters = 0;
    gameState.levelStats = [];

    updateStats();

    // Start the selected lesson
    const t = getCurrentTranslations();

    // Set instructions in subtitle
    document.getElementById('mainSubtitle').textContent = t.gameInstructions;

    const levelData = getLearnLessonData(parseInt(level));
    if (levelData) {
        gameState.currentLevelNumber = parseInt(level);
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

    // Special case: virtual keyboard title - depends on current layout
    updateVirtualKeyboardTitle();
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
        // Migrate old bestTime to new gameState.highScores structure
        const oldBestTime = localStorage.getItem('bestTime');
        if (oldBestTime !== null) {
            // Load existing high scores or create new object
            const highScoresJSON = localStorage.getItem('highScores');
            gameState.highScores = highScoresJSON ? JSON.parse(highScoresJSON) : {};
            const timeValue = parseFloat(oldBestTime);
            // Copy the old best time to the 6-level entry (only if not already set)
            if (!gameState.highScores['6'] || gameState.highScores['6'].time === null) {
                gameState.highScores['6'] = { time: timeValue, wpm: null, accuracy: null };
            }
            localStorage.setItem('highScores', JSON.stringify(gameState.highScores));
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

    // Load best time (legacy - now migrated to gameState.highScores)
    const savedBestTime = localStorage.getItem('bestTime');
    if (savedBestTime !== null) {
        bestTime = parseFloat(savedBestTime);
    }

    // Load high scores
    const savedHighScores = localStorage.getItem('highScores');
    if (savedHighScores !== null) {
        try {
            gameState.highScores = JSON.parse(savedHighScores);
        } catch (e) {
            console.error('Failed to parse highScores:', e);
            gameState.highScores = {};
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
    const lessonCompletionModal = document.getElementById('lessonCompletionModal');
    const sessionCompletionModal = document.getElementById('sessionCompletionModal');
    const playCompletionModal = document.getElementById('playCompletionModal');
    const settingsModal = document.getElementById('settingsModal');
    const lessonModal = document.getElementById('lessonModal');
    const contentModal = document.getElementById('contentModal');

    const isModalOpen = lessonCompletionModal.classList.contains('show') ||
                       sessionCompletionModal.classList.contains('show') ||
                       playCompletionModal.classList.contains('show') ||
                       settingsModal.classList.contains('show') ||
                       lessonModal.classList.contains('show') ||
                       contentModal.classList.contains('show');

    if (!isModalOpen) return;

    // Handle Escape key - close/back action
    if (e.key === 'Escape') {
        e.preventDefault();
        if (lessonCompletionModal.classList.contains('show') ||
            sessionCompletionModal.classList.contains('show') ||
            playCompletionModal.classList.contains('show')) {
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
        let activeCompletionModal = null;
        if (lessonCompletionModal.classList.contains('show')) activeCompletionModal = lessonCompletionModal;
        else if (sessionCompletionModal.classList.contains('show')) activeCompletionModal = sessionCompletionModal;
        else if (playCompletionModal.classList.contains('show')) activeCompletionModal = playCompletionModal;

        if (activeCompletionModal) {
            const firstButton = activeCompletionModal.querySelector('button');
            if (firstButton) firstButton.click();
        } else if (lessonModal.classList.contains('show')) {
            // In lesson selector, no default button action
        }
        return;
    }

    // Handle Tab key - cycle between buttons
    if (e.key === 'Tab') {
        const activeModal = lessonCompletionModal.classList.contains('show') ? lessonCompletionModal :
                          sessionCompletionModal.classList.contains('show') ? sessionCompletionModal :
                          playCompletionModal.classList.contains('show') ? playCompletionModal :
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
