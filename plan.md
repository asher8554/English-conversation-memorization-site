# Project Hardening Docs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the static memorization app with one evidence-backed code improvement, verify the app, run a daily security review, and produce reader-ready Word/PDF architecture documentation.

**Architecture:** Keep the existing vanilla HTML/CSS/JavaScript GitHub Pages architecture. Avoid module splitting in this pass because the tests execute `script.js` directly in a VM and prior work favored small surgical improvements over structural churn.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, `data.json`, browser `localStorage`, Web Speech API, Node built-in test runner.

---

### Task 1: Establish Baseline and Work Artifacts

**Files:**
- Modify: `plan.md`
- Modify: `checklist.md`
- Modify: `context-notes.md`

- [x] **Step 1: Record the branch and baseline commands**

Run:

```powershell
git status --short --branch
node --test
node --check script.js
```

Expected:

```text
## codex/project-hardening-docs
# pass 27
```

- [x] **Step 2: Capture success criteria**

Record these criteria in `checklist.md` and `context-notes.md`.

```text
Module structure: no broad rewrite of script.js.
Maintainability: startup failure rendering uses DOM APIs and textContent.
Dead-code cleanup: remove only code made unused by this pass.
Performance: keep existing render hot-path improvements intact.
Security: no dynamic startup error HTML interpolation.
Documentation: create Markdown, Word, and PDF reports with an architecture diagram.
```

### Task 2: Harden Startup Error Rendering

**Files:**
- Modify: `script.js`
- Modify: `tests/quiz-data-normalization.test.js`
- Modify: `index.html`

- [x] **Step 1: Add a failing test for safe load-failure rendering**

Add this helper export to the VM harness.

```javascript
renderLoadFailure: typeof renderLoadFailure === 'function' ? renderLoadFailure : undefined
```

Add this test.

```javascript
test('load failure renderer writes error details as text', () => {
    const { renderLoadFailure } = createScriptContext();
    const children = [];
    const container = {
        innerHTML: 'existing',
        appendChild(child) {
            children.push(child);
        }
    };

    renderLoadFailure(container, new Error('<img src=x onerror=alert(1)>'));

    assert.equal(container.innerHTML, 'existing');
    assert.equal(children[0].children[0].textContent, '데이터 로딩 실패');
    assert.equal(children[0].children[1].textContent, '<img src=x onerror=alert(1)>');
});
```

Run:

```powershell
node --test tests/quiz-data-normalization.test.js
```

Expected before implementation: FAIL because `renderLoadFailure` is not exported.

- [x] **Step 2: Implement the minimal renderer**

Add this function near the DOM helper functions in `script.js`.

```javascript
function renderLoadFailure(container, error) {
    if (!container) return;

    const wrapper = document.createElement('div');
    wrapper.style.textAlign = 'center';
    wrapper.style.padding = '2rem';

    const title = document.createElement('h3');
    title.textContent = '데이터 로딩 실패';

    const detail = document.createElement('p');
    detail.style.color = 'red';
    detail.style.fontWeight = 'bold';
    detail.textContent = error.message;

    const hint = document.createElement('p');
    hint.textContent = '페이지를 새로고침 해보세요.';

    wrapper.appendChild(title);
    wrapper.appendChild(detail);
    wrapper.appendChild(hint);
    replaceElementChildren(container, wrapper);
}
```

Replace the fetch `.catch()` container `innerHTML` block with this call.

```javascript
renderLoadFailure(document.querySelector('.container'), error);
```

- [x] **Step 3: Bump the script cache key**

Change `index.html` from:

```html
<script src="script.js?v=21"></script>
```

to:

```html
<script src="script.js?v=22"></script>
```

Leave `DATA_VERSION` unchanged because `data.json` is not changing.

### Task 3: Verify Hardening

**Files:**
- Test: `tests/quiz-data-normalization.test.js`
- Test: `tests/quiz-rendering.test.js`
- Test: `tests/tts-manager.test.js`
- Test: `tests/basic-verbs-data.test.js`

- [x] **Step 1: Run focused test**

Run:

```powershell
node --test tests/quiz-data-normalization.test.js
```

Expected: PASS.

- [x] **Step 2: Run full verification**

Run:

```powershell
node --test
node --check script.js
git diff --check
```

Expected: all commands exit 0.

### Task 4: Security Review and Documentation

**Files:**
- Create: `docs/project-hardening-report.md`
- Create: `docs/project-hardening-report.docx`
- Create: `docs/project-hardening-report.pdf`
- Modify: `checklist.md`
- Modify: `context-notes.md`

- [x] **Step 1: Run daily security review**

Review:

```text
Static attack surface: index.html, script.js, style.css, data.json.
Supply chain: no runtime package manifest or third-party dependencies.
CI/CD: check for .github workflows.
Secrets: scan tracked source for common secret patterns.
Client storage: review localStorage usage for executable rendering paths.
```

Expected report status: fixed, verified safe, accepted risk, or needs human review for every candidate.

- [x] **Step 2: Create final documentation**

The final report must include:

```text
Project purpose
Module map
Build, run, and test commands
Key user flows
Security posture
Performance notes
Remaining risks
Mermaid architecture diagram
```

- [x] **Step 3: Generate Word and PDF files**

Create `docs/project-hardening-report.docx` and `docs/project-hardening-report.pdf` from the final Markdown content.

- [x] **Step 4: Commit the logical change**

Run:

```powershell
git status --short
git add plan.md checklist.md context-notes.md script.js index.html tests/quiz-data-normalization.test.js docs/project-hardening-report.md docs/project-hardening-report.docx docs/project-hardening-report.pdf
git commit -m "chore: harden startup error rendering and document architecture"
```
