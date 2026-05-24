// TTS 관리자와 복습 통계의 브라우저 의존 동작을 검증하는 Node 테스트.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const rootDir = path.resolve(__dirname, '..');
const scriptPath = path.join(rootDir, 'script.js');

function createClassContext({ voices = [], stored = {}, runTimersImmediately = true } = {}) {
    let currentVoices = voices;
    const elements = {};
    const storage = new Map(Object.entries(stored));
    const timers = [];
    const voiceChangeHandlers = [];
    const spoken = [];
    let cancelCount = 0;

    const localStorage = {
        getItem(key) {
            return storage.has(key) ? storage.get(key) : null;
        },
        setItem(key, value) {
            storage.set(key, String(value));
        },
        removeItem(key) {
            storage.delete(key);
        }
    };

    function createClassList() {
        return {
            add() { },
            remove() { },
            toggle() { },
            contains() {
                return false;
            }
        };
    }

    function createElementStub(id) {
        return {
            id,
            value: '',
            checked: false,
            disabled: false,
            textContent: '',
            innerHTML: '',
            style: {},
            classList: createClassList(),
            addEventListener() { },
            appendChild(child) {
                this.children = this.children || [];
                this.children.push(child);
            }
        };
    }

    function createSelectStub(id) {
        return {
            ...createElementStub(id),
            options: [],
            appendChild(option) {
                this.options.push(option);
                if (!this.value && !option.disabled) {
                    this.value = option.value;
                }
            },
            querySelector() {
                throw new Error('voice selects should not use querySelector for saved voice lookup');
            }
        };
    }

    [
        'settingsModal',
        'settingsBtn',
        'saveSettingsBtn',
        'testVoiceBtn',
        'autoQuestionTts',
        'autoAnswerTts',
        'koRateRange',
        'enRateRange',
        'koRateValue',
        'enRateValue'
    ].forEach(id => {
        elements[id] = createElementStub(id);
    });
    elements.koVoiceSelect = createSelectStub('koVoiceSelect');
    elements.enVoiceSelect = createSelectStub('enVoiceSelect');

    const speechSynthesis = {
        getVoices() {
            return currentVoices;
        },
        addEventListener(eventName, handler) {
            if (eventName === 'voiceschanged') {
                voiceChangeHandlers.push(handler);
            }
        },
        cancel() {
            cancelCount++;
        },
        speak(utterance) {
            spoken.push(utterance);
        }
    };

    class SpeechSynthesisUtterance {
        constructor(text) {
            this.text = text;
            this.lang = '';
            this.rate = 1;
            this.volume = 1;
            this.voice = null;
        }
    }

    const context = {
        console,
        localStorage,
        alert() { },
        confirm() {
            return true;
        },
        fetch() {
            throw new Error('fetch should not run in class tests');
        },
        setTimeout(callback, delay) {
            timers.push({ callback, delay });
            if (runTimersImmediately) callback();
            return timers.length;
        },
        clearTimeout() { },
        window: {
            speechSynthesis,
            addEventListener() { },
            setTimeout(callback, delay) {
                timers.push({ callback, delay });
                if (runTimersImmediately) callback();
                return timers.length;
            },
            clearTimeout() { }
        },
        document: {
            getElementById(id) {
                return elements[id] || null;
            },
            querySelector(selector) {
                if (selector === '.close-modal') {
                    return createElementStub('closeModal');
                }
                if (selector === '.container') {
                    return createElementStub('container');
                }
                return null;
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
        SpeechSynthesisUtterance
    };

    context.globalThis = context;

    const script = fs.readFileSync(scriptPath, 'utf8');
    vm.runInNewContext(`${script}\nglobalThis.__classes = { TTSManager, ReviewManager };`, context);

    return {
        TTSManager: context.__classes.TTSManager,
        ReviewManager: context.__classes.ReviewManager,
        elements,
        speechSynthesis,
        get cancelCount() {
            return cancelCount;
        },
        spoken,
        get timerDelays() {
            return timers.map(timer => timer.delay);
        },
        storage,
        setVoices(nextVoices) {
            currentVoices = nextVoices;
        },
        triggerVoicesChanged() {
            voiceChangeHandlers.forEach(handler => handler());
        },
        runTimers() {
            while (timers.length) {
                timers.shift().callback();
            }
        },
        finishLastUtterance() {
            const utterance = spoken[spoken.length - 1];
            if (utterance && typeof utterance.onend === 'function') {
                utterance.onend();
            }
        }
    };
}

test('TTS voice list excludes novelty voices and stores stable voice keys', () => {
    const { TTSManager, elements } = createClassContext({
        voices: [
            { name: 'Bells', lang: 'en-US', voiceURI: 'novelty-bells' },
            { name: 'Microsoft Jenny Natural', lang: 'en-US', voiceURI: 'ms-jenny' },
            { name: 'Google 한국어', lang: 'ko-KR', voiceURI: 'google-ko' }
        ]
    });

    new TTSManager();

    assert.deepEqual(elements.enVoiceSelect.options.map(option => option.value), ['ms-jenny']);
    assert.deepEqual(elements.koVoiceSelect.options.map(option => option.value), ['google-ko']);
});

test('TTS settings load legacy voice names without selector interpolation', () => {
    const { TTSManager, elements } = createClassContext({
        stored: {
            enVoiceName: 'Voice "Quoted"'
        },
        voices: [
            { name: 'Voice "Quoted"', lang: 'en-US', voiceURI: 'quoted-uri' },
            { name: 'Korean Voice', lang: 'ko-KR', voiceURI: 'ko-uri' }
        ]
    });

    new TTSManager();

    assert.equal(elements.enVoiceSelect.value, 'quoted-uri');
});

test('TTS test voices cancel once and queue both language samples', () => {
    const context = createClassContext({
        voices: [
            { name: 'English Natural', lang: 'en-US', voiceURI: 'en-natural' },
            { name: 'Korean Natural', lang: 'ko-KR', voiceURI: 'ko-natural' }
        ]
    });
    const manager = new context.TTSManager();

    manager.testVoices();

    assert.equal(context.cancelCount, 1);
    assert.equal(context.spoken.length, 2);
    assert.equal(context.spoken[0].lang, 'ko-KR');
    assert.equal(context.spoken[1].lang, 'en-US');
});

test('TTS applies saved per-language speaking rates', () => {
    const context = createClassContext({
        stored: {
            ttsEnRate: '0.85',
            ttsKoRate: '1.05'
        },
        voices: [
            { name: 'English Natural', lang: 'en-US', voiceURI: 'en-natural' },
            { name: 'Korean Natural', lang: 'ko-KR', voiceURI: 'ko-natural' }
        ]
    });
    const manager = new context.TTSManager();

    manager.speak('Hello.', 'en-US');
    manager.speak('안녕하세요.', 'ko-KR');

    assert.equal(context.spoken[0].rate, 0.85);
    assert.equal(context.spoken[1].rate, 1.05);
});

test('TTS does not force a mismatched language voice as fallback', () => {
    const context = createClassContext({
        voices: [
            { name: 'Korean Natural', lang: 'ko-KR', voiceURI: 'ko-natural' }
        ]
    });
    const manager = new context.TTSManager();

    manager.speak('Hello.', 'en-US');

    assert.equal(context.spoken[0].voice, null);
});

test('TTS queues the first automatic speech without a fixed startup delay', () => {
    const context = createClassContext({
        runTimersImmediately: false,
        voices: [
            { name: 'Google Korean', lang: 'ko-KR', voiceURI: 'google-ko' }
        ]
    });
    const manager = new context.TTSManager();
    context.triggerVoicesChanged();

    manager.speak('Hello.', 'ko-KR', { automatic: true });

    assert.equal(context.timerDelays.at(-1), 0);
});

test('TTS waits for voiceschanged before the first automatic speech uses a settled voice', () => {
    const context = createClassContext({
        runTimersImmediately: false,
        voices: [
            { name: 'Temporary Korean', lang: 'ko-KR', voiceURI: 'ko-temporary' }
        ]
    });
    const manager = new context.TTSManager();

    manager.speak('안녕하세요.', 'ko-KR', { automatic: true });

    assert.equal(context.spoken.length, 0);

    context.setVoices([
        { name: 'Google 한국어', lang: 'ko-KR', voiceURI: 'google-ko' }
    ]);
    context.triggerVoicesChanged();

    assert.equal(context.spoken.length, 0);

    context.runTimers();

    assert.equal(context.spoken.length, 1);
    assert.equal(context.spoken[0].volume, 0);
    assert.equal(context.spoken[0].voice.voiceURI, 'google-ko');

    context.finishLastUtterance();

    assert.equal(context.spoken.length, 2);
    assert.equal(context.spoken[1].voice.voiceURI, 'google-ko');
});

test('TTS waits for a saved voice that appears after an early voiceschanged event', () => {
    const context = createClassContext({
        runTimersImmediately: false,
        stored: {
            koVoiceURI: 'google-ko'
        },
        voices: [
            { name: 'Temporary Korean', lang: 'ko-KR', voiceURI: 'ko-temporary' }
        ]
    });
    const manager = new context.TTSManager();

    manager.speak('안녕하세요.', 'ko-KR');
    context.triggerVoicesChanged();

    assert.equal(context.spoken.length, 0);

    context.setVoices([
        { name: 'Temporary Korean', lang: 'ko-KR', voiceURI: 'ko-temporary' },
        { name: 'Google 한국어', lang: 'ko-KR', voiceURI: 'google-ko' }
    ]);
    context.triggerVoicesChanged();

    assert.equal(context.spoken.length, 1);
    assert.equal(context.spoken[0].voice.voiceURI, 'google-ko');
});

test('TTS warms up silently before the first audible automatic speech', () => {
    const context = createClassContext({
        voices: [
            { name: 'Google 한국어', lang: 'ko-KR', voiceURI: 'google-ko' }
        ]
    });
    const manager = new context.TTSManager();

    manager.speak('안녕하세요.', 'ko-KR', { automatic: true });

    assert.equal(context.spoken.length, 1);
    assert.equal(context.spoken[0].volume, 0);
    assert.equal(context.spoken[0].voice.voiceURI, 'google-ko');

    context.finishLastUtterance();

    assert.equal(context.spoken.length, 2);
    assert.equal(context.spoken[1].text, '안녕하세요.');
    assert.equal(context.spoken[1].volume, 1);
    assert.equal(context.spoken[1].voice.voiceURI, 'google-ko');
});

test('ReviewManager ignores corrupted localStorage stats instead of crashing', () => {
    const { ReviewManager } = createClassContext({
        stored: {
            'reviewStats:conversation': '{bad-json'
        }
    });

    const manager = new ReviewManager('conversation');

    assert.equal(Object.keys(manager.getAllReviews()).length, 0);
});
