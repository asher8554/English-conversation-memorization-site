<?php

namespace App;

/**
 * 마크다운 콘텐츠 파서
 *
 * 특정 구조(Day > 질문/답변)를 가진 마크다운 파일을 파싱하여
 * 프론트엔드에서 사용할 수 있는 구조화된 배열로 변환합니다.
 *
 * @package App
 */
class Parser
{
    /**
     * 콘텐츠 파일을 파싱하여 구조화된 데이터를 반환합니다.
     *
     * 파일을 읽고 '## Day'를 기준으로 나눈 뒤, 각 Day의 내용을 파싱합니다.
     *
     * @param string $filename 콘텐츠 파일 경로.
     * @return array 구조화된 데이터 ['DayTitle' => [['q' => '...', 'a' => '...'], ...]]
     * @throws \RuntimeException 파일 읽기 실패 시 (현재는 빈 배열 반환으로 처리됨).
     */
    public function parse($filename)
    {
        if (!file_exists($filename)) {
            return [];
        }

        $content = file_get_contents($filename);
        // 줄바꿈 문자 정규화
        $content = str_replace("\r\n", "\n", $content);

        // '## Day' 기준으로 분할
        $days = preg_split('/^## /m', $content);

        $data = [];

        foreach ($days as $dayBlock) {
            if (trim($dayBlock) === '') {
                continue;
            }

            // 제목 추출 (첫 번째 줄)
            $lines = explode("\n", $dayBlock);
            $titleLine = array_shift($lines);

            $dayTitle = trim($titleLine);
            if (empty($dayTitle)) {
                continue;
            }

            $currentDayData = [];

            // 나머지를 다시 합쳐서 '---' 기준으로 분할
            $restContent = implode("\n", $lines);
            $chunks = explode('---', $restContent);

            foreach ($chunks as $chunk) {
                $chunkLines = explode("\n", $chunk);
                $cleanLines = [];

                // 줄 필터링
                foreach ($chunkLines as $line) {
                    $line = trim($line);
                    if ($line === '') {
                        continue;
                    }
                    if (strpos($line, '**[') === 0) {
                        continue; // **[Model Examples]** 같은 헤더 건너뛰기
                    }
                    $cleanLines[] = $line;
                }

                $count = count($cleanLines);
                // 짝수 줄인지 확인합니다 (질문 & 답변 쌍)
                if ($count > 0 && $count % 2 === 0) {
                    $half = $count / 2;
                    for ($i = 0; $i < $half; $i++) {
                        $question = $cleanLines[$i];       // 전반부: 한국어 표현
                        $answer = $cleanLines[$i + $half]; // 후반부: 영어 표현
                        $currentDayData[] = [
                            'q' => $this->parseMarkdown($question),
                            'a' => $this->parseMarkdown($answer)
                        ];
                    }
                }
            }

            if (!empty($currentDayData)) {
                $data[$dayTitle] = $currentDayData;
            }
        }

        return $data;
    }

    /**
     * 마크다운의 일부를 HTML로 파싱합니다.
     * 
     * 지원 문법:
     * - ***굵은 기울임꼴*** -> <strong><em>...</em></strong>
     * - **굵게** -> <strong>...</strong>
     * - *기울임꼴* -> <em>...</em>
     *
     * 보안: XSS 방지를 위해 htmlspecialchars를 사용합니다.
     *
     * @param string $text 마크다운 텍스트.
     * @return string HTML 문자열.
     */
    private function parseMarkdown($text)
    {
        $text = htmlspecialchars($text, ENT_QUOTES, 'UTF-8');

        // ***Bold Italic***
        $text = preg_replace('/(\*\*\*)(.*?)\1/', '<strong><em>$2</em></strong>', $text);

        // **Bold**
        $text = preg_replace('/(\*\*)(.*?)\1/', '<strong>$2</strong>', $text);

        // *Italic*
        $text = preg_replace('/(\*)(.*?)\1/', '<em>$2</em>', $text);

        return $text;
    }
}
