// 기본동사 코스 데이터의 Day 범위와 템플릿 제외를 검증하는 Node 테스트
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const rootDir = path.resolve(__dirname, '..');
const dataPath = path.join(rootDir, 'data.json');

function loadBasicVerbsCourse() {
    const quizData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    return quizData.courses['basic-verbs'];
}

test('basic-verbs includes populated Day 026 through Day 035 data', () => {
    const course = loadBasicVerbsCourse();
    const days = Object.keys(course.data);

    assert.equal(days.at(-1), 'Day 035');

    for (let dayNumber = 26; dayNumber <= 35; dayNumber++) {
        const day = `Day ${String(dayNumber).padStart(3, '0')}`;
        assert.ok(Array.isArray(course.data[day]), `${day} should be an array`);
        assert.ok(course.data[day].length > 0, `${day} should have cards`);
        assert.ok(course.dayMainSentences[day], `${day} should have a main sentence`);
    }
});

test('basic-verbs excludes empty Day00x templates', () => {
    const course = loadBasicVerbsCourse();

    assert.equal(Object.keys(course.data).some(day => /Day00x/i.test(day)), false);
    assert.equal(Object.keys(course.dayMainSentences).some(day => /Day00x/i.test(day)), false);
});
