// Notion 동기화 스크립트의 데이터 변환 규칙을 검증하는 Node 테스트
const assert = require('node:assert/strict');
const test = require('node:test');

const {
    buildBasicVerbsCourseFromBlocks,
    buildSyncedData,
    extractPairsFromBlocks,
    formatNotionApiError,
    parseDayKey
} = require('../scripts/sync-notion-data');

function textBlock(type, text, children = []) {
    return {
        id: `${type}-${text}`,
        type,
        has_children: children.length > 0,
        [type]: {
            rich_text: [{ plain_text: text }]
        },
        children
    };
}

function paragraph(text) {
    return textBlock('paragraph', text);
}

function heading(text, children = []) {
    return textBlock('heading_2', text, children);
}

function column(children) {
    return {
        id: `column-${children.length}-${Math.random()}`,
        type: 'column',
        has_children: children.length > 0,
        column: {},
        children
    };
}

function columnList(leftTexts, rightTexts) {
    return {
        id: `column-list-${leftTexts.length}-${rightTexts.length}`,
        type: 'column_list',
        has_children: true,
        column_list: {},
        children: [
            column(leftTexts.map(paragraph)),
            column(rightTexts.map(paragraph))
        ]
    };
}

test('parseDayKey normalizes real days and skips templates', () => {
    assert.equal(parseDayKey('Day 1 [Have] Do you have any pets?'), 'Day 001');
    assert.equal(parseDayKey('Day 026 [Make] They made it to the finals.'), 'Day 026');
    assert.equal(parseDayKey('Day00x 템플릿'), null);
});

test('extractPairsFromBlocks zips Notion column list children', () => {
    const pairs = extractPairsFromBlocks([
        columnList(
            ['첫 질문', '둘째 질문', ''],
            ['First answer.', 'Second answer.', 'Ignored answer.']
        )
    ]);

    assert.deepEqual(pairs, [
        ['첫 질문', 'First answer.'],
        ['둘째 질문', 'Second answer.']
    ]);
});

test('buildBasicVerbsCourseFromBlocks creates ordered sectioned cards and skips Day00x', () => {
    const blocks = [
        heading('Day 001 [Have] Do you have any pets?', [
            paragraph('Model Examples'),
            columnList(
                ['반려동물 있어?', '간식을 먹어서 별로 배고프지 않아.'],
                ['Do you have any pets?', 'I just had a snack, so I’m not that hungry.']
            ),
            paragraph('Small talk'),
            columnList(
                ['집에 강아지 있어?', '응, 한 마리 있어.'],
                ['Do you have a dog at home?', 'Yes, I have one.']
            ),
            paragraph('Further Studies'),
            columnList(
                ['그녀는 영어 강의를 택할 겁니다.', ''],
                ['She would choose an English lecture.', 'Blank should be skipped.']
            )
        ]),
        heading('Day00x 템플릿', [
            paragraph('Model Examples'),
            columnList(['빈 템플릿'], ['Empty template.'])
        ]),
        heading('Day 002 [Get] My boyfriend got a ticket.', [
            paragraph('Model Examples'),
            columnList(['남자친구가 표를 구했어.'], ['My boyfriend got a ticket.'])
        ])
    ];

    const course = buildBasicVerbsCourseFromBlocks(blocks, { title: '기본동사' });

    assert.deepEqual(Object.keys(course.data), ['Day 001', 'Day 002']);
    assert.equal(course.dayMainSentences['Day 001'], '[Have] Do you have any pets?');
    assert.equal(course.data['Day 001'][0].section, undefined);
    assert.deepEqual(course.data['Day 001'].map(card => card.section || null), [
        null,
        'Model Examples',
        'Model Examples',
        'Small talk',
        'Small talk',
        'Further Studies'
    ]);
    assert.deepEqual(course.data['Day 001'].at(-1), {
        q: '그녀는 영어 강의를 택할 겁니다.',
        a: 'She would choose an English lecture.',
        section: 'Further Studies'
    });
});

test('buildSyncedData replaces only basic-verbs course', () => {
    const existing = {
        defaultCourse: 'conversation',
        courses: {
            conversation: {
                title: '영어회화',
                data: { 'Day 001': [{ q: '기존', a: 'Existing.' }] }
            },
            'basic-verbs': {
                title: '기본동사',
                data: {},
                dayMainSentences: {}
            }
        }
    };
    const blocks = [
        heading('Day 001 [Have] Do you have any pets?', [
            paragraph('Model Examples'),
            columnList(['반려동물 있어?'], ['Do you have any pets?'])
        ])
    ];

    const synced = buildSyncedData(existing, blocks);

    assert.deepEqual(synced.courses.conversation, existing.courses.conversation);
    assert.equal(synced.courses['basic-verbs'].data['Day 001'].length, 2);
    assert.equal(synced.courses['basic-verbs'].note, 'Notion 원문에서 생성했습니다. 빈 섹션과 Day00x 템플릿은 제외합니다.');
});

test('formatNotionApiError explains missing page connection', () => {
    const message = formatNotionApiError(404, JSON.stringify({
        object: 'error',
        status: 404,
        code: 'object_not_found',
        message: 'Could not find block with ID: page-id. Make sure the relevant pages and databases are shared with your integration "asher".'
    }));

    assert.match(message, /Notion 페이지를 찾지 못했습니다/);
    assert.match(message, /Connections/);
    assert.match(message, /integration/);
});
