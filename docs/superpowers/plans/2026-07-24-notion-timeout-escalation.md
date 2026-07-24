# Notion Timeout Escalation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable detailed logging and one retry only after two consecutive Notion API timeout failures.

**Architecture:** A small Node helper classifies the exact timeout message and emits request timing when diagnostic mode is enabled. The GitHub workflow persists only the consecutive-timeout count through an Actions cache, selects diagnostic mode from that count, and retries once only in diagnostic mode.

**Tech Stack:** Node.js 24, Node built-in test runner, GitHub Actions, actions/cache.

## Global Constraints

- Keep the existing 30-second per-request limit.
- Do not retry normal runs, authentication failures, parsing failures, or test failures.
- Do not add dependencies or repository-tracked runtime state.

---

### Task 1: Add timeout classification and diagnostic request timing

**Files:**
- Modify: `scripts/sync-notion-data.js`
- Modify: `tests/notion-sync.test.js`

**Interfaces:**
- Produces: `isNotionFetchTimeout(error)` returning a boolean.
- Consumes: `NOTION_SYNC_DEBUG=1` to write safe request URL and elapsed milliseconds without tokens.

- [ ] **Step 1: Write the failing test**

```js
test('isNotionFetchTimeout only matches the configured Notion timeout error', () => {
    assert.equal(isNotionFetchTimeout(new Error('Notion API 요청이 30000ms 안에 끝나지 않았습니다.')), true);
    assert.equal(isNotionFetchTimeout(new Error('Notion API 요청 실패: 401')), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/notion-sync.test.js`

Expected: FAIL because `isNotionFetchTimeout` is not exported.

- [ ] **Step 3: Write minimal implementation**

```js
function isNotionFetchTimeout(error) {
    return /^Notion API 요청이 \d+ms 안에 끝나지 않았습니다\.$/.test(error?.message || '');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/notion-sync.test.js`

Expected: PASS.

### Task 2: Persist the timeout count and conditionally retry in GitHub Actions

**Files:**
- Modify: `.github/workflows/sync-notion-data.yml`

**Interfaces:**
- Consumes: `timeout-count` restored from an Actions cache.
- Produces: a saved count of `0`, `1`, or `2` after each run.

- [ ] **Step 1: Configure cache restore and diagnostic-mode selection**

```yaml
- uses: actions/cache/restore@v4
  with:
    path: .github/notion-sync-state
    key: notion-sync-timeout-${{ github.run_id }}
    restore-keys: notion-sync-timeout-
```

- [ ] **Step 2: Run the sync step once normally, or twice with `NOTION_SYNC_DEBUG=1` after two saved timeouts**

```bash
if [ "$(cat .github/notion-sync-state/timeout-count 2>/dev/null || echo 0)" -ge 2 ]; then
  NOTION_SYNC_DEBUG=1 node scripts/sync-notion-data.js || NOTION_SYNC_DEBUG=1 node scripts/sync-notion-data.js
else
  node scripts/sync-notion-data.js
fi
```

- [ ] **Step 3: Save only timeout failures as the next count and reset all other outcomes**

Run: `npm test && npm run check`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/sync-notion-data.yml scripts/sync-notion-data.js tests/notion-sync.test.js checklist.md context-notes.md
git commit -m "fix: escalate repeated Notion timeouts"
```
