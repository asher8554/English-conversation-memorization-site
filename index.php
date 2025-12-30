<?php
// Read content.md
/**
 * Main Entry Point
 * 
 * Parses local content.md file and renders the memorization UI.
 * Data is passed to frontend via json_encode injected into a script tag.
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
    <div class="container">
        <header>
            <h1>English Master</h1>
            <div class="day-selector">
                <select id="daySelect">
                    <?php foreach ($data as $day => $questions): ?>
                        <option value="<?php echo htmlspecialchars($day); ?>"><?php echo htmlspecialchars($day); ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
        </header>

        <main class="card-area">
            <div id="cardContent" class="fade-in">
                <div class="question" id="questionText"></div>
                <button class="btn btn-primary" id="showAnswerBtn">Show Answer</button>
                <div class="answer-container">
                    <div class="answer" id="answerText"></div>
                </div>
            </div>
        </main>

        <footer class="controls">
            <button class="btn btn-secondary" id="prevBtn">Previous</button>
            <button class="btn btn-secondary" id="nextBtn">Next</button>
        </footer>
    </div>

    <script>
        const quizData = <?php echo json_encode($data); ?>;
    </script>
    <script src="script.js?v=<?php echo time(); ?>"></script>
</body>

</html>