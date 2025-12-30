<?php

namespace App;

class Parser
{
    /**
     * Parses the given content file and returns structured data.
     *
     * @param string $filename Path to the content file.
     * @return array Structured data ['DayTitle' => [['q' => '...', 'a' => '...'], ...]]
     */
    public function parse($filename)
    {
        if (!file_exists($filename)) {
            return [];
        }

        $content = file_get_contents($filename);
        // Normalize newlines
        $content = str_replace("\r\n", "\n", $content);

        // Split by '## Day'
        $days = preg_split('/^## /m', $content);

        $data = [];

        foreach ($days as $dayBlock) {
            if (trim($dayBlock) === '') {
                continue;
            }

            // Extract Title (First line)
            $lines = explode("\n", $dayBlock);
            $titleLine = array_shift($lines);

            $dayTitle = trim($titleLine);
            if (empty($dayTitle)) {
                continue;
            }

            $currentDayData = [];

            // Rejoin the rest to split by '---'
            $restContent = implode("\n", $lines);
            $chunks = explode('---', $restContent);

            foreach ($chunks as $chunk) {
                $chunkLines = explode("\n", $chunk);
                $cleanLines = [];

                // Filter lines
                foreach ($chunkLines as $line) {
                    $line = trim($line);
                    if ($line === '') {
                        continue;
                    }
                    if (strpos($line, '**[') === 0) {
                        continue; // Skip headers like **[Model Examples]**
                    }
                    $cleanLines[] = $line;
                }

                $count = count($cleanLines);
                if ($count > 0 && $count % 2 === 0) {
                    $half = $count / 2;
                    for ($i = 0; $i < $half; $i++) {
                        $question = $cleanLines[$i];       // Korean
                        $answer = $cleanLines[$i + $half]; // English
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
     * Parses a subset of Markdown into HTML.
     * Supported: ***bold italic***, **bold**, *italic*
     * Escapes all other HTML to prevent XSS.
     *
     * @param string $text
     * @return string
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
