# API & Data Reference

## Data Source: `content.md`

The application does not use a traditional database. Instead, it parses a markdown file.

### Format Structure

```markdown
## Day001 : Title text

**[Section Name]**

Korean Sentence
English Sentence

Korean Sentence 2
English Sentence 2

---

**[Next Section]**
...
```

- **Day Header**: Must start with `## Day`.
- **Sections**: Separated by `---` (horizontal rule).
- **Pairs**: Content lines are read in pairs. Line N is the Question (Korean), Line N+1 is the Answer (English).

## Frontend API (`script.js`)

The frontend logic is handled by vanilla JavaScript.

### Global Variables

- `quizData` (Object): Injected by PHP. Contains the parsed content from `content.md`.
  - Key: Day Title (e.g., "Day001 : ...")
  - Value: Array of objects `{ q: "Korean", a: "English" }`

### Functions

#### `loadDay(day)`

Loads the quiz data for a specific day.

- **Parameters**: `day` (string) - Key from `quizData`.
- **Behavior**: Resets `currentIndex` to 0 and calls `updateCard()`.

#### `updateCard()`

Renders the current question card.

- **Behavior**:
  - Updates DOM elements with current question/answer.
  - Resets visibility of the answer.
  - Updates button states (Previous/Next enable/disable).
