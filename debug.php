<?php
echo "<h1>Server File Debugger</h1>";
echo "<p>Current Directory: " . getcwd() . "</p>";
echo "<p>Script Directory: " . __DIR__ . "</p>";

$files = scandir(__DIR__);

echo "<table border='1' cellpadding='5'>";
echo "<tr><th>Filename</th><th>Size</th><th>Permissions</th><th>Type</th></tr>";

foreach ($files as $file) {
    if ($file == "." || $file == "..") continue;
    
    $path = __DIR__ . '/' . $file;
    $perms = substr(sprintf('%o', fileperms($path)), -4);
    $size = filesize($path);
    $type = filetype($path);
    
    echo "<tr>";
    echo "<td>" . $file . "</td>";
    echo "<td>" . $size . " bytes</td>";
    echo "<td>" . $perms . "</td>";
    echo "<td>" . $type . "</td>";
    echo "</tr>";
}
echo "</table>";

echo "<h2>Exact Match Check:</h2>";
if (file_exists(__DIR__ . '/content.md')) {
    echo "<p style='color:green'>Found 'content.md' successfully!</p>";
} else {
    echo "<p style='color:red'>Could NOT find 'content.md'. Check casing!</p>";
}
?>
