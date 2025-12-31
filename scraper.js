const puppeteer = require('puppeteer');
const fs = require('fs');

/**
 * Notion 페이지를 스크래핑하여 원본 텍스트를 반환합니다.
 * 
 * Puppeteer를 사용하여 페이지를 열고, 스크롤링하여 Lazy Loading 콘텐츠를 로드한 뒤,
 * 토글을 확장하고 텍스트를 추출합니다.
 * 
 * @returns {Promise<string>} 페이지의 전체 텍스트 내용
 */
async function scrapeNotion() {
    console.log('브라우저 실행 중...');
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    console.log('Notion 페이지로 이동 중...');
    await page.goto('https://www.notion.so/100-2c63d76f887480e9a373d924affa523e', {
        waitUntil: 'networkidle0',
        timeout: 60000
    });

    console.log('콘텐츠 로드를 위해 스크롤 중...');
    // 모든 지연 로딩 콘텐츠가 표시되도록 하단까지 스크롤합니다.
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });

    // 최종 렌더링을 위해 잠시 대기합니다.
    await new Promise(r => setTimeout(r, 2000));

    // 이전에 있던 DOM 탐색 로직은 제거하고, 텍스트 추출 방식만 유지합니다. (간결함을 위해)
    
    console.log('모든 토글 확장 중...');
    await page.evaluate(async () => {
        const toggles = document.querySelectorAll('.notion-toggle, div[role="button"][aria-expanded="false"]');
        for (const toggle of toggles) {
            toggle.click();
            // 상세 대기 로직 대신 모든 요소를 클릭합니다 (속도를 위해)
        }
    });
    
    // 확장 대기
    await new Promise(r => setTimeout(r, 2000));

    console.log('데이터 추출 중...');
    const fullText = await page.evaluate(() => document.body.innerText);
    
    await browser.close();
    
    return fullText;
}

/**
 * Notion의 원본 텍스트 덤프를 파싱하여 구조화된 JSON 데이터로 변환합니다.
 * 
 * 텍스트를 줄 단위로 분석하여 날짜(Day)와 섹션(ModelExamples, SmallTalk)을 구분하고,
 * 한글/영어 라인을 감지하여 쌍으로 매핑합니다.
 * 
 * @param {string} text - 스크래핑된 원본 텍스트
 * @returns {Array<Object>} 구조화된 날짜별 데이터 배열
 */
function parseNotionText(text) {
    const days = [];
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    
    let currentDay = null;
    let currentSection = null; // 'ModelExamples' 또는 'SmallTalk' 섹션
    // 섹션별 라인을 모으기 위한 버퍼
    let sectionBuffer = [];

    // 버퍼에 있는 라인들을 한글/영어로 분류하여 페어링하는 함수
    const flushSectionBuffer = () => {
        if (!currentDay || !currentSection || sectionBuffer.length === 0) return;

        const koLines = [];
        const enLines = [];

        sectionBuffer.forEach(line => {
            // 언어 감지 휴리스틱
            const hangulCount = (line.match(/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/g) || []).length;
            const englishCount = (line.match(/[a-zA-Z]/g) || []).length;

            if (hangulCount === 0) {
                enLines.push(line);
            } else {
                // 한글이 있지만 영어가 압도적으로 많으면 영어로 간주 (예: 영어 문장에 한글 명사 포함)
                if (englishCount > hangulCount * 2) {
                    enLines.push(line);
                } else {
                    koLines.push(line);
                }
            }
        });

        // 1:1 매핑 (개수가 안 맞으면 최소 개수만큼만)
        const count = Math.min(koLines.length, enLines.length);
        for (let i = 0; i < count; i++) {
            currentDay[currentSection].push({
                ko: koLines[i],
                en: enLines[i]
            });
        }
        
        // 초기화
        sectionBuffer = [];
    };
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // 날짜 헤더 감지
        const dayMatch = line.match(/^Day\s*(\d+)/i);
        
        if (dayMatch) {
            // 이전 섹션/Day 정리
            flushSectionBuffer();
            if (currentDay) days.push(currentDay);
            
            // Day ID를 "Day 001" 형식으로 정규화
            const dayNum = dayMatch[1].padStart(3, '0');
            const dayId = `Day ${dayNum}`;
            
            let mainSentence = '';
            const splitContent = line.split(/[:\-|]\s+(.+)/);
            if (splitContent[1]) {
                mainSentence = splitContent[1].trim();
            }

            currentDay = {
                Day: dayId,
                MainSentence: mainSentence,
                ModelExamples: [],
                SmallTalk: []
            };
            currentSection = null;
            continue;
        }

        if (!currentDay) continue;

        // 섹션 헤더 감지
        const lowerLine = line.toLowerCase().replace(/\s/g, '');
        if (lowerLine.includes('[modelexamples]')) {
            flushSectionBuffer(); // 이전 섹션 처리
            currentSection = 'ModelExamples';
            continue;
        }
        if (lowerLine.includes('[smalltalk]')) {
            flushSectionBuffer(); // 이전 섹션 처리
            currentSection = 'SmallTalk';
            continue;
        }
        
        // 핵심 문장 추정 (섹션이 아직 없을 때 영어 문장이 나오면 Main Sentence 대체/보강 가능)
        // 하지만 위에서 이미 파싱했으므로 건너뜀
        if (currentSection === null) {
            continue;
        }
        
        // 섹션 내부 내용 -> 버퍼에 추가
        if (currentSection) {
            sectionBuffer.push(line);
        }
    }
    
    // 마지막 Day 처리
    flushSectionBuffer();
    if (currentDay) days.push(currentDay);

    // 날짜별 중복 제거
    const uniqueDays = [];
    const seenDays = new Set();
    
    for (const day of days) {
        if (!seenDays.has(day.Day)) {
            uniqueDays.push(day);
            seenDays.add(day.Day);
        }
    }
    
    // 날짜순 정렬
    uniqueDays.sort((a, b) => a.Day.localeCompare(b.Day));
    
    return uniqueDays;
}

(async () => {
    try {
        const rawText = await scrapeNotion();
        const structuredData = parseNotionText(rawText);
        
        console.log(`${structuredData.length}일치 데이터를 스크랩했습니다.`);
        
        fs.writeFileSync('data.json', JSON.stringify(structuredData, null, 2));
        console.log('data.json 업데이트 완료');
        
    } catch (error) {
        console.error('스크랩 중 오류 발생:', error);
        process.exit(1);
    }
})();
