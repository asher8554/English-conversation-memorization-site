<?php
header('Content-Type: text/html; charset=utf-8');
echo "<h1>Server Debug Info</h1>";

// 1. Current Directory
echo "<h2>Current Directory</h2>";
echo __DIR__;

// 2. List Files
echo "<h2>Files in this Directory</h2>";
$files = scandir(__DIR__);
echo "<ul>";
foreach ($files as $file) {
    if ($file == '.' || $file == '..')
        continue;
    $filesize = filesize($file);
    echo "<li>{$file} ({$filesize} bytes)</li>";
}
echo "</ul>";

// 3. Check specific file
echo "<h2>Checking for 'content.md'</h2>";
if (file_exists('content.md')) {
    echo "<p style='color:green'>✅ content.md FOUND.</p>";
} else {
    echo "<p style='color:red'>❌ content.md NOT FOUND.</p>";

    // Check for case sensitivity issues
    $found = false;
    foreach ($files as $file) {
        if (strtolower($file) === 'content.md') {
            echo "<p>⚠️ Found '{$file}' but script is looking for 'content.md' (Case Sensitivity Issue)</p>";
            $found = true;
        }
    }
}

// 4. PHP Info
echo "<h2>PHP Version</h2>";
echo phpversion();
?>