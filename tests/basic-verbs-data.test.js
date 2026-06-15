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

test('basic-verbs includes populated Further Studies cards with section labels', () => {
    const course = loadBasicVerbsCourse();
    const furtherStudies = course.data['Day 001'].filter(card => card.section === 'Further Studies');

    assert.equal(furtherStudies.length, 4);
    assert.deepEqual(furtherStudies.at(0), {
        q: '그녀는 공포 영화보다는 영어 강의를 택할 겁니다.',
        a: 'She would choose an English lecture over any horror movie.',
        section: 'Further Studies'
    });
});

test('basic-verbs skips blank Further Studies placeholders', () => {
    const course = loadBasicVerbsCourse();

    assert.equal(course.data['Day 013'].some(card => card.section === 'Further Studies'), false);
    assert.equal(course.data['Day 013'].some(card => !card.q || !card.a), false);
});
