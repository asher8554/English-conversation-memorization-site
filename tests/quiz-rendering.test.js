// 퀴즈 카드 화면의 섹션 라벨 렌더링을 검증하는 Node 테스트
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const rootDir = path.resolve(__dirname, '..');
const scriptPath = path.join(rootDir, 'script.js');

function createElementStub(id) {
    const listeners = {};

    return {
        id,
        value: '',
        checked: false,
        disabled: false,
        textContent: '',
        innerHTML: '',
        style: {},
        options: [],
        selectedIndex: 0,
        dataset: {},
        classList: {
            add() { },
            remove() { },
            toggle() { },
            contains() {
                return false;
            }
        },
        addEventListener(eventName, handler) {
            listeners[eventName] = listeners[eventName] || [];
            listeners[eventName].push(handler);
        },
        dispatchEvent(event) {
            (listeners[event.type] || []).forEach(handler => handler(event));
        },
        click() {
            this.dispatchEvent({ type: 'click', target: this });
        },
        setAttribute(name, value) {
            this[name] = value;
        },
        appendChild(child) {
            if (child?.children) {
                child.children.forEach(grandChild => this.appendChild(grandChild));
                return;
            }
            this.children = this.children || [];
            this.children.push(child);
            if (child?.value !== undefined) {
                this.options.push(child);
                if (!this.value) this.value = child.value;
                this.selectedIndex = this.options.findIndex(option => option.value === this.value);
            }
        },
        add(option) {
            this.appendChild(option);
        }
    };
}

function createQuizContext({ voices = [], throwOnOffsetWidth = false } = {}) {
    const elements = {};
    const spoken = [];
    [
        'daySelect',
        'sectionLabel',
        'questionText',
        'answerText',
        'showAnswerBtn',
        'prevBtn',
        'nextBtn',
        'cardContent',
        'reverseOrder',
        'randomOrder',
        'courseMeta',
        'statsBtn',
        'statsModal',
        'totalReviews',
        'statsTableBody',
        'resetStatsBtn',
        'settingsModal',
        'settingsBtn',
        'saveSettingsBtn',
        'testVoiceBtn',
        'autoQuestionTts',
        'autoAnswerTts',
        'koVoiceSelect',
        'enVoiceSelect',
        'koRateRange',
        'enRateRange',
        'koRateValue',
        'enRateValue',
        'darkModeToggle'
    ].forEach(id => {
        elements[id] = createElementStub(id);
    });

    const courseButton = createElementStub('basicCourseButton');
    courseButton.dataset.courseId = 'basic-verbs';

    if (throwOnOffsetWidth) {
        Object.defineProperty(elements.cardContent, 'offsetWidth', {
            get() {
                throw new Error('forced layout read');
            }
        });
    }

    const context = {
        console,
        localStorage: {
            getItem() {
                return null;
            },
            setItem() { },
            removeItem() { }
        },
        alert() { },
        confirm() {
            return true;
        },
        setTimeout(callback) {
            callback();
            return 1;
        },
        clearTimeout() { },
        window: {
            addEventListener() { },
            setTimeout(callback) {
                callback();
                return 1;
            },
            clearTimeout() { },
            speechSynthesis: {
                getVoices() {
                    return voices;
                },
                addEventListener() { },
                cancel() { },
                speak(utterance) {
                    spoken.push(utterance);
                }
            }
        },
        document: {
            body: {
                classList: createElementStub('body').classList
            },
            getElementById(id) {
                return elements[id] || null;
            },
            querySelector(selector) {
                if (selector === '.close-modal' || selector === '.close-stats-modal' || selector === '.container') {
                    return createElementStub(selector);
                }
                return null;
            },
            querySelectorAll(selector) {
                return selector === '.course-btn' ? [courseButton] : [];
            },
            createElement(tagName) {
                return createElementStub(tagName);
            },
            createDocumentFragment() {
                return {
                    children: [],
                    appendChild(child) {
                        this.children.push(child);
                    }
                };
            },
            addEventListener() { }
        },
        SpeechSynthesisUtterance: class {
            constructor(text) {
                this.text = text;
            }
        },
        Option: class {
            constructor(text, value) {
                this.text = text;
                this.textContent = text;
                this.value = value;
            }
        }
    };

    context.globalThis = context;

    const script = fs.readFileSync(scriptPath, 'utf8');
    vm.runInNewContext(`${script}\nglobalThis.__classes = { QuizApp };`, context);

    return {
        QuizApp: context.__classes.QuizApp,
        elements,
        spoken
    };
}

test('QuizApp renders the current card section label', () => {
    const { QuizApp, elements } = createQuizContext();

    new QuizApp({
        defaultCourse: 'basic-verbs',
        courses: {
            'basic-verbs': {
                title: '기본동사',
                data: {
                    'Day 001': [
                        {
                            q: '심화 학습',
                            a: 'Further study.',
                            section: 'Further Studies'
                        }
                    ]
                }
            }
        }
    });

    assert.equal(elements.sectionLabel.textContent, 'Further Studies');
    assert.equal(elements.sectionLabel.style.display, 'inline-flex');
});

test('QuizApp updates cards without reading layout synchronously', () => {
    const { QuizApp, elements } = createQuizContext({ throwOnOffsetWidth: true });

    new QuizApp({
        defaultCourse: 'basic-verbs',
        courses: {
            'basic-verbs': {
                title: 'Basic Verbs',
                data: {
                    'Day 001': [
                        { q: '첫 질문', a: 'First answer.' },
                        { q: '두 번째 질문', a: 'Second answer.' }
                    ]
                }
            }
        }
    });

    elements.nextBtn.click();

    assert.equal(elements.questionText.textContent, '두 번째 질문');
});

test('QuizApp replays the Korean question when the question text is clicked', () => {
    const { QuizApp, elements, spoken } = createQuizContext({
        voices: [
            { name: 'Korean Natural', lang: 'ko-KR', voiceURI: 'ko-natural' },
            { name: 'English Natural', lang: 'en-US', voiceURI: 'en-natural' }
        ]
    });

    new QuizApp({
        defaultCourse: 'basic-verbs',
        courses: {
            'basic-verbs': {
                title: 'Basic Verbs',
                data: {
                    'Day 001': [
                        {
                            q: '안녕하세요.',
                            a: 'Hello.'
                        }
                    ]
                }
            }
        }
    });

    spoken.length = 0;
    elements.questionText.click();

    assert.equal(spoken.length, 1);
    assert.equal(spoken[0].text, '안녕하세요.');
    assert.equal(spoken[0].lang, 'ko-KR');
});

test('QuizApp replays the English answer when the answer text is clicked', () => {
    const { QuizApp, elements, spoken } = createQuizContext({
        voices: [
            { name: 'Korean Natural', lang: 'ko-KR', voiceURI: 'ko-natural' },
            { name: 'English Natural', lang: 'en-US', voiceURI: 'en-natural' }
        ]
    });

    new QuizApp({
        defaultCourse: 'basic-verbs',
        courses: {
            'basic-verbs': {
                title: 'Basic Verbs',
                data: {
                    'Day 001': [
                        {
                            q: '안녕하세요.',
                            a: 'Hello.'
                        }
                    ]
                }
            }
        }
    });

    elements.showAnswerBtn.click();
    spoken.length = 0;
    elements.answerText.click();

    assert.equal(spoken.length, 1);
    assert.equal(spoken[0].text, 'Hello.');
    assert.equal(spoken[0].lang, 'en-US');
});
