# Project Stability Maintenance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve runtime stability and maintainability for the static memorization site without changing the current user-facing learning flow.

**Architecture:** Keep the single-page static app and existing class structure. Add small defensive helpers and targeted tests around the two highest-value stability gaps: Web Speech warmup completion and browser storage availability.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, Web Speech API, `node:test`.

---

### Task 1: TTS Warmup Fallback.

**Files:**
- Modify: `tests/tts-manager.test.js`
- Modify: `script.js`

- [ ] **Step 1: Write a failing test for missing warmup end events.**

Add a test that starts automatic Korean speech, runs only the initial automatic queue timer, verifies the silent warmup utterance was spoken, then runs the warmup fallback timer without firing `onend`. Expected failure before implementation: actual speech never starts.

- [ ] **Step 2: Implement a fallback timer.**

Add `speechWarmupFallbackTimer` and `speechWarmupFallbackMs` to `TTSManager`. In `warmUpBeforeSpeech`, start a fallback timer after speaking the silent utterance. In `finishSpeechWarmup`, clear that timer and continue to the actual utterance once.

- [ ] **Step 3: Verify TTS tests.**

Run `node --test tests/tts-manager.test.js`. Expected: all tests pass.

### Task 2: Safe Local Storage Access.

**Files:**
- Modify: `tests/tts-manager.test.js`
- Modify: `script.js`

- [ ] **Step 1: Write failing tests for unavailable storage.**

Add tests where `localStorage.getItem` and `localStorage.setItem` throw. Verify `TTSManager`, `ReviewManager`, `DarkModeManager`, and `FontSizeManager` initialize or save without throwing.

- [ ] **Step 2: Add storage helpers.**

Add small `getStorageItem` and `setStorageItem` helpers that catch storage exceptions. Replace direct `localStorage.getItem` and `localStorage.setItem` calls in app code with those helpers.

- [ ] **Step 3: Verify all static checks.**

Run `node --test tests/tts-manager.test.js`, `node --check script.js`, the `data.json` validation command, and `git diff --check`.

### Task 3: Review And Ship.

**Files:**
- Modify: `checklist.md`
- Modify: `context-notes.md`

- [ ] **Step 1: Record the maintenance decisions.**

Append the completed review and implementation notes to the existing work log files.

- [ ] **Step 2: Commit and push.**

Commit the stability changes in one logical commit and push `main`.
