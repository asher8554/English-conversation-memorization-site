// 백업이 학습 키만 포함하고 브라우저 원본을 바꾸지 않는지 검사한다.
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildStudyBackup } = require('../backup.js');

test('backup exports only study data and preserves all original values', () => {
    const values = new Map([
        ['reviewStats:conversation', JSON.stringify({ 'Day 001': { count: 3, lastReviewed: '2026-10-22T02:00:00Z' } })],
        ['lastCompletedChapter', JSON.stringify({ courseId: 'conversation', day: 'Day 001' })],
        ['ttsEnRate', '0.9'], ['NOTION_TOKEN', 'never-export'], ['other-app', 'private']
    ]);
    const before = [...values];
    const backup = buildStudyBackup({ getItem: key => values.get(key) ?? null }, new Date('2026-10-22T02:00:00Z'));
    assert.equal(backup.format, 'english-study-backup');
    assert.equal(backup.version, 1);
    assert.deepEqual(Object.keys(backup.values), ['reviewStats:conversation', 'lastCompletedChapter', 'ttsEnRate']);
    assert.equal(JSON.parse(JSON.stringify(backup)).values['reviewStats:conversation'], values.get('reviewStats:conversation'));
    assert.deepEqual([...values], before);
});

test('backup reports unavailable storage and an empty backup without pretending success', () => {
    assert.throws(() => buildStudyBackup({ getItem: () => { throw new Error('blocked'); } }), /blocked/);
    assert.throws(() => buildStudyBackup({ getItem: () => null }), /없습니다/);
});
