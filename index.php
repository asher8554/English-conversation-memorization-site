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

$content = file_get_contents($filename);

// Normalize newlines
$content = str_replace("\r\n", "\n", $content);

// Split by '## Day'
// The regex /^## /m matches lines starting with "## " (markdown headers)
$days = preg_split('/^## /m', $content);

$data = [];

foreach ($days as $dayBlock) {
    if (trim($dayBlock) === '')
        continue;

    // Extract Title (First line)
    $lines = explode("\n", $dayBlock);
    $titleLine = array_shift($lines);

    // Check if it really looks like a Day title (starts with Day or similar)
    // The user format is "Day001 : ..." so just using the line as Key is fine.
    $dayTitle = trim($titleLine);
    if (empty($dayTitle))
        continue;

    $data[$dayTitle] = [];

    // Rejoin the rest to split by '---'
    $restContent = implode("\n", $lines);
    $chunks = explode('---', $restContent);

    // Helper to escape HTML and parse key Markdown syntax
    function parseMarkdown($text)
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

    foreach ($chunks as $chunk) {
        $chunkLines = explode("\n", $chunk);
        $cleanLines = [];

        // Filter lines
        foreach ($chunkLines as $line) {
            $line = trim($line);
            if ($line === '')
                continue;
            if (strpos($line, '**[') === 0)
                continue; // Skip headers like **[Model Examples]**
            $cleanLines[] = $line;
        }

        $count = count($cleanLines);
        if ($count > 0 && $count % 2 === 0) {
            $half = $count / 2;
            for ($i = 0; $i < $half; $i++) {
                $question = $cleanLines[$i];       // Korean
                $answer = $cleanLines[$i + $half]; // English
                $data[$dayTitle][] = [
                    'q' => parseMarkdown($question),
                    'a' => parseMarkdown($answer)
                ];
            }
        }
    }
}
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
    <script src="script.js"></script>
</body>

</html>