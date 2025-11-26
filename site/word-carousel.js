// WordCarousel - Manages the 4-slot word carousel display
class WordCarousel {
    constructor(wordSlotElements) {
        this.wordSlots = wordSlotElements;
        this.words = ['', '', '', ''];
        this.carouselOffset = 0;
        this.currentWord = '';
    }

    // Initialize carousel - loads first two words
    initialize(wordGenerator) {
        this.words = ['', '', '', ''];
        this.carouselOffset = 2; // Will advance to 3, then 0

        // Load first two words
        this.loadNewWord(wordGenerator);
        this.loadNewWord(wordGenerator);
    }

    // Load a new word into the next slot
    loadNewWord(wordGenerator) {
        const prevPrevSlot = (this.carouselOffset - 2 + 4) % 4;
        const slot = this.wordSlots[prevPrevSlot];

        // Get next word from generator
        const wordData = wordGenerator();

        if (wordData) {
            const { word, isLastWord } = wordData;

            // Disable transitions before setting position
            slot.style.transition = 'none';

            // Store the word in its slot
            this.words[prevPrevSlot] = word;

            // Calculate positions for initial placement
            const currentSlotIndex = this.carouselOffset;
            const nextSlotIndex = (this.carouselOffset + 1) % 4;
            const carouselWidth = this.wordSlots[0].parentElement.clientWidth;
            const currentWidth = this.wordSlots[currentSlotIndex].offsetWidth;
            const nextWidth = this.wordSlots[nextSlotIndex].offsetWidth;
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
            slot.innerHTML = '';
        }

        // Advance carousel offset
        this.carouselOffset = (this.carouselOffset + 1) % 4;

        // Update current word
        this.currentWord = this.words[this.carouselOffset];

        return this.currentWord;
    }

    // Get the current word being typed
    getCurrentWord() {
        return this.currentWord;
    }

    // Set the current word (for ligature processing, etc.)
    setCurrentWord(word) {
        this.currentWord = word;
        this.words[this.carouselOffset] = word;
    }

    // Update visual display of all carousel slots
    updateDisplay(userInput, fontSize, colorFunction) {
        for (let i = 0; i < 4; i++) {
            const slot = this.wordSlots[i];
            const word = this.words[i];

            // Calculate position relative to current
            const posOffset = (i - this.carouselOffset + 4) % 4;

            // Remove old position classes
            slot.className = 'word-slot slot-' + i;

            // Set font size
            slot.style.fontSize = fontSize + 'px';

            // Add appropriate position class
            if (posOffset === 0) {
                // Current word - apply coloring
                slot.classList.add('pos-current');
                slot.innerHTML = colorFunction ? colorFunction(word, userInput) : word;
            } else if (posOffset === 1) {
                slot.classList.add('pos-next');
                slot.innerHTML = word;
            } else if (posOffset === 3) {
                slot.classList.add('pos-prev');
                slot.innerHTML = word;
            } else if (posOffset === 2) {
                slot.classList.add('pos-prev-prev');
                slot.innerHTML = word;
            }
        }

        // Reposition slots
        this.repositionSlots();
    }

    // Reposition carousel slots based on their widths
    repositionSlots() {
        const carouselWidth = this.wordSlots[0].parentElement.clientWidth;

        // Find which slots correspond to which positions
        let currentSlot = -1;
        let prevSlot = -1;
        let nextSlot = -1;
        let nextNextSlot = -1;

        for (let i = 0; i < 4; i++) {
            const posOffset = (i - this.carouselOffset + 4) % 4;
            if (posOffset === 0) currentSlot = i;
            else if (posOffset === 3) prevSlot = i;
            else if (posOffset === 1) nextSlot = i;
            else if (posOffset === 2) nextNextSlot = i;
        }

        // Calculate widths
        const currentWidth = this.wordSlots[currentSlot].offsetWidth;
        const prevWidth = prevSlot >= 0 ? this.wordSlots[prevSlot].offsetWidth : 0;
        const nextWidth = nextSlot >= 0 ? this.wordSlots[nextSlot].offsetWidth : 0;

        // Calculate X positions
        const currentX = (carouselWidth / 2) - (currentWidth / 2);
        const prevX = currentX - prevWidth;
        const nextX = currentX + currentWidth;
        const nextNextX = nextX + nextWidth;

        // Apply transforms
        this.wordSlots[currentSlot].style.transform = `translateX(${currentX}px) translateY(-50%)`;
        if (prevSlot >= 0) this.wordSlots[prevSlot].style.transform = `translateX(${prevX}px) translateY(-50%)`;
        if (nextSlot >= 0) this.wordSlots[nextSlot].style.transform = `translateX(${nextX}px) translateY(-50%)`;
        if (nextNextSlot >= 0) this.wordSlots[nextNextSlot].style.transform = `translateX(${nextNextX}px) translateY(-50%)`;
    }

    // Clear carousel
    clear() {
        this.words = ['', '', '', ''];
        this.carouselOffset = 0;
        this.currentWord = '';

        for (let i = 0; i < 4; i++) {
            this.wordSlots[i].innerHTML = '';
            this.wordSlots[i].className = 'word-slot slot-' + i;
        }
    }
}
