// index.html의 정적 접근성 계약을 검증하는 테스트
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const rootDir = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');

function tagById(id) {
    const match = html.match(new RegExp(`<[^>]+\\bid="${id}"[^>]*>`, 'u'));
    assert.ok(match, `Expected #${id} to exist`);
    return match[0];
}

function assertAttribute(tag, name, expectedValue) {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = expectedValue === undefined
        ? new RegExp(`\\b${escapedName}="[^"]+"`, 'u')
        : new RegExp(`\\b${escapedName}="${expectedValue}"`, 'u');

    assert.match(tag, pattern);
}

test('icon-only toolbar buttons have explicit accessible names and button types', () => {
    [
        'refreshBtn',
        'statsBtn',
        'settingsBtn',
        'darkModeToggle',
        'decreaseFont',
        'increaseFont'
    ].forEach(id => {
        const tag = tagById(id);
        assertAttribute(tag, 'type', 'button');
        assertAttribute(tag, 'aria-label');
    });
});

test('course selector buttons expose their initial pressed state', () => {
    assertAttribute(tagById('conversationCourseBtn'), 'aria-pressed', 'true');
    assertAttribute(tagById('basicVerbsCourseBtn'), 'aria-pressed', 'false');
});

test('modal shells and close controls expose dialog semantics', () => {
    assertAttribute(tagById('settingsModal'), 'role', 'dialog');
    assertAttribute(tagById('settingsModal'), 'aria-modal', 'true');
    assertAttribute(tagById('settingsModal'), 'aria-hidden', 'true');
    assertAttribute(tagById('settingsModal'), 'aria-labelledby', 'settingsTitle');
    assertAttribute(tagById('settingsCloseBtn'), 'type', 'button');
    assertAttribute(tagById('settingsCloseBtn'), 'aria-label');

    assertAttribute(tagById('statsModal'), 'role', 'dialog');
    assertAttribute(tagById('statsModal'), 'aria-modal', 'true');
    assertAttribute(tagById('statsModal'), 'aria-hidden', 'true');
    assertAttribute(tagById('statsModal'), 'aria-labelledby', 'statsTitle');
    assertAttribute(tagById('statsCloseBtn'), 'type', 'button');
    assertAttribute(tagById('statsCloseBtn'), 'aria-label');
});
