<?php

/**
 * Notion API를 사용하여 페이지 데이터를 가져오고 파싱하는 클래스입니다.
 * 
 * Notion 페이지의 텍스트 내용을 재귀적으로 수집하여
 * 학습 앱에서 사용할 수 있는 구조화된 JSON 데이터로 변환합니다.
 */
class NotionImporter
{
    private $apiKey;
    private $pageId;
    private $baseUrl = 'https://api.notion.com/v1';

    /**
     * NotionImporter 인스턴스를 생성합니다.
     *
     * @param string $apiKey Notion 통합 시크릿 키
     * @param string $pageId 데이터를 가져올 Notion 페이지 ID
     */
    public function __construct($apiKey, $pageId)
    {
        $this->apiKey = $apiKey;
        $this->pageId = $pageId;
    }

    /**
     * Notion에서 데이터를 가져와 파싱하고 파일로 저장합니다.
     *
     * @return int 파싱된 총 Day 데이터의 개수
     */
    public function import()
    {
        // 1. Notion에서 텍스트 데이터 가져오기 (재귀적)
        $rawText = $this->fetchPageContent($this->pageId);

        // 2. 텍스트 파싱
        $structuredData = $this->parseNotionText($rawText);

        // 3. 파일 저장
        file_put_contents(__DIR__ . '/data.json', json_encode($structuredData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        return count($structuredData);
    }

    /**
     * 주어진 블록 ID의 하위 콘텐츠를 재귀적으로 조회합니다.
     *
     * @param string $blockId 조회할 블록(페이지)의 ID
     * @param int $depth 재귀 깊이 (디버깅 용도)
     * @return string 추출된 모든 텍스트 콘텐츠
     */
    private function fetchPageContent($blockId, $depth = 0)
    {
        $content = "";
        $cursor = null;

        do {
            $url = $this->baseUrl . "/blocks/" . $blockId . "/children?page_size=100";
            if ($cursor) {
                $url .= "&start_cursor=" . $cursor;
            }

            $response = $this->makeRequest($url);

            if (!$response || !isset($response['results'])) {
                break;
            }

            foreach ($response['results'] as $block) {
                $type = $block['type'];

                // 텍스트 추출
                if (isset($block[$type]['rich_text']) && is_array($block[$type]['rich_text'])) {
                    $text = "";
                    foreach ($block[$type]['rich_text'] as $richText) {
                        $text .= $richText['plain_text'];
                    }
                    if ($text !== "") {
                        $content .= $text . "\n";
                    }
                } elseif ($type === 'child_page') {
                    $content .= $block['child_page']['title'] . "\n";
                }

                // 하위 블록 재귀 호출
                if ($block['has_children']) {
                    $childContent = $this->fetchPageContent($block['id'], $depth + 1);
                    $content .= $childContent;
                }
            }

            $cursor = isset($response['next_cursor']) ? $response['next_cursor'] : null;

        } while ($cursor);

        return $content;
    }

    /**
     * cURL을 사용하여 Notion API에 GET 요청을 보냅니다.
     *
     * @param string $url 요청할 URL
     * @return array|null 응답 데이터 배열 또는 실패 시 null
     */
    private function makeRequest($url)
    {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "Authorization: Bearer " . $this->apiKey,
            "Notion-Version: 2022-06-28",
            "Content-Type: application/json"
        ]);
        // SSL 검증 무시 (로컬 개발 환경 호환성을 위해 필요 시 사용, 운영 환경에서는 주의)
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

        $result = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200) {

            return null;
        }

        return json_decode($result, true);
    }

    /**
     * JS 버전의 파싱 로직을 PHP로 포팅하여 구현한 메서드입니다.
     * 원시 텍스트를 Day별 메인 문장, 예시 문장, 스몰 토크로 구조화합니다.
     *
     * @param string $text Notion에서 추출한 원시 텍스트
     * @return array 구조화된 데이터 배열
     */
    private function parseNotionText($text)
    {
        $days = [];
        // 메모리 최적화: array_map/filter/values 체이닝 제거하고 단순 분리
        $lines = explode("\n", $text);

        $currentDay = null;
        $currentSection = null; // 'ModelExamples' or 'SmallTalk'
        $sectionBuffer = [];

        // 내부 함수: 버퍼 처리
        $flushSectionBuffer = function () use (&$currentDay, &$currentSection, &$sectionBuffer) {
            if (!$currentDay || !$currentSection || empty($sectionBuffer))
                return;

            $koLines = [];
            $enLines = [];

            foreach ($sectionBuffer as $line) {
                // 성능 최적화: $matches 배열 생성 없이 반환값(매칭 수)만 사용
                $hangulCount = preg_match_all('/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/u', $line);
                $englishCount = preg_match_all('/[a-zA-Z]/', $line);

                if ($hangulCount === 0) {
                    $enLines[] = $line;
                } else {
                    // 한글이 있지만 영어가 압도적으로 많으면 영어로 간주
                    if ($englishCount > $hangulCount * 2) {
                        $enLines[] = $line;
                    } else {
                        $koLines[] = $line;
                    }
                }
            }

            $count = min(count($koLines), count($enLines));
            for ($i = 0; $i < $count; $i++) {
                $currentDay[$currentSection][] = [
                    'ko' => $koLines[$i],
                    'en' => $enLines[$i]
                ];
            }

            $sectionBuffer = [];
        };

        foreach ($lines as $rawLine) {
            $line = trim($rawLine);
            // 빈 줄 건너뛰기
            if ($line === '') {
                continue;
            }

            // Day 헤더 감지 "Day 001" 등
            if (preg_match('/^Day\s*(\d+)/i', $line, $matches)) {
                $flushSectionBuffer();
                if ($currentDay) {
                    $days[] = $currentDay;
                }

                $dayNum = str_pad($matches[1], 3, '0', STR_PAD_LEFT);
                $dayId = "Day {$dayNum}";

                $mainSentence = '';
                // 구분자(:, -, |) 뒤의 메인 문장 추출
                if (preg_match('/[:\-|]\s+(.+)/', $line, $splitContent)) {
                    $mainSentence = trim($splitContent[1]);
                }

                $currentDay = [
                    'Day' => $dayId,
                    'MainSentence' => $mainSentence,
                    'ModelExamples' => [],
                    'SmallTalk' => []
                ];
                $currentSection = null;
                continue;
            }

            if (!$currentDay)
                continue;

            $lowerLine = strtolower(str_replace(' ', '', $line));

            if (strpos($lowerLine, '[modelexamples]') !== false) {
                $flushSectionBuffer();
                $currentSection = 'ModelExamples';
                continue;
            }

            if (strpos($lowerLine, '[smalltalk]') !== false) {
                $flushSectionBuffer();
                $currentSection = 'SmallTalk';
                continue;
            }

            if ($currentSection === null)
                continue;

            $sectionBuffer[] = $line;
        }

        $flushSectionBuffer();
        if ($currentDay) {
            $days[] = $currentDay;
        }

        // 중복 제거 및 정렬
        $uniqueDays = [];
        $seenDays = [];

        foreach ($days as $day) {
            if (!in_array($day['Day'], $seenDays)) {
                $uniqueDays[] = $day;
                $seenDays[] = $day['Day'];
            }
        }

        usort($uniqueDays, function ($a, $b) {
            return strcmp($a['Day'], $b['Day']);
        });

        return $uniqueDays;
    }
}
