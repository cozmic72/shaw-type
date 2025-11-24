// GameState - Encapsulates all game session state and statistics
class GameState {
    constructor() {
        // Mode and level tracking
        this.currentMode = 'play'; // 'play' or 'learn'
        this.currentLevelNumber = 1;
        this.currentLevelTitle = '';
        this.currentLevelType = 'level'; // 'level' or 'lesson'
        this.currentLevelTypeLabel = 'Level';
        this.selectedLevel = 1; // For practice mode lesson selection

        // Current level configuration
        this.currentLevelWordPool = [];
        this.currentLevelWordCount = 5;
        this.currentLevelCompletionCallback = null;

        // Word completion tracking
        this.wordsCompleted = 0;
        this.wordsInCurrentLevel = 0;

        // Letter statistics (session totals)
        this.totalLettersTyped = 0;
        this.correctLetters = 0;

        // Letter statistics (current level only)
        this.currentLevelLettersTyped = 0;
        this.currentLevelCorrectLetters = 0;

        // Timer tracking (play mode only)
        this.startTime = null;
        this.pauseStartTime = null;
        this.totalPausedTime = 0;

        // Level statistics history
        this.levelStats = [];

        // High scores (persisted to localStorage)
        this.highScores = {};
        this.loadHighScores();
    }

    // Start a new play session
    startPlaySession(levelCount) {
        this.currentMode = 'play';
        this.currentLevelNumber = 1;
        this.resetSessionStats();
        this.levelStats = [];
        this.startTime = null;
        this.pauseStartTime = null;
        this.totalPausedTime = 0;
    }

    // Start a new practice session
    startPracticeSession(lessonNumber) {
        this.currentMode = 'learn';
        this.currentLevelNumber = lessonNumber;
        this.selectedLevel = lessonNumber;
        this.resetSessionStats();
        this.levelStats = [];
    }

    // Reset session statistics (words, letters, accuracy)
    resetSessionStats() {
        this.wordsCompleted = 0;
        this.wordsInCurrentLevel = 0;
        this.totalLettersTyped = 0;
        this.correctLetters = 0;
        this.currentLevelLettersTyped = 0;
        this.currentLevelCorrectLetters = 0;
    }

    // Start a new level/lesson
    startLevel(wordPool, wordCount, type, title, typeLabel, completionCallback) {
        this.currentLevelWordPool = wordPool;
        this.currentLevelWordCount = wordCount;
        this.currentLevelType = type;
        this.currentLevelTitle = title;
        this.currentLevelTypeLabel = typeLabel;
        this.currentLevelCompletionCallback = completionCallback;
        this.wordsInCurrentLevel = 0;
        this.currentLevelLettersTyped = 0;
        this.currentLevelCorrectLetters = 0;
    }

    // Record a completed word
    completeWord(letterCount, correctCount) {
        this.wordsCompleted++;
        this.wordsInCurrentLevel++;
        this.totalLettersTyped += letterCount;
        this.correctLetters += correctCount;
        this.currentLevelLettersTyped += letterCount;
        this.currentLevelCorrectLetters += correctCount;
    }

    // Check if current level is complete
    isLevelComplete() {
        return this.wordsInCurrentLevel >= this.currentLevelWordCount;
    }

    // Record completed level statistics
    recordLevelCompletion() {
        const finalLevelAccuracy = this.currentLevelLettersTyped === 0 ? 100.0 :
            ((this.currentLevelCorrectLetters / this.currentLevelLettersTyped) * 100);

        this.levelStats.push({
            level: this.currentLevelNumber,
            accuracy: finalLevelAccuracy,
            lettersTyped: this.currentLevelLettersTyped,
            correctLetters: this.currentLevelCorrectLetters
        });
    }

    // Timer management
    startTimer() {
        if (this.currentMode === 'play' && !this.startTime) {
            this.startTime = Date.now();
        }
    }

    pauseTimer() {
        if (this.currentMode === 'play' && !this.pauseStartTime) {
            this.pauseStartTime = Date.now();
        }
    }

    resumeTimer() {
        if (this.currentMode === 'play' && this.pauseStartTime) {
            this.totalPausedTime += (Date.now() - this.pauseStartTime);
            this.pauseStartTime = null;
        }
    }

    getElapsedTime() {
        if (!this.startTime) return 0;
        const endTime = Date.now();
        return (endTime - this.startTime) - this.totalPausedTime;
    }

    // Statistics calculations
    getSessionAccuracy() {
        if (this.totalLettersTyped === 0) return 100.0;
        return (this.correctLetters / this.totalLettersTyped) * 100;
    }

    getCurrentLevelAccuracy() {
        if (this.currentLevelLettersTyped === 0) return 100.0;
        return (this.currentLevelCorrectLetters / this.currentLevelLettersTyped) * 100;
    }

    getWPM() {
        const elapsedMinutes = this.getElapsedTime() / 60000;
        if (elapsedMinutes === 0) return 0;
        return this.wordsCompleted / elapsedMinutes;
    }

    getLettersPerMinute() {
        const elapsedMinutes = this.getElapsedTime() / 60000;
        if (elapsedMinutes === 0) return 0;
        return this.totalLettersTyped / elapsedMinutes;
    }

    // High scores management
    loadHighScores() {
        try {
            const saved = localStorage.getItem('highScores');
            this.highScores = saved ? JSON.parse(saved) : {};
        } catch (e) {
            console.error('Failed to load high scores:', e);
            this.highScores = {};
        }
    }

    saveHighScores() {
        try {
            localStorage.setItem('highScores', JSON.stringify(this.highScores));
        } catch (e) {
            console.error('Failed to save high scores:', e);
        }
    }

    checkAndUpdateHighScores(levelCount) {
        const levelCountKey = levelCount.toString();
        if (!this.highScores[levelCountKey]) {
            this.highScores[levelCountKey] = { time: null, wpm: null, accuracy: null };
        }

        const currentHighScores = this.highScores[levelCountKey];
        const elapsedSeconds = this.getElapsedTime() / 1000;
        const wpm = this.getWPM();
        const accuracy = this.getSessionAccuracy();

        const records = {
            isNewTimeRecord: false,
            isNewWPMRecord: false,
            isNewAccuracyRecord: false
        };

        // Check and update time record (lower is better)
        if (currentHighScores.time === null || elapsedSeconds < currentHighScores.time) {
            currentHighScores.time = elapsedSeconds;
            records.isNewTimeRecord = true;
        }

        // Check and update WPM record (higher is better)
        if (currentHighScores.wpm === null || wpm > currentHighScores.wpm) {
            currentHighScores.wpm = wpm;
            records.isNewWPMRecord = true;
        }

        // Check and update accuracy record (higher is better)
        if (currentHighScores.accuracy === null || accuracy > currentHighScores.accuracy) {
            currentHighScores.accuracy = accuracy;
            records.isNewAccuracyRecord = true;
        }

        this.saveHighScores();
        return records;
    }

    getHighScoresForLevelCount(levelCount) {
        const levelCountKey = levelCount.toString();
        return this.highScores[levelCountKey] || { time: null, wpm: null, accuracy: null };
    }
}
