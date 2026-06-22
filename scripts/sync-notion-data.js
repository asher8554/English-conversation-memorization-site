// Notion 원문을 data.json 기본동사 코스로 동기화하는 스크립트
const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_NOTION_PAGE_ID = '32f3d76f88748069b726d6b6d47f5afd';
const DEFAULT_NOTION_VERSION = '2022-06-28';
const DEFAULT_NOTION_FETCH_TIMEOUT_MS = 30000;
const SECTION_NAMES = ['Model Examples', 'Small talk', 'Further Studies'];

function normalizeText(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
}

function richTextToPlainText(richText) {
    if (!Array.isArray(richText)) return '';
    return normalizeText(richText.map(part => part.plain_text || part.text?.content || '').join(''));
}

function getBlockText(block) {
    if (!block || !block.type) return '';

    const value = block[block.type] || {};
    return normalizeText(
        richTextToPlainText(value.rich_text) ||
        richTextToPlainText(value.title) ||
        richTextToPlainText(value.caption)
    );
}

function getBlockChildren(block) {
    return Array.isArray(block?.children) ? block.children : [];
}

function parseDayKey(text) {
    const normalized = normalizeText(text);
    if (/Day\s*00x/i.test(normalized)) return null;

    const match = normalized.match(/\bDay\s*0*(\d{1,3})\b/i);
    if (!match) return null;

    return `Day ${String(Number(match[1])).padStart(3, '0')}`;
}

function extractDayMainSentence(text) {
    const normalized = normalizeText(text);
    return normalizeText(
        normalized
            .replace(/^.*?\bDay\s*0*\d{1,3}\b/i, '')
            .replace(/^[-:.\s]+/, '')
    );
}

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeSectionText(text) {
    return normalizeText(text)
        .replace(/\\/g, '')
        .replace(/[[\]()*_`]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

function matchSectionName(text) {
    const normalized = normalizeSectionText(text);
    return SECTION_NAMES.find(section => {
        const pattern = new RegExp(`(^|\\s)${escapeRegExp(section.toLowerCase())}(\\s|$)`, 'i');
        return pattern.test(normalized);
    }) || null;
}

function collectDayBlocks(blocks, result = [], seen = new Set()) {
    for (const block of blocks || []) {
        const text = getBlockText(block);
        const dayKey = parseDayKey(text);
        const key = block.id || `${dayKey}:${text}`;

        if (dayKey && !seen.has(key)) {
            seen.add(key);
            result.push(block);
            continue;
        }

        collectDayBlocks(getBlockChildren(block), result, seen);
    }

    return result;
}

function splitSectionGroups(dayBlock) {
    const groups = new Map(SECTION_NAMES.map(section => [section, []]));
    let currentSection = null;

    for (const child of getBlockChildren(dayBlock)) {
        const section = findSectionInBlock(child);
        if (section) {
            currentSection = section;
            if (child.type === 'column_list') {
                groups.get(section).push(child);
            } else {
                groups.get(section).push(...getBlockChildren(child));
            }
            continue;
        }

        if (currentSection) {
            groups.get(currentSection).push(child);
        }
    }

    return groups;
}

function findSectionInBlock(block) {
    const ownSection = matchSectionName(getBlockText(block));
    if (ownSection) return ownSection;

    for (const child of getBlockChildren(block)) {
        const childSection = findSectionInBlock(child);
        if (childSection) return childSection;
    }

    return null;
}

function isStructuralText(text) {
    return !text || Boolean(parseDayKey(text)) || Boolean(matchSectionName(text));
}

function collectLeafTexts(block) {
    const texts = [];
    const text = getBlockText(block);
    if (!isStructuralText(text)) {
        texts.push(text);
    }

    for (const child of getBlockChildren(block)) {
        texts.push(...collectLeafTexts(child));
    }

    return texts;
}

function extractColumnPairs(columnListBlock) {
    const columns = getBlockChildren(columnListBlock)
        .filter(child => child.type === 'column')
        .map(column => collectLeafTexts(column).filter(Boolean));

    if (columns.length < 2) return [];

    const pairCount = Math.min(columns[0].length, columns[1].length);
    const pairs = [];

    for (let index = 0; index < pairCount; index++) {
        const question = normalizeText(columns[0][index]);
        const answer = normalizeText(columns[1][index]);
        if (question && answer) {
            pairs.push([question, answer]);
        }
    }

    return pairs;
}

function extractPairsFromBlocks(blocks) {
    const columnPairs = [];

    function visit(block) {
        if (block.type === 'column_list') {
            columnPairs.push(...extractColumnPairs(block));
            return;
        }

        for (const child of getBlockChildren(block)) {
            visit(child);
        }
    }

    for (const block of blocks || []) {
        visit(block);
    }

    if (columnPairs.length > 0) return columnPairs;

    const texts = [];
    for (const block of blocks || []) {
        texts.push(...collectLeafTexts(block));
    }

    const pairs = [];
    for (let index = 0; index + 1 < texts.length; index += 2) {
        const question = normalizeText(texts[index]);
        const answer = normalizeText(texts[index + 1]);
        if (question && answer) {
            pairs.push([question, answer]);
        }
    }

    return pairs;
}

function extractSectionCards(section, blocks) {
    return extractPairsFromBlocks(blocks).map(([question, answer]) => ({
        q: question,
        a: answer,
        section
    }));
}

function compareDayKeys(left, right) {
    return Number(left.match(/\d+/)?.[0] || 0) - Number(right.match(/\d+/)?.[0] || 0);
}

function buildBasicVerbsCourseFromBlocks(blocks, existingCourse = {}) {
    const data = {};
    const dayMainSentences = {};
    const dayBlocks = collectDayBlocks(blocks);

    for (const dayBlock of dayBlocks) {
        const dayText = getBlockText(dayBlock);
        const dayKey = parseDayKey(dayText);
        if (!dayKey) continue;

        const groups = splitSectionGroups(dayBlock);
        const modelExamples = extractSectionCards('Model Examples', groups.get('Model Examples'));
        const smallTalk = extractSectionCards('Small talk', groups.get('Small talk'));
        const furtherStudies = extractSectionCards('Further Studies', groups.get('Further Studies'));
        const sectionedCards = [...modelExamples, ...smallTalk, ...furtherStudies];

        if (sectionedCards.length === 0) continue;

        data[dayKey] = [
            { q: sectionedCards[0].q, a: sectionedCards[0].a },
            ...sectionedCards
        ];
        dayMainSentences[dayKey] = extractDayMainSentence(dayText) || sectionedCards[0].a;
    }

    const sortedData = {};
    const sortedMainSentences = {};
    for (const dayKey of Object.keys(data).sort(compareDayKeys)) {
        sortedData[dayKey] = data[dayKey];
        sortedMainSentences[dayKey] = dayMainSentences[dayKey];
    }

    return {
        ...existingCourse,
        title: existingCourse.title || '기본동사',
        data: sortedData,
        dayMainSentences: sortedMainSentences,
        note: 'Notion 원문에서 생성했습니다. 빈 섹션과 Day00x 템플릿은 제외합니다.'
    };
}

function buildSyncedData(existingData, notionBlocks) {
    const nextData = JSON.parse(JSON.stringify(existingData));
    const existingCourse = nextData.courses?.['basic-verbs'] || {};
    const nextCourse = buildBasicVerbsCourseFromBlocks(notionBlocks, existingCourse);
    const dayCount = Object.keys(nextCourse.data || {}).length;

    if (dayCount === 0) {
        throw new Error('Notion 본문에서 기본동사 Day 데이터를 찾지 못했습니다. Day 토글과 섹션 컬럼 구조를 확인하세요.');
    }

    if (!nextData.courses) {
        nextData.courses = {};
    }
    nextData.courses['basic-verbs'] = nextCourse;
    return nextData;
}

function formatNotionApiError(status, body) {
    let parsed = null;
    try {
        parsed = JSON.parse(body);
    } catch (error) {
        parsed = null;
    }

    if (status === 404 && parsed?.code === 'object_not_found') {
        return [
            'Notion 페이지를 찾지 못했습니다.',
            'NOTION_PAGE_ID가 올바른지 확인하고, 해당 Notion 페이지 우상단 메뉴의 Connections에서 이 integration을 추가하세요.',
            `Notion 원문 오류: ${body}`
        ].join(' ');
    }

    if (status === 401 || status === 403) {
        return [
            'Notion 인증 또는 권한 검증에 실패했습니다.',
            'GitHub secret NOTION_TOKEN 값과 Notion integration의 페이지 접근 권한을 확인하세요.',
            `Notion 원문 오류: ${body}`
        ].join(' ');
    }

    return `Notion API 요청 실패: ${status} ${body}`;
}

function parseFetchTimeoutMs(value) {
    if (!value) return DEFAULT_NOTION_FETCH_TIMEOUT_MS;

    const timeoutMs = Number(value);
    if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
        throw new Error('NOTION_FETCH_TIMEOUT_MS는 양의 정수 밀리초여야 합니다.');
    }

    return timeoutMs;
}

async function notionGetJson(url, token, notionVersion, options = {}) {
    const fetchTimeoutMs = options.timeoutMs || DEFAULT_NOTION_FETCH_TIMEOUT_MS;
    const fetchImpl = options.fetchImpl || fetch;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), fetchTimeoutMs);
    let response;

    try {
        response = await fetchImpl(url, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Notion-Version': notionVersion
            },
            signal: controller.signal
        });
    } catch (error) {
        if (controller.signal.aborted || error.name === 'AbortError') {
            throw new Error(`Notion API 요청이 ${fetchTimeoutMs}ms 안에 끝나지 않았습니다.`);
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }

    if (!response.ok) {
        const body = await response.text();
        throw new Error(formatNotionApiError(response.status, body));
    }

    return response.json();
}

async function readBlockChildren(blockId, options) {
    const children = [];
    let startCursor = null;

    do {
        const url = new URL(`https://api.notion.com/v1/blocks/${encodeURIComponent(blockId)}/children`);
        url.searchParams.set('page_size', '100');
        if (startCursor) {
            url.searchParams.set('start_cursor', startCursor);
        }

        const page = await notionGetJson(url, options.token, options.notionVersion, {
            timeoutMs: options.fetchTimeoutMs
        });
        children.push(...page.results);
        startCursor = page.has_more ? page.next_cursor : null;
    } while (startCursor);

    for (const child of children) {
        if (child.has_children) {
            child.children = await readBlockChildren(child.id, options);
        }
    }

    return children;
}

function parseArgs(argv) {
    const args = {
        dataPath: path.resolve('data.json'),
        dryRun: false
    };

    for (let index = 0; index < argv.length; index++) {
        const arg = argv[index];
        if (arg === '--data') {
            const dataPath = argv[index + 1];
            if (!dataPath || dataPath.startsWith('--')) {
                throw new Error('--data 인자에는 파일 경로가 필요합니다.');
            }
            args.dataPath = path.resolve(dataPath);
            index++;
        } else if (arg === '--dry-run') {
            args.dryRun = true;
        } else {
            throw new Error(`알 수 없는 인자: ${arg}`);
        }
    }

    return args;
}

async function main(argv = process.argv.slice(2), env = process.env) {
    const args = parseArgs(argv);
    const token = env.NOTION_TOKEN;
    const pageId = env.NOTION_PAGE_ID || DEFAULT_NOTION_PAGE_ID;
    const notionVersion = env.NOTION_VERSION || DEFAULT_NOTION_VERSION;
    const fetchTimeoutMs = parseFetchTimeoutMs(env.NOTION_FETCH_TIMEOUT_MS);

    if (!token) {
        throw new Error('NOTION_TOKEN secret이 필요합니다.');
    }

    const existingData = JSON.parse(fs.readFileSync(args.dataPath, 'utf8'));
    const notionBlocks = await readBlockChildren(pageId, { token, notionVersion, fetchTimeoutMs });
    const nextData = buildSyncedData(existingData, notionBlocks);
    const currentJson = `${JSON.stringify(existingData, null, 2)}\n`;
    const nextJson = `${JSON.stringify(nextData, null, 2)}\n`;

    if (currentJson === nextJson) {
        console.log('Notion 동기화 결과 변경 사항이 없습니다.');
        return false;
    }

    if (args.dryRun) {
        console.log('Notion 동기화 결과 data.json 변경이 필요합니다.');
        return true;
    }

    fs.writeFileSync(args.dataPath, nextJson, 'utf8');
    console.log('Notion 동기화 결과 data.json을 갱신했습니다.');
    return true;
}

if (require.main === module) {
    main().catch(error => {
        console.error(error.message);
        process.exit(1);
    });
}

module.exports = {
    buildBasicVerbsCourseFromBlocks,
    buildSyncedData,
    collectDayBlocks,
    extractPairsFromBlocks,
    formatNotionApiError,
    getBlockText,
    notionGetJson,
    parseFetchTimeoutMs,
    parseDayKey,
    splitSectionGroups
};
