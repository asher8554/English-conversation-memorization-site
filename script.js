document.addEventListener('DOMContentLoaded', () => {
    /**
     * 질문과 정답 텍스트의 글자 크기를 관리하며, 설정을 localStorage에 저장합니다.
     */
    class FontSizeManager {
        /**
         * @param {HTMLElement} questionEl - 질문을 표시할 요소
         * @param {HTMLElement} answerEl - 정답을 표시할 요소
         */
        constructor(questionEl, answerEl) {
            this.questionEl = questionEl;
            this.answerEl = answerEl;
            this.qSize = parseFloat(localStorage.getItem('questionFontSize')) || 2.0;
            this.aSize = parseFloat(localStorage.getItem('answerFontSize')) || 2.0;
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
         * 델타 값만큼 글자 크기를 변경합니다.
         * @param {number} delta - 변경할 크기 (예: 0.2)
         */
        changeSize(delta) {
            const newQSize = this.qSize + delta;
            
            // 1.0에서 4.0 사이로 제한
            if (newQSize >= 1.0 && newQSize <= 4.0) {
                this.qSize += delta;
                this.aSize += delta;
                this.update();
            }
        }

        /**
         * 변경된 글자 크기를 DOM 요소에 적용하고 localStorage에 저장합니다.
         */
        update() {
            this.questionEl.style.fontSize = `${this.qSize}rem`;
            this.answerEl.style.fontSize = `${this.aSize}rem`;
            localStorage.setItem('questionFontSize', this.qSize);
            localStorage.setItem('answerFontSize', this.aSize);
        }
    }

    /**
     * 다크 모드를 전환하고 설정을 localStorage에 저장합니다.
     */
    class DarkModeManager {
        constructor() {
            this.toggleBtn = document.getElementById('darkModeToggle');
            this.body = document.body;
            this.isDarkMode = localStorage.getItem('useDarkMode') === 'true';
            this.init();
        }

        /**
         * 초기화 메서드입니다. 저장된 설정이 있으면 적용하고 이벤트를 바인딩합니다.
         */
        init() {
            // 초기 상태 적용
            if (this.isDarkMode) {
                this.enableDarkMode();
            }

            this.toggleBtn.addEventListener('click', () => this.toggle());
        }

        toggle() {
            this.isDarkMode = !this.isDarkMode;
            if (this.isDarkMode) {
                this.enableDarkMode();
            } else {
                this.disableDarkMode();
            }
            localStorage.setItem('useDarkMode', this.isDarkMode);
        }

        enableDarkMode() {
            this.body.classList.add('dark-mode');
            this.toggleBtn.textContent = '☀️'; // 라이트 모드로 전환하는 해 아이콘
        }

        disableDarkMode() {
            this.body.classList.remove('dark-mode');
            this.toggleBtn.textContent = '🌙'; // 다크 모드로 전환하는 달 아이콘
        }
    }

    /**
     * 퀴즈 앱의 메인 로직입니다.
     * 네비게이션, Day 로딩, 옵션 정렬 등을 처리합니다.
     */
    class QuizApp {
        /**
         * @param {Object} data - 퀴즈 데이터 구조
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
            
            // 매니저 초기화
            new DarkModeManager();
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
            
            // 선택이 사라지는 엣지 케이스 처리
            if (this.daySelect.selectedIndex === -1 && this.daySelect.options.length > 0) {
                this.daySelect.selectedIndex = 0;
                this.loadDay(this.daySelect.value);
            } else {
                this.updateNavButtons();
            }
        }

        /**
         * Fisher-Yates 알고리즘을 사용하여 배열을 무작위로 섞습니다.
         * 모든 가능한 순열이 동일한 확률로 나타나도록 보장합니다.
         * 
         * @param {Array} array - 제자리에서 섞을 배열
         */
        shuffleArray(array) {
            // 마지막 요소부터 역순으로 반복
            for (let i = array.length - 1; i > 0; i--) {
                // 0부터 i 사이의 무작위 인덱스 선택
                const j = Math.floor(Math.random() * (i + 1));
                // i와 j 위치의 요소 교환
                [array[i], array[j]] = [array[j], array[i]];
            }
        }

        /**
         * 특정 Day의 데이터를 로드하고 화면을 갱신합니다.
         * 
         * @param {string} day - 선택된 Day 식별자
         * @param {boolean} [startAtEnd=false] - true일 경우 마지막 문제부터 시작 (이전 Day에서 넘어올 때 사용)
         */
        loadDay(day, startAtEnd = false) {
            this.currentDayData = this.data[day] || [];
            this.currentIndex = startAtEnd && this.currentDayData.length > 0 ? this.currentDayData.length - 1 : 0;
            this.updateCard();
        }

        updateCard() {
            // 상태 초기화
            this.answerText.classList.remove('visible');
            this.cardContent.classList.remove('fade-in');
            void this.cardContent.offsetWidth; // 리플로우 트리거
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
            this.questionText.textContent = "이 날짜에 해당하는 질문이 없습니다.";
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

        /**
         * '이전' 버튼 클릭 시 처리를 담당합니다.
         * 현재 Day의 첫 문제라면 이전 Day로 이동합니다.
         */
        handlePrev() {
            if (this.currentIndex > 0) {
                // 현재 Day의 이전 질문으로 이동
                this.currentIndex--;
                this.updateCard();
            } else if (this.daySelect.selectedIndex > 0) {
                // Day의 시작이면, 이전 Day의 마지막 질문으로 이동
                this.daySelect.selectedIndex--;
                this.loadDay(this.daySelect.value, true); // true = startAtEnd
            }
        }

        /**
         * '다음' 버튼 클릭 시 처리를 담당합니다.
         * 현재 Day의 마지막 문제라면 다음 Day로 이동합니다.
         */
        handleNext() {
            if (this.currentIndex < this.currentDayData.length - 1) {
                // 현재 Day의 다음 질문으로 이동
                this.currentIndex++;
                this.updateCard();
            } else if (this.daySelect.selectedIndex < this.daySelect.options.length - 1) {
                // Day의 끝이면, 다음 Day의 첫 번째 질문으로 이동
                this.daySelect.selectedIndex++;
                this.loadDay(this.daySelect.value);
            }
        }
    }

    // 앱 초기화
    const app = new QuizApp(quizData);
});
