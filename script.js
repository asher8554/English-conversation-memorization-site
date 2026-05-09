/**
 * 폰트 크기 관리자
 * 질문과 정답 텍스트의 글자 크기를 조절하고 설정을 localStorage에 저장합니다.
 */
class FontSizeManager {
    /**
     * @param {HTMLElement} questionEl - 질문 요소
     * @param {HTMLElement} answerEl - 정답 요소
     */
    constructor(questionEl, answerEl) {
        this.questionEl = questionEl;
        this.answerEl = answerEl;
        this.qSize = parseFloat(localStorage.getItem('questionFontSize')) || 2.0;
        this.aSize = parseFloat(localStorage.getItem('answerFontSize')) || 1.6;
        this.init();
    }

    /**
     * 초기 설정 적용 및 이벤트 리스너 등록
     */
    init() {
        this.update();
        const increaseBtn = document.getElementById('increaseFont');
        const decreaseBtn = document.getElementById('decreaseFont');
        if (increaseBtn) increaseBtn.addEventListener('click', () => this.changeSize(0.2));
        if (decreaseBtn) decreaseBtn.addEventListener('click', () => this.changeSize(-0.2));
    }

    /**
     * 폰트 크기 변경
     * @param {number} delta - 변경할 크기 (양수/음수)
     */
    changeSize(delta) {
        const newQSize = this.qSize + delta;

        // 1.0rem ~ 4.0rem 사이로 크기 제한
        if (newQSize >= 1.0 && newQSize <= 4.0) {
            this.qSize += delta;
            this.aSize += delta;
            this.update();
        }
    }

    /**
     * 스타일 업데이트 및 저장
     */
    update() {
        this.questionEl.style.fontSize = `${this.qSize}rem`;
        this.answerEl.style.fontSize = `${this.aSize}rem`;
        localStorage.setItem('questionFontSize', this.qSize);
        localStorage.setItem('answerFontSize', this.aSize);
    }
}

/**
 * 다크 모드 관리자
 * 테마 전환 및 설정을 처리합니다.
 */
class DarkModeManager {
    constructor() {
        this.toggleBtn = document.getElementById('darkModeToggle');
        this.body = document.body;
        this.isDarkMode = localStorage.getItem('useDarkMode') === 'true';
        this.init();
    }

    /**
     * 초기 설정 적용
     */
    init() {
        if (this.isDarkMode) {
            this.enableDarkMode();
        }

        if (this.toggleBtn) {
            this.toggleBtn.addEventListener('click', () => this.toggle());
        }
    }

    /**
     * 다크 모드 토글
     */
    toggle() {
        this.isDarkMode = !this.isDarkMode;
        if (this.isDarkMode) {
            this.enableDarkMode();
        } else {
            this.disableDarkMode();
        }
        localStorage.setItem('useDarkMode', this.isDarkMode);
    }

    /**
     * 다크 모드 활성화
     */
    enableDarkMode() {
        this.body.classList.add('dark-mode');
        if (this.toggleBtn) this.toggleBtn.textContent = '☀️';
    }

    /**
     * 다크 모드 비활성화
     */
    disableDarkMode() {
        this.body.classList.remove('dark-mode');
        if (this.toggleBtn) this.toggleBtn.textContent = '🌙';
    }
}

/**
 * TTS (Text-to-Speech) 관리자
 * 음성 합성 기능을 제어하고 사용자 설정을 관리합니다.
 */
class TTSManager {
    constructor() {
        this.synth = window.speechSynthesis;
        this.voices = [];
        this.koVoice = null;
        this.enVoice = null;

        // UI 요소
        this.settingsModal = document.getElementById('settingsModal');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.closeModalBtn = document.querySelector('.close-modal');
        this.saveSettingsBtn = document.getElementById('saveSettingsBtn');
        this.testVoiceBtn = document.getElementById('testVoiceBtn');
        this.koVoiceSelect = document.getElementById('koVoiceSelect');
        this.enVoiceSelect = document.getElementById('enVoiceSelect');

        this.init();
    }

    init() {
        // 음성 목록 로드 (비동기 처리)
        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = () => {
                this.populateVoiceList();
                this.loadSettings();
            };
        }

        // 초기 로드 시도
        this.populateVoiceList();
        this.loadSettings();

        this.initEventListeners();
    }

    initEventListeners() {
        // 모달 열기/닫기
        if (this.settingsBtn) {
            this.settingsBtn.addEventListener('click', () => this.openSettings());
        }
        if (this.closeModalBtn) {
            this.closeModalBtn.addEventListener('click', () => this.closeSettings());
        }
        if (this.saveSettingsBtn) {
            this.saveSettingsBtn.addEventListener('click', () => {
                this.saveSettings();
                this.closeSettings();
            });
        }
        if (this.testVoiceBtn) {
            this.testVoiceBtn.addEventListener('click', () => this.testVoices());
        }

        // 모달 외부 클릭 시 닫기
        window.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) {
                this.closeSettings();
            }
        });
    }

    /**
     * 사용 가능한 음성 목록을 로드하고 필터링하여 드롭다운에 추가합니다.
     * Google, Microsoft, Apple 등 자연스러운 프리미엄 음성을 우선 정렬합니다.
     */
    /**
     * 사용 가능한 음성 목록을 가져와 드롭다운을 채웁니다.
     * Google, Microsoft, Apple 등 자연스러운 프리미엄 목소리를 우선순위로 정렬합니다.
     * 
     * 최적화:
     * - 비교 함수 내에서 매번 점수를 계산하지 않고, 미리 점수를 계산하여 정렬 성능을 개선합니다.
     * 
     * 우선순위:
     * 1. 키워드 매칭 (Google, Microsoft, Apple, Natural, Premium)
     * 2. 언어 매칭 (한국어, 영어)
     */
    populateVoiceList() {
        this.voices = this.synth.getVoices();

        if (this.voices.length === 0) return;

        this.koVoiceSelect.innerHTML = '';
        this.enVoiceSelect.innerHTML = '';

        // 제외할 키워드 (효과음 등)
        const excludedKeywords = [
            'Bells', 'Organ', 'Cello', 'Zarvox', 'Trinoids',
            'Deranged', 'Hysterical', 'Boing', 'Bubbles',
            'Bad News', 'Good News', 'Pipe Organ', 'Whisper'
        ];

        // 우선순위 키워드
        const premiumKeywords = ['Google', 'Microsoft', 'Apple', 'Natural', 'Premium'];

        const sortVoices = (a, b) => {
            const getScore = (voice) => {
                let score = 0;
                premiumKeywords.forEach((keyword, index) => {
                    if (voice.name.includes(keyword)) score += (10 - index);
                });
                return score;
            };
            return getScore(b) - getScore(a); // 점수 높은 순 내림차순
        };

        // 한국어 필터링 및 정렬
        const koVoices = this.voices
            .filter(v => v.lang.includes('ko') || v.lang === 'ko_KR')
            .sort(sortVoices);

        // 영어 필터링 및 정렬
        const enVoices = this.voices
            .filter(v => v.lang.startsWith('en-') || v.lang === 'en_US' || v.lang === 'en_GB')
            .sort(sortVoices);

        // 드롭다운 옵션 추가
        const addOptions = (voiceList, selectElement) => {
            voiceList.forEach(voice => {
                const option = document.createElement('option');
                let displayName = voice.name;

                // 표시 이름 정리
                if (displayName.includes('Google')) displayName = displayName.replace('Google', 'Google (Natural)');
                if (displayName.includes('Microsoft')) displayName = displayName.replace('Microsoft', 'MS');
                
                // 모바일 환경 등에서 너무 긴 이름 축소
                if (displayName.length > 40) {
                     displayName = displayName.substring(0, 37) + '...';
                }

                option.textContent = `${displayName}`;
                option.value = voice.name;
                selectElement.appendChild(option);
            });

            if (voiceList.length === 0) {
                const option = document.createElement('option');
                option.textContent = "사용 가능한 목소리가 없습니다";
                selectElement.appendChild(option);
            }
        };

        addOptions(koVoices, this.koVoiceSelect);
        addOptions(enVoices, this.enVoiceSelect);
    }

    /**
     * 저장된 목소리 설정을 불러옵니다.
     */
    loadSettings() {
        const savedKoVoice = localStorage.getItem('koVoiceName');
        const savedEnVoice = localStorage.getItem('enVoiceName');

        if (savedKoVoice && this.koVoiceSelect.querySelector(`option[value="${savedKoVoice}"]`)) {
            this.koVoiceSelect.value = savedKoVoice;
        }

        if (savedEnVoice && this.enVoiceSelect.querySelector(`option[value="${savedEnVoice}"]`)) {
            this.enVoiceSelect.value = savedEnVoice;
        }

        this.updateCurrentVoices();
    }

    /**
     * 현재 선택된 목소리를 저장하고 적용합니다.
     */
    saveSettings() {
        const selectedKo = this.koVoiceSelect.value;
        const selectedEn = this.enVoiceSelect.value;

        localStorage.setItem('koVoiceName', selectedKo);
        localStorage.setItem('enVoiceName', selectedEn);

        this.updateCurrentVoices();
        alert('설정이 저장되었습니다.');
    }

    /**
     * 현재 선택된 음성 객체를 업데이트합니다.
     */
    updateCurrentVoices() {
        this.koVoice = this.voices.find(v => v.name === this.koVoiceSelect.value);
        this.enVoice = this.voices.find(v => v.name === this.enVoiceSelect.value);
    }

    /**
     * 설정 화면 열기
     */
    openSettings() {
        this.settingsModal.style.display = 'flex';
        // 애니메이션을 위해 잠시 대기
        setTimeout(() => this.settingsModal.classList.add('show'), 10);
    }

    /**
     * 설정 화면 닫기
     */
    closeSettings() {
        this.settingsModal.classList.remove('show');
        setTimeout(() => {
            this.settingsModal.style.display = 'none';
        }, 300);
    }

    /**
     * 목소리 테스트
     */
    testVoices() {
        this.speak('안녕하세요, 한국어 목소리 테스트입니다.', 'ko-KR');
        setTimeout(() => {
            this.speak('Hello, this is an English voice test.', 'en-US');
        }, 2500);
    }

    /**
     * 텍스트를 음성으로 읽습니다.
     * @param {string} text - 읽을 텍스트
     * @param {string} lang - 언어 코드 ('ko-KR' or 'en-US')
     */
    speak(text, lang = 'en-US') {
        if (!text) return;

        this.synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 1.0;

        // 사용자가 설정한 목소리 우선 적용
        let targetVoice = null;
        if (lang === 'ko-KR' && this.koVoice) {
            targetVoice = this.koVoice;
        } else if (lang === 'en-US' && this.enVoice) {
            targetVoice = this.enVoice;
        }

        // 설정된 목소리가 없으면 기본 로직
        if (!targetVoice) {
            targetVoice = this.voices.find(v => v.lang === lang || v.lang.startsWith(lang.split('-')[0]))
                || this.voices[0];
        }

        if (targetVoice) {
            utterance.voice = targetVoice;
        }

        this.synth.speak(utterance);
    }
}

/**
 * 복습 관리자 클래스
 * 
 * 일일 복습 기록을 로컬 스토리지에 저장하여 관리합니다.
 */
class ReviewManager {
    /**
     * 초기화 및 데이터 로드 수행
     */
    constructor(courseId) {
        this.setCourse(courseId);
    }

    setCourse(courseId) {
        this.courseId = courseId;
        this.storageKey = `reviewStats:${courseId}`;
        this.reviews = this.loadReviews();
    }

    /**
     * 로컬 스토리지에서 리뷰 데이터를 불러옵니다.
     * @returns {Object} 리뷰 데이터 객체
     */
    loadReviews() {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) return JSON.parse(stored);

        const legacyStats = localStorage.getItem('reviewStats');
        if (this.courseId === 'conversation' && legacyStats) {
            return JSON.parse(legacyStats);
        }

        return {};
    }

    /**
     * 특정 Day의 리뷰를 완료 처리하고 카운트를 증가시킵니다.
     * @param {string} day - 완료한 Day (예: "Day 001")
     */
    incrementReview(day) {
        if (!this.reviews[day]) {
            this.reviews[day] = { count: 0, lastReviewed: null };
        }
        this.reviews[day].count++;
        this.reviews[day].lastReviewed = new Date().toISOString();
        this.saveReviews();
    }

    /**
     * 리뷰 데이터를 로컬 스토리지에 저장합니다.
     */
    saveReviews() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.reviews));
    }

    /**
     * 모든 리뷰 데이터를 반환합니다.
     */
    getAllReviews() {
        return this.reviews;
    }

    /**
     * 총 리뷰 횟수를 계산합니다.
     */
    getTotalReviews() {
        return Object.values(this.reviews).reduce((sum, item) => sum + item.count, 0);
    }

    /**
     * 모든 리뷰 데이터를 초기화합니다.
     */
    resetReviews() {
        this.reviews = {};
        this.saveReviews();
    }
}


/**
 * 퀴즈 애플리케이션 메인 클래스
 * 데이터 로드, UI 제어, 퀴즈 진행 로직을 담당합니다.
 */
class QuizApp {
    /**
     * @param {Object} quizData - 코스별 퀴즈 데이터
     */
    constructor(quizData) {
        this.courses = this.normalizeCourses(quizData);
        this.currentCourseId = this.getInitialCourseId(quizData.defaultCourse);
        this.data = {};
        this.dayMainSentences = {};
        this.currentDayData = [];
        this.currentIndex = 0;

        this.cacheDOM();

        this.init();
    }

    normalizeCourses(quizData) {
        if (quizData.courses) {
            return quizData.courses;
        }

        return {
            conversation: {
                title: '영어회화',
                data: quizData.data || {},
                dayMainSentences: quizData.dayMainSentences || {}
            }
        };
    }

    getInitialCourseId(defaultCourse) {
        const savedCourseId = localStorage.getItem('selectedCourseId');
        if (savedCourseId && this.courses[savedCourseId]) {
            return savedCourseId;
        }

        if (defaultCourse && this.courses[defaultCourse]) {
            return defaultCourse;
        }

        return Object.keys(this.courses)[0];
    }

    /**
     * DOM 요소 캐싱
     */
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
        this.courseButtons = document.querySelectorAll('.course-btn');
        this.courseMeta = document.getElementById('courseMeta');

        // 통계 관련 DOM
        this.statsBtn = document.getElementById('statsBtn');
        this.statsModal = document.getElementById('statsModal');
        this.closeStatsModalBtn = document.querySelector('.close-stats-modal');
        this.totalReviewsEl = document.getElementById('totalReviews');
        this.statsTableBody = document.getElementById('statsTableBody');
        this.resetStatsBtn = document.getElementById('resetStatsBtn');
    }

    /**
     * Day 선택 드롭다운 생성
     */
    populateDaySelect() {
        this.daySelect.innerHTML = '';
        const fragment = document.createDocumentFragment();
        Object.keys(this.data).forEach(day => {
            const option = document.createElement('option');
            option.value = day;
            let label = day;
            if (this.dayMainSentences[day]) {
                label += " - " + this.dayMainSentences[day];
            }
            option.textContent = label;
            fragment.appendChild(option);
        });
        this.daySelect.appendChild(fragment);
    }

    /**
     * 애플리케이션 초기화
     */
    init() {
        this.ttsManager = new TTSManager();
        this.reviewManager = new ReviewManager(this.currentCourseId);
        this.initEventListeners();

        new DarkModeManager();
        new FontSizeManager(this.questionText, this.answerText);

        // 리뷰 완료 버튼 동적 생성
        this.createReviewCompleteBtn();
        this.switchCourse(this.currentCourseId, false);
    }

    switchCourse(courseId, shouldPersist = true) {
        const course = this.courses[courseId];
        if (!course) return;

        this.currentCourseId = courseId;
        this.data = course.data || {};
        this.dayMainSentences = course.dayMainSentences || {};
        this.reviewManager.setCourse(courseId);

        if (shouldPersist) {
            localStorage.setItem('selectedCourseId', courseId);
        }

        this.courseButtons.forEach(button => {
            const isActive = button.dataset.courseId === courseId;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-pressed', String(isActive));
        });

        if (this.courseMeta) {
            const dayCount = Object.keys(this.data).length;
            this.courseMeta.textContent = `${course.title} · ${dayCount} Days`;
        }

        this.reverseOrderCheckbox.checked = false;
        this.randomOrderCheckbox.checked = false;
        this.populateDaySelect();
        this.originalOptions = Array.from(this.daySelect.options);
        if (this.daySelect.options.length > 0) {
            this.loadDay(this.daySelect.value);
        } else {
            this.renderEmptyState();
        }
    }

    createReviewCompleteBtn() {
        this.reviewCompleteBtn = document.createElement('button');
        this.reviewCompleteBtn.id = 'reviewCompleteBtn';
        this.reviewCompleteBtn.className = 'btn btn-complete';
        this.reviewCompleteBtn.textContent = '✅ Review Complete';
        this.reviewCompleteBtn.style.display = 'none'; // 초기엔 숨김

        // 카드 콘텐츠 내부에 추가 (정답 텍스트 아래)
        this.cardContent.appendChild(this.reviewCompleteBtn);

        this.reviewCompleteBtn.addEventListener('click', () => {
            this.handleReviewComplete();
        });
    }

    handleReviewComplete() {
        const currentDay = this.daySelect.value;
        this.reviewManager.incrementReview(currentDay);

        alert(`Good job! "${currentDay}" review recorded.`);

        // UI 업데이트 없이 그냥 카운트만 올림. 필요하면 버튼 비활성화 등을 할 수 있음.
        this.reviewCompleteBtn.disabled = true;
        this.reviewCompleteBtn.textContent = 'Review Recorded';
    }

    /**
     * 이벤트 리스너 등록
     */
    initEventListeners() {
        this.daySelect.addEventListener('change', (e) => this.loadDay(e.target.value));

        this.showAnswerBtn.addEventListener('click', () => {
            this.answerText.classList.add('visible');
            this.showAnswerBtn.style.display = 'none';

            // 정답 자동 읽기 (영어)
            this.ttsManager.speak(this.answerText.textContent, 'en-US');
        });

        this.prevBtn.addEventListener('click', () => this.handlePrev());
        this.nextBtn.addEventListener('click', () => this.handleNext());

        this.reverseOrderCheckbox.addEventListener('change', (e) => this.handleSortChange(e, this.randomOrderCheckbox));
        this.randomOrderCheckbox.addEventListener('change', (e) => this.handleSortChange(e, this.reverseOrderCheckbox));

        this.courseButtons.forEach(button => {
            button.addEventListener('click', () => this.switchCourse(button.dataset.courseId));
        });

        // 통계 모달 이벤트
        if (this.statsBtn) {
            this.statsBtn.addEventListener('click', () => this.openStats());
        }
        if (this.closeStatsModalBtn) {
            this.closeStatsModalBtn.addEventListener('click', () => this.closeStats());
        }
        // 모달 외부 클릭 시 닫기
        window.addEventListener('click', (e) => {
            if (e.target === this.statsModal) {
                this.closeStats();
            }
        });

        // 통계 초기화 버튼
        if (this.resetStatsBtn) {
            this.resetStatsBtn.addEventListener('click', () => this.handleResetStats());
        }
    }

    handleResetStats() {
        if (confirm('Are you sure you want to reset all review statistics? This action cannot be undone.')) {
            this.reviewManager.resetReviews();
            this.renderStats();
            alert('Statistics have been reset.');
        }
    }

    openStats() {
        this.renderStats();
        this.statsModal.style.display = 'flex';
        setTimeout(() => this.statsModal.classList.add('show'), 10);
    }

    closeStats() {
        this.statsModal.classList.remove('show');
        setTimeout(() => {
            this.statsModal.style.display = 'none';
        }, 300);
    }

    renderStats() {
        const reviews = this.reviewManager.getAllReviews();
        this.totalReviewsEl.textContent = this.reviewManager.getTotalReviews();
        this.statsTableBody.innerHTML = '';
        const fragment = document.createDocumentFragment();

        // 모든 날짜(Day)를 순회하며 통계 표시
        // 데이터에 있는 Day 목록을 기준으로 표시 (리뷰 기록이 없어도 0으로 표시하기 위함)
        Object.keys(this.data).forEach(day => {
            const tr = document.createElement('tr');

            const reviewData = reviews[day] || { count: 0, lastReviewed: '-' };
            let lastReviewedText = '-';
            if (reviewData.lastReviewed && reviewData.lastReviewed !== '-') {
                const date = new Date(reviewData.lastReviewed);
                lastReviewedText = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }

            // Day 이름에 메인 문장도 작게 표시할 수 있지만, 칸이 좁으니 Day만 표시하거나 툴팁으로 처리
            // 여기서는 Day 이름만 깔끔하게 표시

            tr.innerHTML = `
                <td>${day}</td>
                <td style="font-weight: bold; color: var(--primary-color);">${reviewData.count}</td>
                <td>${lastReviewedText}</td>
            `;
            fragment.appendChild(tr);
        });
        this.statsTableBody.appendChild(fragment);
    }

    /**
     * 정렬 옵션 변경 처리
     * @param {Event} event - 이벤트 객체
     * @param {HTMLElement} otherCheckbox - 상호 배제될 체크박스
     */
    handleSortChange(event, otherCheckbox) {
        if (event.target.checked) {
            otherCheckbox.checked = false;
        }
        this.sortOptions();
        this.updateCard();
    }

    /**
     * 선택된 정렬 방식(역순/랜덤)에 따라 Day 목록을 재정렬합니다.
     */
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

        if (isRandom && this.daySelect.options.length > 0) {
            this.daySelect.selectedIndex = 0;
            this.loadDay(this.daySelect.value);
        } else {
            this.daySelect.value = currentVal;

            if (this.daySelect.selectedIndex === -1 && this.daySelect.options.length > 0) {
                this.daySelect.selectedIndex = 0;
                this.loadDay(this.daySelect.value);
            } else {
                this.updateNavButtons();
            }
        }
    }

    /**
     * 배열 섞기 (Fisher-Yates 알고리즘)
     * @param {Array} array - 섞을 배열
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    /**
     * 특정 날짜(Day) 데이터 로드
     * @param {string} day - 선택된 Day
     * @param {boolean} startAtEnd - 마지막 카드부터 시작 여부
     */
    loadDay(day, startAtEnd = false) {
        this.currentDayData = this.data[day] || [];
        this.currentIndex = startAtEnd && this.currentDayData.length > 0 ? this.currentDayData.length - 1 : 0;
        this.updateCard();
    }

    /**
     * 카드 화면 갱신
     */
    updateCard() {
        this.answerText.classList.remove('visible');
        this.cardContent.classList.remove('fade-in');
        void this.cardContent.offsetWidth; // 리플로우 강제하여 애니메이션 재시작
        this.cardContent.classList.add('fade-in');

        if (this.currentDayData.length === 0) {
            this.renderEmptyState();
            return;
        }

        const currentItem = this.currentDayData[this.currentIndex];

        this.questionText.textContent = currentItem.q;
        this.answerText.textContent = currentItem.a;

        this.showAnswerBtn.style.display = 'block';
        this.showAnswerBtn.textContent = 'Show Answer';

        // 마지막 카드인지 확인
        const isLastCard = this.currentIndex === this.currentDayData.length - 1;

        // 리뷰 완료 버튼 초기화 및 표시 여부 결정
        if (isLastCard) {
            this.reviewCompleteBtn.style.display = 'block';
            this.reviewCompleteBtn.disabled = false;
            this.reviewCompleteBtn.textContent = '✅ Review Complete';
        } else {
            this.reviewCompleteBtn.style.display = 'none';
        }

        this.updateNavButtons();

        // 질문 자동 읽기 (TTS)
        this.ttsManager.speak(currentItem.q, 'ko-KR');
    }

    /**
     * 데이터가 없을 때의 빈 상태를 렌더링합니다.
     */
    renderEmptyState() {
        this.questionText.textContent = "이 날짜에 해당하는 질문이 없습니다.";
        this.answerText.textContent = "";
        this.showAnswerBtn.style.display = 'none';
        this.prevBtn.disabled = true;
        this.nextBtn.disabled = true;
    }

    /**
     * 이전/다음 버튼의 활성화 상태를 업데이트합니다.
     */
    updateNavButtons() {
        const isFirstQuestion = this.currentIndex === 0;
        const isFirstDay = this.daySelect.selectedIndex === 0;
        this.prevBtn.disabled = isFirstQuestion && isFirstDay;

        const isLastQuestion = this.currentIndex === this.currentDayData.length - 1;
        const isLastDay = this.daySelect.selectedIndex === this.daySelect.options.length - 1;
        this.nextBtn.disabled = isLastQuestion && isLastDay;
    }

    /**
     * '이전' 버튼 클릭 핸들러입니다.
     */
    handlePrev() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.updateCard();
        } else if (this.daySelect.selectedIndex > 0) {
            this.daySelect.selectedIndex--;
            this.loadDay(this.daySelect.value, true);
        }
    }

    /**
     * '다음' 버튼 클릭 핸들러입니다.
     */
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

// 애플리케이션 초기화
document.addEventListener('DOMContentLoaded', () => {
    fetch('data.json?v=6')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(jsonData => {
            new QuizApp(jsonData);
        })
        .catch(error => {
            console.error('Failed to load data:', error);
            const container = document.querySelector('.container');
            if (container) {
                container.innerHTML = `<div style="text-align:center; padding: 2rem;">
                    <h3>데이터 로딩 실패</h3>
                    <p style="color: red; font-weight: bold;">${error.message}</p>
                    <p>페이지를 새로고침 해보세요.</p>
                </div>`;
            }
        });

    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            window.location.reload();
        });
    }
});
