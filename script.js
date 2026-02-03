/**
 * 질문과 정답 텍스트의 글자 크기를 관리하며, 설정을 localStorage에 저장합니다.
 *
 * @class FontSizeManager
 */
class FontSizeManager {
    /**
     * FontSizeManager 인스턴스를 생성합니다.
     * 
     * @param {HTMLElement} questionEl - 질문 텍스트를 표시할 DOM 요소
     * @param {HTMLElement} answerEl - 정답 텍스트를 표시할 DOM 요소
     */
    constructor(questionEl, answerEl) {
        this.questionEl = questionEl;
        this.answerEl = answerEl;
        this.qSize = parseFloat(localStorage.getItem('questionFontSize')) || 2.0;
        this.aSize = parseFloat(localStorage.getItem('answerFontSize')) || 1.6;
        this.init();
    }

    /**
     * 초기화 로직을 수행합니다.
     * 저장된 설정을 적용하고 글자 크기 조절 버튼에 이벤트 리스너를 등록합니다.
     */
    init() {
        this.update();
        const increaseBtn = document.getElementById('increaseFont');
        const decreaseBtn = document.getElementById('decreaseFont');
        if (increaseBtn) increaseBtn.addEventListener('click', () => this.changeSize(0.2));
        if (decreaseBtn) decreaseBtn.addEventListener('click', () => this.changeSize(-0.2));
    }

    /**
     * 글자 크기를 변경합니다.
     * 
     * @param {number} delta - 변경할 크기 (양수: 확대, 음수: 축소)
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
     * 변경된 글자 크기를 DOM에 적용하고 localStorage에 저장합니다.
     */
    update() {
        this.questionEl.style.fontSize = `${this.qSize}rem`;
        this.answerEl.style.fontSize = `${this.aSize}rem`;
        localStorage.setItem('questionFontSize', this.qSize);
        localStorage.setItem('answerFontSize', this.aSize);
    }
}

/**
 * 다크 모드/라이트 모드 전환을 관리합니다.
 *
 * @class DarkModeManager
 */
class DarkModeManager {
    /**
     * DarkModeManager 인스턴스를 생성합니다.
     * 초기 로드 시 저장된 설정에 따라 테마를 적용합니다.
     */
    constructor() {
        this.toggleBtn = document.getElementById('darkModeToggle');
        this.body = document.body;
        this.isDarkMode = localStorage.getItem('useDarkMode') === 'true';
        this.init();
    }

    /**
     * 초기화 로직을 수행합니다.
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
     * 다크 모드 상태를 토글합니다.
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
     * 다크 모드를 활성화합니다.
     */
    enableDarkMode() {
        this.body.classList.add('dark-mode');
        if (this.toggleBtn) this.toggleBtn.textContent = '☀️';
    }

    /**
     * 다크 모드를 비활성화(라이트 모드)합니다.
     */
    disableDarkMode() {
        this.body.classList.remove('dark-mode');
        if (this.toggleBtn) this.toggleBtn.textContent = '🌙';
    }
}

/**
 * 텍스트 음성 변환(TTS) 기능을 관리합니다.
 * 
 * @class TTSManager
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
     * 사용 가능한 음성 목록을 가져와 드롭다운을 채웁니다.
     * 자연스러운 목소리(Google, Microsoft 등)를 우선순위로 정렬합니다.
     */
    populateVoiceList() {
        this.voices = this.synth.getVoices();
        
        if (this.voices.length === 0) return;

        this.koVoiceSelect.innerHTML = '';
        this.enVoiceSelect.innerHTML = '';

        // 우선순위 키워드 (자연스러운 목소리 순서)
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

        // 정렬된 리스트 추가
        const addOptions = (voiceList, selectElement) => {
            voiceList.forEach(voice => {
                const option = document.createElement('option');
                // 이름 좀 더 깔끔하게 표시
                let displayName = voice.name;
                
                // 불필요한 시스템 텍스트 제거 (예: Japanese -> 일본어 등의 표시는 유지하되 너무 길면 자르기)
                if (displayName.includes('Google')) displayName = displayName.replace('Google', 'Google (Natural)');
                if (displayName.includes('Microsoft')) displayName = displayName.replace('Microsoft', 'MS');

                option.textContent = `${displayName}`;
                option.value = voice.name;
                selectElement.appendChild(option);
            });
            
            // 만약 목소리가 아예 없으면 기본 안내 추가
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
 * 퀴즈 애플리케이션의 핵심 로직을 담당합니다.
 * 데이터 로딩, UI 렌더링, 네비게이션, 정렬 기능을 관리합니다.
 *
 * @class QuizApp
 */
class QuizApp {
    /**
     * QuizApp 인스턴스를 생성합니다.
     * 
     * @param {Object} data - 날짜별 퀴즈 카드 데이터 (Question/Answer 쌍)
     * @param {Object} dayMainSentences - 날짜별 메인 문장 데이터
     */
    constructor(data, dayMainSentences) {
        this.data = data;
        this.dayMainSentences = dayMainSentences;
        this.currentDayData = [];
        this.currentIndex = 0;

        this.cacheDOM();
        this.populateDaySelect();
        this.originalOptions = Array.from(this.daySelect.options);

        this.init();
    }

    /**
     * 자주 사용되는 DOM 요소들을 캐싱합니다.
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
    }

    /**
     * 데이터에 기반하여 Day 선택 드롭다운 메뉴를 생성합니다.
     */
    populateDaySelect() {
        this.daySelect.innerHTML = '';
        Object.keys(this.data).forEach(day => {
            const option = document.createElement('option');
            option.value = day;
            let label = day;
            if (this.dayMainSentences[day]) {
                label += " - " + this.dayMainSentences[day];
            }
            option.textContent = label;
            this.daySelect.appendChild(option);
        });
    }

    /**
     * 앱을 초기화합니다.
     * 이벤트 리스너를 등록하고 첫 번째 데이터를 로드합니다.
     */
    init() {
        this.ttsManager = new TTSManager();
        this.initEventListeners();

        new DarkModeManager();
        new FontSizeManager(this.questionText, this.answerText);

        if (this.daySelect.options.length > 0) {
            this.loadDay(this.daySelect.value);
        } else {
            this.renderEmptyState();
        }
    }

    /**
     * 각종 사용자 인터랙션에 대한 이벤트 리스너를 등록합니다.
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
    }

    /**
     * 정렬 옵션 변경 시 호출됩니다.
     * 역순 정렬과 랜덤 정렬은 상호 배타적으로 동작합니다.
     * 
     * @param {Event} event - 체크박스 변경 이벤트
     * @param {HTMLElement} otherCheckbox - 해제할 다른 정렬 옵션 체크박스
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

        this.daySelect.value = currentVal;

        if (this.daySelect.selectedIndex === -1 && this.daySelect.options.length > 0) {
            this.daySelect.selectedIndex = 0;
            this.loadDay(this.daySelect.value);
        } else {
            this.updateNavButtons();
        }
    }

    /**
     * 배열의 요소를 무작위로 섞습니다 (Fisher-Yates 알고리즘).
     * 
     * @param {Array} array - 섞을 배열
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    /**
     * 특정 Day의 데이터를 로드하여 현재 퀴즈 세트를 설정합니다.
     * 
     * @param {string} day - 선택된 Day 키 (예: "Day 001")
     * @param {boolean} startAtEnd - true일 경우 마지막 카드부터 보여줍니다 (이전 Day에서 이동 시)
     */
    loadDay(day, startAtEnd = false) {
        this.currentDayData = this.data[day] || [];
        this.currentIndex = startAtEnd && this.currentDayData.length > 0 ? this.currentDayData.length - 1 : 0;
        this.updateCard();
    }

    /**
     * 현재 선택된 카드의 내용(질문, 정답)으로 화면을 갱신합니다.
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
    fetch('data.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(jsonData => {
            // 최적화: 백엔드에서 이미 처리된 데이터를 바로 사용합니다.
            // 별도의 processQuizData 함수가 필요 없습니다.
            const { data, dayMainSentences } = jsonData;
            new QuizApp(data, dayMainSentences);
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
