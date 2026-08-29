// Notion 동기화 스크립트의 데이터 변환 규칙을 검증하는 Node 테스트
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

const {
    buildBasicVerbsCourseFromBlocks,
    buildSyncedData,
    extractPairsFromBlocks,
    formatNotionApiError,
    notionGetJson,
    isNotionFetchTimeout,
    isNotionRateLimit,
    parseFetchTimeoutMs,
    parseDayKey
} = require('../scripts/sync-notion-data');

const scriptPath = path.resolve(__dirname, '..', 'scripts', 'sync-notion-data.js');

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

function divider() {
    return {
        id: `divider-${Math.random()}`,
        type: 'divider',
        divider: {}
    };
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
    assert.equal(parseDayKey('Day001 [Have] : Do you have any pets?'), 'Day 001');
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
    assert.deepEqual(course.data['Day 001'].map(card => card.section || null), [
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

test('buildBasicVerbsCourseFromBlocks reads section labels inside Notion column lists', () => {
    const blocks = [
        heading('Day001 [Have] : Do you have any pets?', [
            columnList(
                ['[Model Examples]', '내 조카는 거북이를 키운다.'],
                ['', 'My nephew has a turtle.']
            ),
            divider(),
            columnList(
                ['[Small talk]', '프로젝트가 끝나서 좋죠?'],
                ['', 'Are you glad the project is over?']
            ),
            divider(),
            columnList(
                ['음대 대신 의대를 선택한 거 맞지?', '응, 힘든 결정이었어.'],
                ['You chose med school over music, right?', 'Yeah, it was a tough decision.']
            ),
            divider(),
            columnList(
                ['[Further Studies]', '그녀는 공포 영화보다는 영어 강의를 택할 겁니다.'],
                ['', 'She would choose an English lecture over any horror movie.']
            )
        ])
    ];

    const course = buildBasicVerbsCourseFromBlocks(blocks, { title: '기본동사' });

    assert.deepEqual(Object.keys(course.data), ['Day 001']);
    assert.deepEqual(course.data['Day 001'].map(card => card.section || null), [
        'Model Examples',
        'Small talk',
        'Small talk',
        'Small talk',
        'Further Studies'
    ]);
    assert.deepEqual(course.data['Day 001'].at(-1), {
        q: '그녀는 공포 영화보다는 영어 강의를 택할 겁니다.',
        a: 'She would choose an English lecture over any horror movie.',
        section: 'Further Studies'
    });
});

test('buildBasicVerbsCourseFromBlocks does not duplicate the first model example', () => {
    const blocks = [
        heading('Day001 [Have] : Do you have any pets?', [
            columnList(
                ['[Model Examples]', '내 조카는 거북이를 키운다.', '나는 시카고에 사는 친구들이 있다.'],
                ['', 'My nephew has a turtle.', 'I have some friends living in Chicago.']
            )
        ])
    ];

    const course = buildBasicVerbsCourseFromBlocks(blocks, { title: '기본동사' });

    assert.deepEqual(course.data['Day 001'].map(card => card.q), [
        '내 조카는 거북이를 키운다.',
        '나는 시카고에 사는 친구들이 있다.'
    ]);
    assert.deepEqual(course.data['Day 001'].map(card => card.section), [
        'Model Examples',
        'Model Examples'
    ]);
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
    assert.equal(synced.courses['basic-verbs'].data['Day 001'].length, 1);
    assert.equal(synced.courses['basic-verbs'].note, 'Notion 원문에서 생성했습니다. 빈 섹션과 Day00x 템플릿은 제외합니다.');
});

test('buildSyncedData fails before writing empty basic-verbs data', () => {
    const existing = {
        courses: {
            'basic-verbs': {
                title: '기본동사',
                data: {},
                dayMainSentences: {}
            }
        }
    };

    assert.throws(
        () => buildSyncedData(existing, []),
        /기본동사 Day 데이터를 찾지 못했습니다/
    );
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

test('formatNotionApiError omits raw Notion response details from workflow logs', () => {
    const rawError = JSON.stringify({
        code: 'validation_error',
        message: 'Could not find block with ID: private-block-id'
    });

    assert.equal(formatNotionApiError(400, rawError), 'Notion API 요청 실패: HTTP 400.');
    assert.doesNotMatch(formatNotionApiError(404, rawError), /private-block-id/);
});

test('parseFetchTimeoutMs validates configured request timeout', () => {
    assert.equal(parseFetchTimeoutMs(undefined), 30000);
    assert.equal(parseFetchTimeoutMs('1500'), 1500);
    assert.throws(
        () => parseFetchTimeoutMs('0'),
        /NOTION_FETCH_TIMEOUT_MS는 양의 정수 밀리초여야 합니다/
    );
});

test('notionGetJson fails slow requests with a clear timeout error', async () => {
    const fetchImpl = (_url, options) => new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => {
            const error = new Error('aborted');
            error.name = 'AbortError';
            reject(error);
        });
    });

    await assert.rejects(
        () => notionGetJson(
            'https://api.notion.com/v1/blocks/test/children',
            'secret-token',
            '2022-06-28',
            { fetchImpl, timeoutMs: 1 }
        ),
        /Notion API 요청이 1ms 안에 끝나지 않았습니다/
    );
});

test('isNotionFetchTimeout only matches the configured Notion timeout error', () => {
    assert.equal(isNotionFetchTimeout(new Error('Notion API 요청이 30000ms 안에 끝나지 않았습니다.')), true);
    assert.equal(isNotionFetchTimeout(new Error('Notion API 요청 실패: 401')), false);
});

test('notionGetJson respects Notion retry_after before retrying rate limits', async () => {
    let calls = 0;
    const delays = [];
    const fetchImpl = async () => {
        calls++;
        if (calls === 1) {
            return {
                ok: false,
                status: 429,
                headers: { get: name => name === 'retry-after' ? '2' : null },
                text: async () => JSON.stringify({ code: 'rate_limited' })
            };
        }
        return { ok: true, json: async () => ({ results: [] }) };
    };

    const result = await notionGetJson('https://api.notion.com/v1/blocks/test/children', 'token', '2022-06-28', {
        fetchImpl,
        sleepImpl: (resolve, milliseconds) => {
            delays.push(milliseconds);
            resolve();
        }
    });

    assert.deepEqual(result, { results: [] });
    assert.equal(calls, 2);
    assert.deepEqual(delays, [2000]);
});

test('isNotionRateLimit identifies an exhausted rate-limit response', async () => {
    await assert.rejects(
        () => notionGetJson('https://api.notion.com/v1/blocks/test/children', 'token', '2022-06-28', {
            fetchImpl: async () => ({
                ok: false,
                status: 429,
                headers: { get: () => null },
                text: async () => JSON.stringify({ code: 'rate_limited' })
            }),
            maxRateLimitRetries: 0
        }),
        error => isNotionRateLimit(error)
    );
});

test('CLI rejects --data without a file path before reading secrets', () => {
    [
        ['--data'],
        ['--data', '--dry-run']
    ].forEach(args => {
        const result = spawnSync(process.execPath, [scriptPath, ...args], {
            encoding: 'utf8',
            env: {}
        });

        assert.equal(result.status, 1);
        assert.match(result.stderr, /--data 인자에는 파일 경로가 필요합니다/);
    });
});
