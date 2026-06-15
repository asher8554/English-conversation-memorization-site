// 퀴즈 Day 데이터 정규화 동작을 검증하는 Node 테스트
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const rootDir = path.resolve(__dirname, '..');
const scriptPath = path.join(rootDir, 'script.js');

function toPlainCards(cards) {
    return Array.from(cards, item => ({ q: item.q, a: item.a }));
}

function createScriptContext() {
    const classList = {
        add() { },
        remove() { },
        toggle() { },
        contains() {
            return false;
        }
    };

    const context = {
        console,
        localStorage: {
            getItem() {
                return null;
            },
            setItem() { },
            removeItem() { }
        },
        window: {
            addEventListener() { },
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
            body: { classList },
            addEventListener() { },
            getElementById() {
                return null;
            },
            querySelector() {
                return null;
            },
            createElement() {
                return {
                    classList,
                    style: {},
                    addEventListener() { },
                    appendChild() { }
                };
            },
            createDocumentFragment() {
                return {
                    children: [],
                    appendChild(child) {
                        this.children.push(child);
                    }
                };
            }
        },
        SpeechSynthesisUtterance: class {
            constructor(text) {
                this.text = text;
            }
        },
        Option: class {
            constructor(text, value) {
                this.text = text;
                this.value = value;
            }
        }
    };

    context.globalThis = context;

    const script = fs.readFileSync(scriptPath, 'utf8');
    vm.runInNewContext(`${script}\nglobalThis.__quizHelpers = { normalizeCourseData };`, context);

    return context.__quizHelpers;
}

test('normalizes section-shaped days by appending Further Studies cards', () => {
    const { normalizeCourseData } = createScriptContext();

    const normalized = normalizeCourseData({
        'Day 001': {
            'Model Examples': [
                { q: '기본 예문', a: 'Base example.' }
            ],
            'Small talk': [
                { q: '짧은 대화', a: 'Small talk.' }
            ],
            'Further Studies': [
                { q: '심화 학습', a: 'Further study.' }
            ]
        }
    });

    assert.deepEqual(Array.from(normalized['Day 001'], item => item.q), [
        '기본 예문',
        '짧은 대화',
        '심화 학습'
    ]);
});

test('ignores blank Further Studies placeholders', () => {
    const { normalizeCourseData } = createScriptContext();

    const normalized = normalizeCourseData({
        'Day 001': {
            'Model Examples': [
                { q: '기본 예문', a: 'Base example.' }
            ],
            'Further Studies': [
                '',
                null,
                { q: '   ', a: 'Blank question.' },
                { q: '문제만 있음', a: '' }
            ]
        },
        'Day 002': {
            'Further Studies': ''
        }
    });

    assert.deepEqual(toPlainCards(normalized['Day 001']), [
        { q: '기본 예문', a: 'Base example.' }
    ]);
    assert.deepEqual(Array.from(normalized['Day 002']), []);
});

test('preserves existing array-shaped day data', () => {
    const { normalizeCourseData } = createScriptContext();

    const normalized = normalizeCourseData({
        'Day 001': [
            { q: '기존 질문', a: 'Existing answer.' }
        ]
    });

    assert.deepEqual(toPlainCards(normalized['Day 001']), [
        { q: '기존 질문', a: 'Existing answer.' }
    ]);
});
