<?php
// .env 파일을 로드하기 위한 간단한 파서
function loadEnv($path)
{
    if (!file_exists($path)) {
        return;
    }
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) {
            continue;
        }
        list($name, $value) = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value);
        if (!array_key_exists($name, $_SERVER) && !array_key_exists($name, $_ENV)) {
            putenv(sprintf('%s=%s', $name, $value));
            $_ENV[$name] = $value;
            $_SERVER[$name] = $value;
        }
    }
}

require_once 'NotionImporter.php';
loadEnv(__DIR__ . '/.env');

$apiKey = getenv('NOTION_KEY');
$pageId = getenv('NOTION_PAGE_ID');

if (!$apiKey || !$pageId) {
    echo "Error: NOTION_KEY or NOTION_PAGE_ID not found in .env\n";
    exit(1);
}

$importer = new NotionImporter($apiKey, $pageId);
$count = $importer->import();

echo "Successfully imported {$count} days of data into data.json\n";
