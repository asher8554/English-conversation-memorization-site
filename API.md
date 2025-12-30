# API Reference

This document describes the internal structure and key classes of the English Conversation Memorization Site.

## Backend (PHP)

### `App\Parser`

Located in `src/Parser.php`.
Responsible for reading the `content.md` file and parsing it into a structured JSON-compatible array.

#### Methods

- **`parse(string $filename): array`**
  - Reads the file at `$filename`.
  - Splits content by `## Day` sections.
  - Returns an associative array where keys are Day titles and values are arrays of questions.
  - **Structure**:
    ```php
    [
      "Day 01" => [
        ["q" => "Korean Question", "a" => "English Answer"],
        ...
      ],
      ...
    ]
    ```

## Frontend (JavaScript)

Located in `script.js`.
Handles the interactive quiz logic.

### `QuizApp`

The main application class that orchestrates the UI and logic.

#### Properties

- `data`: The parsed quiz data passed from PHP.
- `currentDayData`: Array of questions for the currently selected day.
- `currentIndex`: Index of the current question being displayed.

#### Key Methods

- **`loadDay(day, startAtEnd = false)`**: Loads questions for the specified day. `startAtEnd` determines if we start at the first or last question (useful for backward navigation).
- **`sortOptions()`**: Handles sorting of Day options. Supports:
  - **Reverse**: Reverses the order of days.
  - **Random**: Shuffles the order of days using Fisher-Yates algorithm.
- **`handleNext()` / `handlePrev()`**: Navigates between questions. Automatically switches to the next/previous day when boundaries are reached.

### `FontSizeManager`

Manages font size preferences for the question and answer text.

#### Features

- **Persistence**: Saves user's font size preference to `localStorage`.
- **Range**: Limits font size between `1.0rem` and `4.0rem`.
