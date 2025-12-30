<?php
$filename = 'content.md';
$content = file_get_contents($filename);
$content = str_replace("\r\n", "\n", $content);
$days = preg_split('/^## /m', $content);

$data = [];

foreach ($days as $dayBlock) {
    if (trim($dayBlock) === '') continue;
    $lines = explode("\n", $dayBlock);
    $titleLine = array_shift($lines);
    $dayTitle = trim($titleLine);
    if (empty($dayTitle)) continue;

    $data[$dayTitle] = [];
    $restContent = implode("\n", $lines);
    $chunks = explode('---', $restContent);

    foreach ($chunks as $chunk) {
        $chunkLines = explode("\n", $chunk);
        $cleanLines = [];
        foreach ($chunkLines as $line) {
            $line = trim($line);
            if ($line === '') continue;
            if (strpos($line, '**[') === 0) continue; 
            $cleanLines[] = $line;
        }

        $count = count($cleanLines);
        if ($count > 0 && $count % 2 === 0) {
            $half = $count / 2;
            for ($i = 0; $i < $half; $i++) {
                $data[$dayTitle][] = [
                    'q' => $cleanLines[$i],
                    'a' => $cleanLines[$i + $half]
                ];
            }
        }
    }
}

// Output first 2 items of first day to verify
$firstDay = array_key_first($data);
echo "Day: " . $firstDay . "\n";
print_r(array_slice($data[$firstDay], 0, 2));

// Check total count
echo "Total Days: " . count($data) . "\n";
echo "Items in first day: " . count($data[$firstDay]) . "\n";
?>
