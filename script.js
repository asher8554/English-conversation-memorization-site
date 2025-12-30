document.addEventListener('DOMContentLoaded', () => {
    /**
     * Manages font size for question and answer text, persisting preferences to localStorage.
     */
    class FontSizeManager {
        /**
         * @param {HTMLElement} questionEl - The element displaying the question.
         * @param {HTMLElement} answerEl - The element displaying the answer.
         */
        constructor(questionEl, answerEl) {
            this.questionEl = questionEl;
            this.answerEl = answerEl;
            this.qSize = parseFloat(localStorage.getItem('questionFontSize')) || 2.0;
            this.aSize = parseFloat(localStorage.getItem('answerFontSize')) || 1.5;
            this.init();
        }

        init() {
            this.update();
            const increaseBtn = document.getElementById('increaseFont');
            const decreaseBtn = document.getElementById('decreaseFont');
            increaseBtn.addEventListener('click', () => this.changeSize(0.2));
            decreaseBtn.addEventListener('click', () => this.changeSize(-0.2));
        }

        /**
         * Changes font size by a delta value.
         * @param {number} delta - Amount to change (e.g. 0.2).
         */
        changeSize(delta) {
            const newQSize = this.qSize + delta;
            
            // Limit 1.0 to 4.0
            if (newQSize >= 1.0 && newQSize <= 4.0) {
                this.qSize += delta;
                this.aSize += delta;
                this.update();
            }
        }

        update() {
            this.questionEl.style.fontSize = `${this.qSize}rem`;
            this.answerEl.style.fontSize = `${this.aSize}rem`;
            localStorage.setItem('questionFontSize', this.qSize);
            localStorage.setItem('answerFontSize', this.aSize);
        }
    }

    /**
     * Main application logic for the Quiz.
     * Handles navigation, day loading, and option sorting.
     */
    class QuizApp {
        /**
         * @param {Object} data - The quiz data structure.
         */
        constructor(data) {
            this.data = data;
            this.currentDayData = [];
            this.currentIndex = 0;
            
            this.cacheDOM();
            this.originalOptions = Array.from(this.daySelect.options);
            
            this.init();
        }

        cacheDOM() {
            this.daySelect = document.getElementById('daySelect');
            this.questionText = document.getElementById('questionText');
            this.answerText = document.getElementById('answerText');
            this.showAnswerBtn = document.getElementById('showAnswerBtn');
            this.prevBtn = document.getElementById('prevBtn');
            this.nextBtn = document.getElementById('nextBtn');
            this.cardContent = document.getElementById('cardContent');
            this.reverseOrderCheckbox = document.getElementById('reverseOrder');
            this.randomOrderCheckbox = document.getElementById('randomOrder');
        }

        init() {
            this.initEventListeners();
            
            // Initialize Font Manager
            new FontSizeManager(this.questionText, this.answerText);
            
            if (this.daySelect.options.length > 0) {
                this.loadDay(this.daySelect.value);
            }
        }

        initEventListeners() {
            this.daySelect.addEventListener('change', (e) => this.loadDay(e.target.value));
            
            this.showAnswerBtn.addEventListener('click', () => {
                this.answerText.classList.add('visible');
                this.showAnswerBtn.style.display = 'none';
            });

            this.prevBtn.addEventListener('click', () => this.handlePrev());
            this.nextBtn.addEventListener('click', () => this.handleNext());
            
            this.reverseOrderCheckbox.addEventListener('change', (e) => this.handleSortChange(e, this.randomOrderCheckbox));
            this.randomOrderCheckbox.addEventListener('change', (e) => this.handleSortChange(e, this.reverseOrderCheckbox));
        }

        handleSortChange(event, otherCheckbox) {
            if (event.target.checked) {
                otherCheckbox.checked = false;
            }
            this.sortOptions();
            this.updateCard();
        }

        sortOptions() {
            const isReverse = this.reverseOrderCheckbox.checked;
            const isRandom = this.randomOrderCheckbox.checked;
            const currentVal = this.daySelect.value;
            
            let optionsToSort = [...this.originalOptions];
            
            if (isRandom) {
                this.shuffleArray(optionsToSort);
            } else if (isReverse) {
                optionsToSort.reverse();
            }
            
            this.daySelect.innerHTML = '';
            optionsToSort.forEach(opt => this.daySelect.add(opt));
            
            this.daySelect.value = currentVal;
            
            // Handle edge case where selection is lost
            if (this.daySelect.selectedIndex === -1 && this.daySelect.options.length > 0) {
                this.daySelect.selectedIndex = 0;
                this.loadDay(this.daySelect.value);
            } else {
                this.updateNavButtons();
            }
        }

        shuffleArray(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
        }

        loadDay(day, startAtEnd = false) {
            this.currentDayData = this.data[day] || [];
            this.currentIndex = startAtEnd && this.currentDayData.length > 0 ? this.currentDayData.length - 1 : 0;
            this.updateCard();
        }

        updateCard() {
            // Reset state
            this.answerText.classList.remove('visible');
            this.cardContent.classList.remove('fade-in');
            void this.cardContent.offsetWidth; // Trigger reflow
            this.cardContent.classList.add('fade-in');

            if (this.currentDayData.length === 0) {
                this.renderEmptyState();
                return;
            }

            const currentItem = this.currentDayData[this.currentIndex];
            this.questionText.innerHTML = currentItem.q;
            this.answerText.innerHTML = currentItem.a;
            this.showAnswerBtn.style.display = 'block';
            this.showAnswerBtn.textContent = 'Show Answer';

            this.updateNavButtons();
        }

        renderEmptyState() {
            this.questionText.textContent = "No questions for this day.";
            this.answerText.textContent = "";
            this.showAnswerBtn.style.display = 'none';
            this.prevBtn.disabled = true;
            this.nextBtn.disabled = true;
        }

        updateNavButtons() {
            const isFirstQuestion = this.currentIndex === 0;
            const isFirstDay = this.daySelect.selectedIndex === 0;
            this.prevBtn.disabled = isFirstQuestion && isFirstDay;
            
            const isLastQuestion = this.currentIndex === this.currentDayData.length - 1;
            const isLastDay = this.daySelect.selectedIndex === this.daySelect.options.length - 1;
            this.nextBtn.disabled = isLastQuestion && isLastDay;
        }

        handlePrev() {
            if (this.currentIndex > 0) {
                this.currentIndex--;
                this.updateCard();
            } else if (this.daySelect.selectedIndex > 0) {
                this.daySelect.selectedIndex--;
                this.loadDay(this.daySelect.value, true);
            }
        }

        handleNext() {
            if (this.currentIndex < this.currentDayData.length - 1) {
                this.currentIndex++;
                this.updateCard();
            } else if (this.daySelect.selectedIndex < this.daySelect.options.length - 1) {
                this.daySelect.selectedIndex++;
                this.loadDay(this.daySelect.value);
            }
        }
    }

    // Initialize App
    const app = new QuizApp(quizData);
});
