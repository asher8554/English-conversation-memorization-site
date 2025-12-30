document.addEventListener('DOMContentLoaded', () => {
    class QuizApp {
        constructor(data) {
            this.data = data;
            this.currentDayData = [];
            this.currentIndex = 0;
            
            // UI Elements
            this.daySelect = document.getElementById('daySelect');
            this.questionText = document.getElementById('questionText');
            this.answerText = document.getElementById('answerText');
            this.showAnswerBtn = document.getElementById('showAnswerBtn');
            this.prevBtn = document.getElementById('prevBtn');
            this.nextBtn = document.getElementById('nextBtn');
            this.cardContent = document.getElementById('cardContent');
            this.reverseOrderCheckbox = document.getElementById('reverseOrder');

            this.originalOptions = Array.from(this.daySelect.options);

            this.init();
        }

        init() {
            this.initEventListeners();
            this.initFontControls();
            
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
            
            this.reverseOrderCheckbox.addEventListener('change', () => {
                this.sortOptions();
                this.updateCard();
            });
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

        sortOptions() {
            const isReverse = this.reverseOrderCheckbox.checked;
            const currentVal = this.daySelect.value;
            
            const optionsToSort = [...this.originalOptions];
            if (isReverse) {
                optionsToSort.reverse();
            }
            
            this.daySelect.innerHTML = '';
            optionsToSort.forEach(opt => this.daySelect.add(opt));
            this.daySelect.value = currentVal;
        }

        initFontControls() {
            const increaseFontBtn = document.getElementById('increaseFont');
            const decreaseFontBtn = document.getElementById('decreaseFont');
            
            // Helper to manage font size
            const fontManager = {
                qSize: parseFloat(localStorage.getItem('questionFontSize')) || 2.0,
                aSize: parseFloat(localStorage.getItem('answerFontSize')) || 1.5,
                
                update: () => {
                    this.questionText.style.fontSize = `${fontManager.qSize}rem`;
                    this.answerText.style.fontSize = `${fontManager.aSize}rem`;
                    localStorage.setItem('questionFontSize', fontManager.qSize);
                    localStorage.setItem('answerFontSize', fontManager.aSize);
                },
                
                increase: () => {
                    if (fontManager.qSize < 4.0) {
                        fontManager.qSize += 0.2;
                        fontManager.aSize += 0.2;
                        fontManager.update();
                    }
                },
                
                decrease: () => {
                    if (fontManager.qSize > 1.0) {
                        fontManager.qSize -= 0.2;
                        fontManager.aSize -= 0.2;
                        fontManager.update();
                    }
                }
            };

            fontManager.update(); // Initial apply
            increaseFontBtn.addEventListener('click', () => fontManager.increase());
            decreaseFontBtn.addEventListener('click', () => fontManager.decrease());
        }
    }

    // Initialize App
    const app = new QuizApp(quizData);
});
