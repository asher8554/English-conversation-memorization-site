// 퀴즈 Day 데이터 정규화 동작을 검증하는 Node 테스트
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const rootDir = path.resolve(__dirname, '..');
const scriptPath = path.join(rootDir, 'script.js');

function toPlainCards(cards) {
    return Array.from(cards, item => ({ q: item.q, a: item.a, section: item.section }));
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
                    children: [],
                    classList,
                    style: {},
                    addEventListener() { },
                    appendChild(child) {
                        this.children.push(child);
                    }
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
        },
        URL,
        URLSearchParams
    };

    context.globalThis = context;

    const script = fs.readFileSync(scriptPath, 'utf8');
    vm.runInNewContext(`${script}\nglobalThis.__quizHelpers = {
        normalizeCourseData,
        buildDataUrl: typeof buildDataUrl === 'function' ? buildDataUrl : undefined,
        buildRefreshUrl: typeof buildRefreshUrl === 'function' ? buildRefreshUrl : undefined,
        renderLoadFailure: typeof renderLoadFailure === 'function' ? renderLoadFailure : undefined
    };`, context);

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

    assert.deepEqual(toPlainCards(normalized['Day 001']), [
        { q: '기본 예문', a: 'Base example.', section: 'Model Examples' },
        { q: '짧은 대화', a: 'Small talk.', section: 'Small talk' },
        { q: '심화 학습', a: 'Further study.', section: 'Further Studies' }
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
        { q: '기본 예문', a: 'Base example.', section: 'Model Examples' }
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
        { q: '기존 질문', a: 'Existing answer.', section: undefined }
    ]);
});

test('data URL includes refresh cache buster when page URL has refresh token', () => {
    const { buildDataUrl } = createScriptContext();

    assert.equal(buildDataUrl('?refresh=12345'), 'data.json?v=10&refresh=12345');
});

test('refresh URL keeps the current path and adds a fresh refresh token', () => {
    const { buildRefreshUrl } = createScriptContext();

    assert.equal(
        buildRefreshUrl('https://example.com/study/?course=basic-verbs', 12345),
        'https://example.com/study/?course=basic-verbs&refresh=12345'
    );
});

test('load failure renderer writes error details as text', () => {
    const { renderLoadFailure } = createScriptContext();
    const children = [];
    const container = {
        replaceChildren(child) {
            children.length = 0;
            children.push(child);
        }
    };

    renderLoadFailure(container, new Error('<img src=x onerror=alert(1)>'));

    assert.equal(children[0].children[0].textContent, '데이터 로딩 실패');
    assert.equal(children[0].children[1].textContent, '<img src=x onerror=alert(1)>');
    assert.equal(children[0].children[2].textContent, '페이지를 새로고침 해보세요.');
});
