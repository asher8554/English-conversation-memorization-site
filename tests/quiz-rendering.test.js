// 퀴즈 카드 화면의 섹션 라벨 렌더링을 검증하는 Node 테스트
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const rootDir = path.resolve(__dirname, '..');
const scriptPath = path.join(rootDir, 'script.js');

function createElementStub(id) {
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
        addEventListener() { },
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

function createQuizContext() {
    const elements = {};
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
                    return [];
                },
                addEventListener() { },
                cancel() { },
                speak() { }
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
        elements
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
