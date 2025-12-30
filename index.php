<?php

/**
 * 메인 진입점 (Main Entry Point)
 * 
 * 로컬 content.md 파일을 파싱하고 암기 UI를 렌더링합니다.
 * 데이터는 script 태그 내에 json_encode를 통해 주입되어 프론트엔드로 전달됩니다.
 * 
 * @package EnglishConversationMemorization
 * @version 1.0.0
 */
$filename = __DIR__ . '/content.md';
if (!file_exists($filename)) {
    // Fallback to relative path if __DIR__ fails or for some hosting environments
    $filename = 'content.md';
    if (!file_exists($filename)) {
        $files = scandir(__DIR__);
        $fileList = implode(", ", $files);
        die("Error: content.md not found.<br>Checked: " . __DIR__ . '/content.md' . "<br>Current directory files: " . $fileList);
    }
}



// Use the Parser class
require_once __DIR__ . '/src/Parser.php';

use App\Parser;

$parser = new Parser();
$data = $parser->parse($filename);
?>
<!DOCTYPE html>
<html lang="ko">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>English Conversation Memorization</title>
    <link rel="stylesheet" href="style.css">
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet">
</head>

<body>
    <div class="font-controls">
        <button id="decreaseFont" class="btn-circle" title="Decrease Font Size">-</button>
        <button id="increaseFont" class="btn-circle" title="Increase Font Size">+</button>
    </div>
    <div class="container">
        <div class="day-selector">
            <select id="daySelect">
                <?php foreach ($data as $day => $questions): ?>
                    <option value="<?php echo htmlspecialchars($day); ?>"><?php echo htmlspecialchars($day); ?></option>
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
    <script src="script.js?v=<?php echo time(); ?>"></script>
</body>

</html>