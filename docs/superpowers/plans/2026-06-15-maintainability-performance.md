# Maintainability Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the existing memorization app's maintainability and runtime behavior without changing the static GitHub Pages architecture.

**Architecture:** Keep the app as a build-free vanilla JavaScript site, because the current deployment and tests execute `script.js` directly. Make focused improvements inside the existing boundaries by extracting small DOM helpers, caching normalized course data, removing duplicate render work, avoiding forced layout reads, and making TTS voice lookup less repetitive.

**Tech Stack:** HTML, CSS, vanilla JavaScript, Node.js built-in test runner.

---

### Task 1: Add A Regression Test For Forced Layout Reads

**Files:**
- Modify: `tests/quiz-rendering.test.js`

- [x] **Step 1: Add a `throwOnOffsetWidth` option to `createQuizContext`**

Update `createQuizContext` so tests can make `cardContent.offsetWidth` throw. This exposes the current forced reflow in `QuizApp.updateCard`.

```js
function createQuizContext({ voices = [], throwOnOffsetWidth = false } = {}) {
    // existing setup
    if (throwOnOffsetWidth) {
        Object.defineProperty(elements.cardContent, 'offsetWidth', {
            get() {
                throw new Error('forced layout read');
            }
        });
    }
}
```

- [x] **Step 2: Add the failing behavior test**

```js
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
```

- [x] **Step 3: Run the focused test and verify RED**

Run: `node --test tests/quiz-rendering.test.js`

Expected: FAIL with `forced layout read`.

---

### Task 2: Add Small Rendering And TTS Constants

**Files:**
- Modify: `script.js`

- [x] **Step 1: Add focused helpers near the top of `script.js`**

```js
const TTS_EXCLUDED_KEYWORDS = [
    'bells', 'organ', 'cello', 'zarvox', 'trinoids',
    'deranged', 'hysterical', 'boing', 'bubbles',
    'bad news', 'good news', 'pipe organ', 'whisper'
];

const TTS_PREMIUM_KEYWORDS = ['natural', 'neural', 'premium', 'google', 'microsoft', 'apple', 'siri', 'jenny', 'aria', 'samantha'];

function replaceElementChildren(element, ...children) {
    if (!element) return;
    if (typeof element.replaceChildren === 'function') {
        element.replaceChildren(...children);
        return;
    }

    element.innerHTML = '';
    if (element.options) {
        element.options.length = 0;
    }
    children.forEach(child => element.appendChild(child));
}

function restartElementAnimation(element, className) {
    element.classList.remove(className);
    const schedule = window.requestAnimationFrame || window.setTimeout || setTimeout;
    schedule(() => element.classList.add(className));
}
```

- [x] **Step 2: Replace the forced `offsetWidth` read**

Change `QuizApp.updateCard` from direct class removal plus `offsetWidth` to `restartElementAnimation(this.cardContent, 'fade-in')`.

- [x] **Step 3: Run the focused test and verify GREEN**

Run: `node --test tests/quiz-rendering.test.js`

Expected: PASS.

---

### Task 3: Optimize TTS Voice Lookup

**Files:**
- Modify: `script.js`
- Test: `tests/tts-manager.test.js`

- [x] **Step 1: Add a voice lookup cache**

Initialize `this.voiceByKey = new Map()` in `TTSManager.constructor`.

- [x] **Step 2: Rebuild the cache inside `populateVoiceList`**

After `this.voices = this.synth.getVoices();`, set:

```js
this.voiceByKey = new Map(this.voices.map(voice => [this.getVoiceKey(voice), voice]));
```

- [x] **Step 3: Use constants and the lookup cache**

Replace per-call keyword arrays with `TTS_EXCLUDED_KEYWORDS` and `TTS_PREMIUM_KEYWORDS`. Replace `findVoiceByKey` linear scan with `this.voiceByKey.get(key)`.

- [x] **Step 4: Verify TTS behavior**

Run: `node --test tests/tts-manager.test.js`

Expected: PASS.

---

### Task 4: Remove Duplicate Render Work And Safer DOM Updates

**Files:**
- Modify: `script.js`
- Test: `tests/quiz-rendering.test.js`

- [x] **Step 1: Cache normalized course data**

Add `this.normalizedCourseData = {};` in `QuizApp.constructor`. In `switchCourse`, normalize only once per course.

```js
if (!this.normalizedCourseData[courseId]) {
    this.normalizedCourseData[courseId] = normalizeCourseData(course.data);
}
this.data = this.normalizedCourseData[courseId];
```

- [x] **Step 2: Use `replaceElementChildren` for dropdown and voice select updates**

Replace direct `innerHTML = ''` reset patterns in `populateDaySelect`, `clearSelect`, and `sortOptions`.

- [x] **Step 3: Stop double-rendering after sort changes**

Remove the unconditional `this.updateCard()` call from `handleSortChange`. Let `sortOptions` load the new day or update navigation state once.

- [x] **Step 4: Build stats rows with text nodes instead of row `innerHTML`**

Use `document.createElement('td')` and `textContent` for day, count, and last-reviewed values.

- [x] **Step 5: Run focused rendering tests**

Run: `node --test tests/quiz-rendering.test.js`

Expected: PASS.

---

### Task 5: Verify And Commit

**Files:**
- Modify: `checklist.md`
- Modify: `context-notes.md`

- [x] **Step 1: Run the full test suite**

Run: `node --test`

Expected: 24 passing tests, 0 failures.

- [x] **Step 2: Run syntax validation**

Run: `node --check script.js`

Expected: exit code 0.

- [x] **Step 3: Review diff**

Run: `git diff -- script.js tests/quiz-rendering.test.js checklist.md context-notes.md docs/superpowers/plans/2026-06-15-maintainability-performance.md`

Expected: only targeted maintainability and performance changes.

- [x] **Step 4: Commit one logical change**

```bash
git add script.js tests/quiz-rendering.test.js checklist.md context-notes.md docs/superpowers/plans/2026-06-15-maintainability-performance.md
git commit -m "refactor: optimize quiz rendering and TTS lookup"
```
