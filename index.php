<?php

/**
 * 메인 진입점
 * 
 * 로컬 data.json 파일을 파싱하고 암기 UI를 렌더링합니다.
 * 데이터는 json_encode를 통해 스크립트 태그로 주입되어 프론트엔드로 전달됩니다.
 */
$filename = __DIR__ . '/data.json';
if (!file_exists($filename)) {
    die("오류: data.json 파일을 찾을 수 없습니다.");
}

$jsonData = json_decode(file_get_contents($filename), true);
if (json_last_error() !== JSON_ERROR_NONE) {
    die("오류: data.json의 JSON 형식이 잘못되었습니다 - " . json_last_error_msg());
}

$data = [];
$dayMainSentences = [];

// JSON 데이터를 프론트엔드에서 예상하는 형식 (Day => [ {q, a} ])으로 변환
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
?>
<!DOCTYPE html>
<html lang="ko">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>English Conversation Memorization</title>
    <link rel="stylesheet" href="style.css?v=<?php echo file_exists('style.css') ? filemtime('style.css') : time(); ?>">
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet">
</head>

<body>
    <div class="font-controls">
        <button id="darkModeToggle" class="btn-circle" title="Toggle Dark Mode">🌙</button>
        <button id="decreaseFont" class="btn-circle" title="Decrease Font Size">-</button>
        <button id="increaseFont" class="btn-circle" title="Increase Font Size">+</button>
    </div>
    <div class="container">
        <div class="day-selector">
            <select id="daySelect">
                <?php foreach ($data as $day => $questions): ?>
                    <?php
                    $label = htmlspecialchars($day);
                    if (!empty($dayMainSentences[$day])) {
                        $label .= " - " . htmlspecialchars($dayMainSentences[$day]);
                    }
                    ?>
                    <option value="<?php echo htmlspecialchars($day); ?>"><?php echo $label; ?></option>
                <?php endforeach; ?>
            </select>
            <div class="checkbox-wrapper">
                <label class="checkbox-container">
                    <input type="checkbox" id="reverseOrder"> Reverse
                </label>
                <label class="checkbox-container">
                    <input type="checkbox" id="randomOrder"> Random
                </label>
            </div>
        </div>
        </header>

        <main class="card-area">
            <div class="controls">
                <button class="btn btn-secondary" id="prevBtn">Previous</button>
                <button class="btn btn-secondary" id="nextBtn">Next</button>
            </div>
            <div id="cardContent" class="fade-in">
                <div class="question" id="questionText"></div>
                <button class="btn btn-primary" id="showAnswerBtn">Show Answer</button>
                <div class="answer-container">
                    <div class="answer" id="answerText"></div>
                </div>
            </div>
        </main>
    </div>

    <script>
        const quizData = <?php echo json_encode($data); ?>;
    </script>
    <script src="script.js?v=<?php echo file_exists('script.js') ? filemtime('script.js') : time(); ?>"></script>
</body>

</html>