<?php

class Utils
{
    /**
     * .env 파일을 파싱하여 환경 변수 배열로 반환합니다.
     *
     * @param string $path .env 파일 경로
     * @return array 환경 변수 키-값 쌍 배열
     */
    public static function loadEnv($path)
    {
        if (!file_exists($path))
            return [];
        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        $env = [];
        foreach ($lines as $line) {
            if (strpos(trim($line), '#') === 0)
                continue;
            list($name, $value) = explode('=', $line, 2);
            $env[trim($name)] = trim($value);
        }
        return $env;
    }

    /**
     * 원시 JSON 데이터를 프론트엔드에서 사용할 형식으로 변환합니다.
     *
     * @param array $jsonData raw JSON data
     * @return array [formattedData, dayMainSentences]
     */
    public static function processQuizData($jsonData)
    {
        $data = [];
        $dayMainSentences = [];

        foreach ($jsonData as $dayItem) {
            $dayKey = $dayItem['Day'];
            $dayMainSentences[$dayKey] = isset($dayItem['MainSentence']) ? $dayItem['MainSentence'] : '';
            $cards = [];

            // 모델 예시 (Model Examples)
            if (isset($dayItem['ModelExamples']) && is_array($dayItem['ModelExamples'])) {
                foreach ($dayItem['ModelExamples'] as $ex) {
                    if (isset($ex['ko']) && isset($ex['en'])) {
                        $cards[] = [
                            'q' => htmlspecialchars($ex['ko']),
                            'a' => htmlspecialchars($ex['en'])
                        ];
                    }
                }
            }

            // 스몰 토크 (Small Talk)
            if (isset($dayItem['SmallTalk']) && is_array($dayItem['SmallTalk'])) {
                foreach ($dayItem['SmallTalk'] as $st) {
                    if (isset($st['ko']) && isset($st['en'])) {
                        $cards[] = [
                            'q' => htmlspecialchars($st['ko']),
                            'a' => htmlspecialchars($st['en'])
                        ];
                    }
                }
            }

            $data[$dayKey] = $cards;
        }

        return [$data, $dayMainSentences];
    }
}
