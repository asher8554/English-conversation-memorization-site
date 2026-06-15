# Basic Verbs Further Studies 013-026 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reflect the Notion-authored `Further Studies` content through Day 026 on the live basic-verbs course page.

**Architecture:** Keep the existing static `data.json` delivery model. Fetch the Notion page blocks, extract only non-empty Day 013 through Day 026 `Further Studies` Korean/English pairs, append them to the matching `basic-verbs` day arrays, and bump static asset cache versions.

**Tech Stack:** Vanilla JavaScript app, JSON data file, Node.js built-in test runner, Notion page chunk API for source extraction.

---

### Task 1: Confirm The Missing Data Boundary

**Files:**
- Read: `data.json`
- Read: Notion page `32f3d76f88748069b726d6b6d47f5afd`

- [x] **Step 1: Count local `Further Studies` days**

Run: PowerShell JSON inspection.

Expected: `data.json` has `Further Studies` only through Day 012.

- [x] **Step 2: Fetch Notion page structure**

Run: Notion fetch plus Notion page chunk inspection.

Expected: Day 013 through Day 026 blocks exist under the Notion page.

---

### Task 2: Add Failing Coverage For Day 026

**Files:**
- Modify: `tests/basic-verbs-data.test.js`

- [x] **Step 1: Add a test that Day 026 has `Further Studies` cards**

The test should fail against the current `data.json`, because Day 026 has no `Further Studies` cards.

- [x] **Step 2: Verify RED**

Run: `node --test tests/basic-verbs-data.test.js`

Expected: FAIL for missing Day 026 `Further Studies`.

---

### Task 3: Update `data.json` From Notion

**Files:**
- Modify: `data.json`
- Modify: `index.html`
- Modify: `script.js`

- [x] **Step 1: Extract Day 013 through Day 026 non-empty `Further Studies` pairs**

Use Notion page chunk plus recursive `syncRecordValues`.

- [x] **Step 2: Append extracted cards to matching `basic-verbs` days**

Each card must use shape `{ "q": "...", "a": "...", "section": "Further Studies" }`.

- [x] **Step 3: Bump cache versions**

Increase `DATA_VERSION` in `script.js` and `script.js?v=...` in `index.html`.

---

### Task 4: Verify And Ship

**Files:**
- Modify: `checklist.md`
- Modify: `context-notes.md`

- [x] **Step 1: Verify tests**

Run: `node --test`

Expected: all tests pass.

- [x] **Step 2: Verify syntax**

Run: `node --check script.js`

Expected: exit code 0.

- [x] **Step 3: Browser-check local and live after push**

Confirm Day 026 shows `Further Studies`.

- [ ] **Step 4: Commit, push, merge, and verify Pages**

Commit one logical change, push, merge to `main`, wait for Pages deployment, and verify the live page.
