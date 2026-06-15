function getStorageItem(key) {
    try {
        return localStorage.getItem(key);
    } catch (error) {
        return null;
    }
}

function setStorageItem(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (error) {
        return false;
    }
}

const DAY_SECTION_KEYS = [
    'items',
    'cards',
    'sentences',
    'examples',
    'Examples',
    'Model Examples',
    'modelExamples',
    'Small talk',
    'Small Talk',
    'smallTalk',
    'Further Studies',
    'furtherStudies',
    'further_studies'
];

const SECTION_NAME_BY_KEY = {
    'Examples': 'Examples',
    'Model Examples': 'Model Examples',
    modelExamples: 'Model Examples',
    'Small talk': 'Small talk',
    'Small Talk': 'Small talk',
    smallTalk: 'Small talk',
    'Further Studies': 'Further Studies',
    furtherStudies: 'Further Studies',
    further_studies: 'Further Studies'
};

function normalizeCourseData(courseData) {
    return Object.entries(courseData || {}).reduce((normalized, [day, dayData]) => {
        normalized[day] = normalizeDayData(dayData);
        return normalized;
    }, {});
}

function normalizeDayData(dayData) {
    if (Array.isArray(dayData)) {
        return normalizeCardList(dayData);
    }

    if (!dayData || typeof dayData !== 'object') {
        return [];
    }

    const directCards = normalizeCardEntry(dayData);
    if (directCards.length > 0) {
        return directCards;
    }

    return DAY_SECTION_KEYS.flatMap(sectionKey => (
        Object.prototype.hasOwnProperty.call(dayData, sectionKey)
            ? normalizeCardList(dayData[sectionKey], normalizeSectionName(sectionKey))
            : []
    ));
}

function normalizeCardList(cardList, section) {
    if (Array.isArray(cardList)) {
        return cardList.flatMap(card => normalizeCardEntry(card, section));
    }

    return normalizeCardEntry(cardList, section);
}

function normalizeCardEntry(entry, section) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        return Array.isArray(entry) ? normalizeCardList(entry, section) : [];
    }

    const q = pickNonBlankString(entry, ['q', 'question', 'ko', 'korean', 'prompt']);
    const a = pickNonBlankString(entry, ['a', 'answer', 'en', 'english', 'response']);
    const entrySection = pickNonBlankString(entry, ['section', 'category', 'group']);
    const normalizedSection = normalizeSectionName(entrySection) || section;

    if (!q || !a) {
        return [];
    }

    return normalizedSection ? [{ q, a, section: normalizedSection }] : [{ q, a }];
}

function normalizeSectionName(sectionKey) {
    if (typeof sectionKey !== 'string') {
        return '';
    }

    const trimmed = sectionKey.trim();
    return SECTION_NAME_BY_KEY[trimmed] || trimmed;
}

function pickNonBlankString(source, keys) {
    for (const key of keys) {
        const value = source[key];
        if (typeof value === 'string' && value.trim()) {
            return value;
        }
    }

    return '';
}

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
        this.qSize = parseFloat(getStorageItem('questionFontSize')) || 2.0;
        this.aSize = parseFloat(getStorageItem('answerFontSize')) || 1.6;
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
        setStorageItem('questionFontSize', this.qSize);
        setStorageItem('answerFontSize', this.aSize);
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
        this.isDarkMode = getStorageItem('useDarkMode') === 'true';
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
        setStorageItem('useDarkMode', this.isDarkMode);
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
        this.isSupported = Boolean(window.speechSynthesis && typeof SpeechSynthesisUtterance !== 'undefined');
        this.synth = this.isSupported ? window.speechSynthesis : null;
        this.voices = [];
        this.koVoice = null;
        this.enVoice = null;
        this.pendingSpeech = null;
        this.pendingSpeechTimer = null;
        this.voicesReady = false;
        this.voiceReadinessTimer = null;
        this.voiceWaitExpired = false;
        this.preferredKoVoiceKey = '';
        this.preferredEnVoiceKey = '';
        this.needsSpeechWarmup = true;
        this.speechWarmupInProgress = false;
        this.speechAfterWarmup = null;
        this.speechWarmupFallbackTimer = null;
        this.speechWarmupFallbackMs = 1200;
        this.initialAutomaticSpeech = null;
        this.initialAutomaticSpeechTimer = null;
        this.initialAutomaticDelayMs = 0;
        this.settings = this.getDefaultPlaybackSettings();

        this.settingsModal = document.getElementById('settingsModal');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.closeModalBtn = document.querySelector('.close-modal');
        this.saveSettingsBtn = document.getElementById('saveSettingsBtn');
        this.testVoiceBtn = document.getElementById('testVoiceBtn');
        this.koVoiceSelect = document.getElementById('koVoiceSelect');
        this.enVoiceSelect = document.getElementById('enVoiceSelect');
        this.autoQuestionCheckbox = document.getElementById('autoQuestionTts');
        this.autoAnswerCheckbox = document.getElementById('autoAnswerTts');
        this.koRateRange = document.getElementById('koRateRange');
        this.enRateRange = document.getElementById('enRateRange');
        this.koRateValue = document.getElementById('koRateValue');
        this.enRateValue = document.getElementById('enRateValue');

        this.init();
    }

    init() {
        if (!this.isSupported) {
            this.renderUnsupportedState();
            this.initEventListeners();
            return;
        }

        this.bindVoiceLoading();
        this.populateVoiceList();
        this.loadSettings();
        this.scheduleVoiceReadinessFallback();
        this.initEventListeners();
    }

    bindVoiceLoading() {
        const handleVoicesChanged = () => {
            this.populateVoiceList();
            this.loadSettings();
            this.markVoicesReady();
        };

        if (typeof this.synth.addEventListener === 'function') {
            this.synth.addEventListener('voiceschanged', handleVoicesChanged);
        } else if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = handleVoicesChanged;
        }
    }

    scheduleVoiceReadinessFallback() {
        this.voiceReadinessTimer = setTimeout(() => this.expireVoiceWait(), 2500);
    }

    markVoicesReady() {
        this.voicesReady = true;
        this.flushPendingSpeech(false);

        if (!this.pendingSpeech) {
            this.clearVoiceReadinessTimer();
        }
    }

    expireVoiceWait() {
        this.voicesReady = true;
        this.voiceWaitExpired = true;
        this.clearVoiceReadinessTimer();
        this.flushPendingSpeech(true);
    }

    clearVoiceReadinessTimer() {
        if (!this.voiceReadinessTimer) return;

        clearTimeout(this.voiceReadinessTimer);
        this.voiceReadinessTimer = null;
    }

    initEventListeners() {
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
        [this.koRateRange, this.enRateRange].forEach(range => {
            if (range) {
                range.addEventListener('input', () => {
                    this.settings = this.readPlaybackSettingsFromControls();
                    this.updateRateLabels();
                });
            }
        });

        // 모달 외부 클릭 시 닫기
        window.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) {
                this.closeSettings();
            }
        });
    }

    renderUnsupportedState() {
        this.setEmptyOption(this.koVoiceSelect, '이 브라우저는 음성 합성을 지원하지 않습니다');
        this.setEmptyOption(this.enVoiceSelect, '이 브라우저는 음성 합성을 지원하지 않습니다');
        [this.saveSettingsBtn, this.testVoiceBtn, this.koRateRange, this.enRateRange].forEach(element => {
            if (element) element.disabled = true;
        });
    }

    populateVoiceList() {
        this.voices = this.synth.getVoices();

        if (this.voices.length === 0) {
            this.setEmptyOption(this.koVoiceSelect, '목소리를 불러오는 중입니다');
            this.setEmptyOption(this.enVoiceSelect, '목소리를 불러오는 중입니다');
            return;
        }

        this.clearSelect(this.koVoiceSelect);
        this.clearSelect(this.enVoiceSelect);

        const excludedKeywords = [
            'Bells', 'Organ', 'Cello', 'Zarvox', 'Trinoids',
            'Deranged', 'Hysterical', 'Boing', 'Bubbles',
            'Bad News', 'Good News', 'Pipe Organ', 'Whisper'
        ];

        const koVoices = this.voices
            .filter(voice => this.matchesLanguage(voice, 'ko-KR'))
            .filter(voice => !this.hasExcludedKeyword(voice, excludedKeywords))
            .sort((a, b) => this.scoreVoice(b, 'ko-KR') - this.scoreVoice(a, 'ko-KR'));

        const enVoices = this.voices
            .filter(voice => this.matchesLanguage(voice, 'en-US'))
            .filter(voice => !this.hasExcludedKeyword(voice, excludedKeywords))
            .sort((a, b) => this.scoreVoice(b, 'en-US') - this.scoreVoice(a, 'en-US'));

        this.addVoiceOptions(koVoices, this.koVoiceSelect);
        this.addVoiceOptions(enVoices, this.enVoiceSelect);
    }

    clearSelect(selectElement) {
        if (!selectElement) return;

        selectElement.innerHTML = '';
        selectElement.value = '';
        if (selectElement.options) {
            selectElement.options.length = 0;
        }
        selectElement.disabled = false;
    }

    setEmptyOption(selectElement, text) {
        if (!selectElement) return;

        this.clearSelect(selectElement);
        const option = document.createElement('option');
        option.textContent = text;
        option.value = '';
        option.disabled = true;
        option.selected = true;
        selectElement.appendChild(option);
        selectElement.disabled = true;
    }

    addVoiceOptions(voiceList, selectElement) {
        if (voiceList.length === 0) {
            this.setEmptyOption(selectElement, '사용 가능한 목소리가 없습니다');
            return;
        }

        voiceList.forEach(voice => {
            const option = document.createElement('option');
            option.textContent = `${this.formatVoiceName(voice)} (${voice.lang})`;
            option.value = this.getVoiceKey(voice);
            selectElement.appendChild(option);
        });
    }

    formatVoiceName(voice) {
        let displayName = voice.name;

        if (displayName.includes('Google')) displayName = displayName.replace('Google', 'Google Natural');
        if (displayName.includes('Microsoft')) displayName = displayName.replace('Microsoft', 'MS');

        return displayName.length > 44 ? `${displayName.substring(0, 41)}...` : displayName;
    }

    hasExcludedKeyword(voice, excludedKeywords) {
        const name = voice.name.toLowerCase();
        return excludedKeywords.some(keyword => name.includes(keyword.toLowerCase()));
    }

    normalizeLang(lang) {
        return (lang || '').replace('_', '-').toLowerCase();
    }

    matchesLanguage(voice, lang) {
        const voiceLang = this.normalizeLang(voice.lang);
        const targetLang = this.normalizeLang(lang);
        const targetLanguage = targetLang.split('-')[0];

        return voiceLang === targetLang || voiceLang.startsWith(`${targetLanguage}-`) || voiceLang === targetLanguage;
    }

    scoreVoice(voice, lang) {
        const voiceLang = this.normalizeLang(voice.lang);
        const targetLang = this.normalizeLang(lang);
        const premiumKeywords = ['natural', 'neural', 'premium', 'google', 'microsoft', 'apple', 'siri', 'jenny', 'aria', 'samantha'];
        let score = 0;

        if (voiceLang === targetLang) score += 100;
        if (voice.default) score += 5;

        const name = voice.name.toLowerCase();
        premiumKeywords.forEach((keyword, index) => {
            if (name.includes(keyword)) score += premiumKeywords.length - index;
        });

        return score;
    }

    getVoiceKey(voice) {
        return voice.voiceURI || `${voice.name} (${voice.lang})`;
    }

    findVoiceByKey(key) {
        return this.voices.find(voice => this.getVoiceKey(voice) === key);
    }

    findVoiceKeyByLegacyName(name, lang) {
        if (!name) return '';

        const voice = this.voices.find(item => item.name === name && this.matchesLanguage(item, lang))
            || this.voices.find(item => item.name === name);

        return voice ? this.getVoiceKey(voice) : '';
    }

    selectVoice(selectElement, key) {
        if (!selectElement) return;

        const options = Array.from(selectElement.options || []);
        const selectedOption = options.find(option => option.value === key && !option.disabled);
        const fallbackOption = options.find(option => !option.disabled);

        selectElement.value = selectedOption ? selectedOption.value : (fallbackOption ? fallbackOption.value : '');
    }

    /**
     * 저장된 목소리 설정을 불러옵니다.
     */
    loadSettings() {
        this.settings = this.loadPlaybackSettings();

        const savedKoVoice = getStorageItem('koVoiceURI')
            || this.findVoiceKeyByLegacyName(getStorageItem('koVoiceName'), 'ko-KR');
        const savedEnVoice = getStorageItem('enVoiceURI')
            || this.findVoiceKeyByLegacyName(getStorageItem('enVoiceName'), 'en-US');

        this.preferredKoVoiceKey = savedKoVoice || '';
        this.preferredEnVoiceKey = savedEnVoice || '';
        this.selectVoice(this.koVoiceSelect, savedKoVoice);
        this.selectVoice(this.enVoiceSelect, savedEnVoice);

        this.updateCurrentVoices();
        this.syncPlaybackControls();
    }

    /**
     * 현재 선택된 목소리를 저장하고 적용합니다.
     */
    saveSettings() {
        const selectedKo = this.koVoiceSelect.value;
        const selectedEn = this.enVoiceSelect.value;

        if (selectedKo) {
            this.preferredKoVoiceKey = selectedKo;
            setStorageItem('koVoiceURI', selectedKo);
        }
        if (selectedEn) {
            this.preferredEnVoiceKey = selectedEn;
            setStorageItem('enVoiceURI', selectedEn);
        }

        this.settings = this.readPlaybackSettingsFromControls();
        this.savePlaybackSettings();
        this.updateCurrentVoices();
        alert('설정이 저장되었습니다.');
    }

    /**
     * 현재 선택된 음성 객체를 업데이트합니다.
     */
    updateCurrentVoices() {
        this.koVoice = this.findVoiceByKey(this.koVoiceSelect.value);
        this.enVoice = this.findVoiceByKey(this.enVoiceSelect.value);
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
        if (!this.isSupported) return;

        this.synth.cancel();
        this.speak('안녕하세요, 한국어 목소리 테스트입니다.', 'ko-KR', { interrupt: false, allowFallback: true });
        this.speak('Hello, this is an English voice test.', 'en-US', { interrupt: false, allowFallback: true });
    }

    /**
     * 텍스트를 음성으로 읽습니다.
     * @param {string} text - 읽을 텍스트
     * @param {string} lang - 언어 코드 ('ko-KR' or 'en-US')
     */
    speak(text, lang = 'en-US', options = {}) {
        if (!this.isSupported || !text) return null;

        if (this.voices.length === 0) {
            this.populateVoiceList();
        }

        const shouldWaitForVoice = !this.voicesReady
            || this.voices.length === 0
            || (!this.voiceWaitExpired && !this.canUsePreferredVoice(lang));

        if (shouldWaitForVoice && !options.allowFallback) {
            this.queueSpeech(text, lang, options);
            return null;
        }

        if (options.automatic && !options.skipInitialDelay && this.needsSpeechWarmup) {
            this.queueInitialAutomaticSpeech(text, lang, options);
            return null;
        }

        if (options.automatic && !options.skipWarmup && this.needsSpeechWarmup) {
            return this.warmUpBeforeSpeech(text, lang, options);
        }

        if (options.interrupt !== false) {
            this.synth.cancel();
        }

        const utterance = this.createUtterance(text, lang);

        this.synth.speak(utterance);
        return utterance;
    }

    queueInitialAutomaticSpeech(text, lang, options) {
        this.initialAutomaticSpeech = { text, lang, options };
        if (this.initialAutomaticSpeechTimer) {
            clearTimeout(this.initialAutomaticSpeechTimer);
        }
        this.initialAutomaticSpeechTimer = setTimeout(() => this.playInitialAutomaticSpeech(), this.initialAutomaticDelayMs);
    }

    playInitialAutomaticSpeech() {
        const nextSpeech = this.initialAutomaticSpeech;
        this.initialAutomaticSpeech = null;
        this.initialAutomaticSpeechTimer = null;

        if (!nextSpeech) return;

        this.populateVoiceList();
        this.loadSettings();
        this.markVoicesReady();
        this.speak(nextSpeech.text, nextSpeech.lang, {
            ...nextSpeech.options,
            skipInitialDelay: true
        });
    }

    warmUpBeforeSpeech(text, lang, options) {
        this.speechAfterWarmup = { text, lang, options };
        if (this.speechWarmupInProgress) return null;

        this.speechWarmupInProgress = true;
        if (options.interrupt !== false) {
            this.synth.cancel();
        }

        const warmup = this.createUtterance('.', lang);
        warmup.volume = 0;
        warmup.onend = () => this.finishSpeechWarmup();
        warmup.onerror = () => this.finishSpeechWarmup();
        this.synth.speak(warmup);
        this.speechWarmupFallbackTimer = setTimeout(() => this.finishSpeechWarmup(), this.speechWarmupFallbackMs);
        return warmup;
    }

    finishSpeechWarmup() {
        if (!this.speechWarmupInProgress) return;

        this.clearSpeechWarmupFallbackTimer();
        this.speechWarmupInProgress = false;
        this.needsSpeechWarmup = false;
        const nextSpeech = this.speechAfterWarmup;
        this.speechAfterWarmup = null;

        if (nextSpeech) {
            this.speak(nextSpeech.text, nextSpeech.lang, {
                ...nextSpeech.options,
                interrupt: false,
                skipWarmup: true
            });
        }
    }

    clearSpeechWarmupFallbackTimer() {
        if (!this.speechWarmupFallbackTimer) return;

        clearTimeout(this.speechWarmupFallbackTimer);
        this.speechWarmupFallbackTimer = null;
    }

    createUtterance(text, lang) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = this.getRateForLang(lang);

        const targetVoice = this.getTargetVoice(lang);
        if (targetVoice) {
            utterance.voice = targetVoice;
        }

        return utterance;
    }

    getTargetVoice(lang) {
        if (lang === 'ko-KR' && this.koVoice) {
            return this.koVoice;
        }
        if (lang === 'en-US' && this.enVoice) {
            return this.enVoice;
        }

        return this.voices.find(voice => this.matchesLanguage(voice, lang));
    }

    queueSpeech(text, lang, options) {
        this.pendingSpeech = { text, lang, options };
    }

    flushPendingSpeech(allowFallback = false) {
        if (!this.pendingSpeech) return;
        if (this.voices.length === 0 && !allowFallback) return;
        if (!allowFallback && !this.canUsePreferredVoice(this.pendingSpeech.lang)) return;

        const { text, lang, options } = this.pendingSpeech;
        this.pendingSpeech = null;
        this.pendingSpeechTimer = null;
        this.speak(text, lang, { ...options, allowFallback: true });
    }

    canUsePreferredVoice(lang) {
        const preferredKey = this.getPreferredVoiceKey(lang);
        return !preferredKey || Boolean(this.findVoiceByKey(preferredKey));
    }

    getPreferredVoiceKey(lang) {
        return this.matchesLanguage({ lang }, 'ko-KR') ? this.preferredKoVoiceKey : this.preferredEnVoiceKey;
    }

    getDefaultPlaybackSettings() {
        return {
            autoQuestion: true,
            autoAnswer: true,
            koRate: 1.0,
            enRate: 0.9
        };
    }

    loadPlaybackSettings() {
        return {
            autoQuestion: this.getStoredBoolean('ttsAutoQuestion', true),
            autoAnswer: this.getStoredBoolean('ttsAutoAnswer', true),
            koRate: this.getStoredRate('ttsKoRate', 1.0),
            enRate: this.getStoredRate('ttsEnRate', 0.9)
        };
    }

    getStoredBoolean(key, fallback) {
        const value = getStorageItem(key);
        return value === null ? fallback : value === 'true';
    }

    getStoredRate(key, fallback) {
        const value = parseFloat(getStorageItem(key));
        if (!Number.isFinite(value)) return fallback;
        return Math.min(1.3, Math.max(0.6, value));
    }

    readPlaybackSettingsFromControls() {
        return {
            autoQuestion: this.autoQuestionCheckbox ? this.autoQuestionCheckbox.checked : this.settings.autoQuestion,
            autoAnswer: this.autoAnswerCheckbox ? this.autoAnswerCheckbox.checked : this.settings.autoAnswer,
            koRate: this.koRateRange ? parseFloat(this.koRateRange.value) : this.settings.koRate,
            enRate: this.enRateRange ? parseFloat(this.enRateRange.value) : this.settings.enRate
        };
    }

    savePlaybackSettings() {
        setStorageItem('ttsAutoQuestion', this.settings.autoQuestion);
        setStorageItem('ttsAutoAnswer', this.settings.autoAnswer);
        setStorageItem('ttsKoRate', this.settings.koRate);
        setStorageItem('ttsEnRate', this.settings.enRate);
    }

    syncPlaybackControls() {
        if (this.autoQuestionCheckbox) this.autoQuestionCheckbox.checked = this.settings.autoQuestion;
        if (this.autoAnswerCheckbox) this.autoAnswerCheckbox.checked = this.settings.autoAnswer;
        if (this.koRateRange) this.koRateRange.value = this.settings.koRate;
        if (this.enRateRange) this.enRateRange.value = this.settings.enRate;
        this.updateRateLabels();
    }

    updateRateLabels() {
        if (this.koRateValue) this.koRateValue.textContent = `${this.settings.koRate.toFixed(2)}x`;
        if (this.enRateValue) this.enRateValue.textContent = `${this.settings.enRate.toFixed(2)}x`;
    }

    getRateForLang(lang) {
        return this.matchesLanguage({ lang }, 'ko-KR') ? this.settings.koRate : this.settings.enRate;
    }

    shouldAutoSpeakQuestion() {
        return this.settings.autoQuestion;
    }

    shouldAutoSpeakAnswer() {
        return this.settings.autoAnswer;
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
        const stored = getStorageItem(this.storageKey);
        if (stored) return this.parseReviews(stored);

        const legacyStats = getStorageItem('reviewStats');
        if (this.courseId === 'conversation' && legacyStats) {
            return this.parseReviews(legacyStats);
        }

        return {};
    }

    parseReviews(value) {
        try {
            const parsed = JSON.parse(value);
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

            return Object.entries(parsed).reduce((reviews, [day, review]) => {
                reviews[day] = this.normalizeReviewEntry(review);
                return reviews;
            }, {});
        } catch (error) {
            return {};
        }
    }

    normalizeReviewEntry(review) {
        const count = Number(review && review.count);
        const lastReviewed = review && typeof review.lastReviewed === 'string' && !Number.isNaN(Date.parse(review.lastReviewed))
            ? review.lastReviewed
            : null;

        return {
            count: Number.isFinite(count) && count > 0 ? Math.floor(count) : 0,
            lastReviewed
        };
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
        setStorageItem(this.storageKey, JSON.stringify(this.reviews));
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
        this.courses = quizData.courses || {};
        this.currentCourseId = this.getInitialCourseId(quizData.defaultCourse);
        this.data = {};
        this.dayMainSentences = {};
        this.currentDayData = [];
        this.currentIndex = 0;

        this.cacheDOM();

        this.init();
    }

    getInitialCourseId(defaultCourse) {
        const courseIds = Object.keys(this.courses);
        return [getStorageItem('selectedCourseId'), defaultCourse, courseIds[0]]
            .find(courseId => this.courses[courseId]);
    }

    /**
     * DOM 요소 캐싱
     */
    cacheDOM() {
        this.daySelect = document.getElementById('daySelect');
        this.sectionLabel = document.getElementById('sectionLabel');
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
            const label = this.dayMainSentences[day] ? `${day} - ${this.dayMainSentences[day]}` : day;
            fragment.appendChild(new Option(label, day));
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
        this.data = normalizeCourseData(course.data);
        this.dayMainSentences = course.dayMainSentences || {};
        this.reviewManager.setCourse(courseId);

        if (shouldPersist) {
            setStorageItem('selectedCourseId', courseId);
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
        this.loadDay(this.daySelect.value);
    }

    createReviewCompleteBtn() {
        this.reviewCompleteBtn = document.createElement('button');
        this.reviewCompleteBtn.id = 'reviewCompleteBtn';
        this.reviewCompleteBtn.className = 'btn btn-complete';
        this.reviewCompleteBtn.textContent = '✅ Review Complete';
        this.reviewCompleteBtn.style.display = 'none';

        this.cardContent.appendChild(this.reviewCompleteBtn);

        this.reviewCompleteBtn.addEventListener('click', () => {
            this.handleReviewComplete();
        });
    }

    handleReviewComplete() {
        const currentDay = this.daySelect.value;
        this.reviewManager.incrementReview(currentDay);

        alert(`Good job! "${currentDay}" review recorded.`);

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

            if (this.ttsManager.shouldAutoSpeakAnswer()) {
                this.ttsManager.speak(this.answerText.textContent, 'en-US', { automatic: true });
            }
        });
        this.questionText.addEventListener('click', () => this.replayQuestion());
        this.answerText.addEventListener('click', () => this.replayAnswer());

        this.prevBtn.addEventListener('click', () => this.handlePrev());
        this.nextBtn.addEventListener('click', () => this.handleNext());

        this.reverseOrderCheckbox.addEventListener('change', (e) => this.handleSortChange(e, this.randomOrderCheckbox));
        this.randomOrderCheckbox.addEventListener('change', (e) => this.handleSortChange(e, this.reverseOrderCheckbox));

        this.courseButtons.forEach(button => {
            button.addEventListener('click', () => this.switchCourse(button.dataset.courseId));
        });

        if (this.statsBtn) {
            this.statsBtn.addEventListener('click', () => this.openStats());
        }
        if (this.closeStatsModalBtn) {
            this.closeStatsModalBtn.addEventListener('click', () => this.closeStats());
        }
        window.addEventListener('click', (e) => {
            if (e.target === this.statsModal) {
                this.closeStats();
            }
        });

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

        Object.keys(this.data).forEach(day => {
            const tr = document.createElement('tr');

            const reviewData = reviews[day] || { count: 0, lastReviewed: '-' };
            let lastReviewedText = '-';
            if (reviewData.lastReviewed && reviewData.lastReviewed !== '-') {
                const date = new Date(reviewData.lastReviewed);
                lastReviewedText = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }

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

        this.renderSectionLabel(currentItem.section);
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

        if (this.ttsManager.shouldAutoSpeakQuestion()) {
            this.ttsManager.speak(currentItem.q, 'ko-KR', { automatic: true });
        }
    }

    replayQuestion() {
        const text = this.questionText.textContent.trim();
        if (text) {
            this.ttsManager.speak(text, 'ko-KR');
        }
    }

    replayAnswer() {
        const text = this.answerText.textContent.trim();
        if (text) {
            this.ttsManager.speak(text, 'en-US');
        }
    }

    /**
     * 데이터가 없을 때의 빈 상태를 렌더링합니다.
     */
    renderEmptyState() {
        this.questionText.textContent = "이 날짜에 해당하는 질문이 없습니다.";
        this.answerText.textContent = "";
        this.renderSectionLabel('');
        this.showAnswerBtn.style.display = 'none';
        this.prevBtn.disabled = true;
        this.nextBtn.disabled = true;
    }

    /**
     * 현재 카드의 섹션 라벨을 표시하거나 숨깁니다.
     */
    renderSectionLabel(section) {
        if (!this.sectionLabel) {
            return;
        }

        if (section) {
            this.sectionLabel.textContent = section;
            this.sectionLabel.style.display = 'inline-flex';
            return;
        }

        this.sectionLabel.textContent = '';
        this.sectionLabel.style.display = 'none';
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
    fetch('data.json?v=8')
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
