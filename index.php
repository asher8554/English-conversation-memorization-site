<?php
// .env 파싱 함수 (간단 구현)
/**
 * .env 파일을 파싱하여 환경 변수 배열로 반환합니다.
 *
 * @param string $path .env 파일 경로
 * @return array 환경 변수 키-값 쌍 배열
 */
function loadEnv($path)
{
    if (!file_exists($path))
        return [];
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $env = [];
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0)
            continue;
        list($name, $value) = explode('=', $line, 2);
        $env[trim($name)] = trim($value);
    }
    return $env;
}

/**
 * 원시 JSON 데이터를 프론트엔드에서 사용할 형식으로 변환합니다.
 *
 * @param array $jsonData raw JSON data
 * @return array [formattedData, dayMainSentences]
 */
function processQuizData($jsonData)
{
    $data = [];
    $dayMainSentences = [];

    foreach ($jsonData as $dayItem) {
        $dayKey = $dayItem['Day'];
        $dayMainSentences[$dayKey] = isset($dayItem['MainSentence']) ? $dayItem['MainSentence'] : '';
        $cards = [];

        // 모델 예시 (Model Examples)
        if (isset($dayItem['ModelExamples']) && is_array($dayItem['ModelExamples'])) {
            foreach ($dayItem['ModelExamples'] as $ex) {
                if (isset($ex['ko']) && isset($ex['en'])) {
                    $cards[] = [
                        'q' => htmlspecialchars($ex['ko']),
                        'a' => htmlspecialchars($ex['en'])
                    ];
                }
            }
        }

        // 스몰 토크 (Small Talk)
        if (isset($dayItem['SmallTalk']) && is_array($dayItem['SmallTalk'])) {
            foreach ($dayItem['SmallTalk'] as $st) {
                if (isset($st['ko']) && isset($st['en'])) {
                    $cards[] = [
                        'q' => htmlspecialchars($st['ko']),
                        'a' => htmlspecialchars($st['en'])
                    ];
                }
            }
        }

        $data[$dayKey] = $cards;
    }

    return [$data, $dayMainSentences];
}

$message = "";
if (isset($_GET['action']) && $_GET['action'] === 'import') {
    require_once 'NotionImporter.php';
    $env = loadEnv(__DIR__ . '/.env');

    if (empty($env['NOTION_KEY']) || empty($env['NOTION_PAGE_ID'])) {
        $message = "오류: .env 파일에 설정이 없습니다.";
    } else {
        try {
            $importer = new NotionImporter($env['NOTION_KEY'], $env['NOTION_PAGE_ID']);
            $count = $importer->import();
            $message = "성공적으로 업데이트되었습니다! (총 {$count}일치 데이터)";
            // 리다이렉트하여 새로고침 시 재실행 방지
            header("Location: index.php?msg=" . urlencode($message));
            exit;
        } catch (Exception $e) {
            $message = "오류 발생: " . $e->getMessage();
        }
    }
}

if (isset($_GET['msg'])) {
    $message = htmlspecialchars($_GET['msg']);
}

/**
 * 메인 진입점
 * 
 * 로컬 data.json 파일을 파싱하고 암기 UI를 렌더링합니다.
 * 데이터는 json_encode를 통해 스크립트 태그로 주입되어 프론트엔드로 전달됩니다.
 */
$filename = __DIR__ . '/data.json';
if (!file_exists($filename)) {
    // 파일이 없으면 빈 배열로 초기화하여 에러 방지
    file_put_contents($filename, '[]');
}

$jsonData = json_decode(file_get_contents($filename), true);
if (json_last_error() !== JSON_ERROR_NONE) {
    $jsonData = []; // JSON 오류 시 빈 배열
}

// JSON 데이터를 프론트엔드 형식으로 변환
list($data, $dayMainSentences) = processQuizData($jsonData);
?>
<!DOCTYPE html>
<html lang="ko">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>English Conversation Memorization</title>
    <link rel="stylesheet" href="style.css?v=<?php echo file_exists('style.css') ? filemtime('style.css') : time(); ?>">
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet">
</head>

<body>
    <div class="font-controls">
        <a href="?action=import" class="btn-circle" title="Update from Notion"
            onclick="return confirm('Notion에서 데이터를 가져오시겠습니까? 시간이 걸릴 수 있습니다.');">🔄</a>
        <button id="darkModeToggle" class="btn-circle" title="Toggle Dark Mode">🌙</button>
        <button id="decreaseFont" class="btn-circle" title="Decrease Font Size">-</button>
        <button id="increaseFont" class="btn-circle" title="Increase Font Size">+</button>
    </div>

    <?php if ($message): ?>
        <div
            style="position: fixed; top: 70px; right: 20px; background: var(--primary-color); color: white; padding: 10px 20px; border-radius: 8px; z-index: 1001; animation: fadeIn 0.5s;">
            <?php echo $message; ?>
        </div>
        <script>
            setTimeout(() => {
                const msg = document.querySelector('div[style*="position: fixed"]');
                if (msg) msg.style.display = 'none';
            }, 5000);
        </script>
    <?php endif; ?>

    <div class="container">
        <header>
            <div class="day-selector">
                <select id="daySelect">
                    <?php foreach ($data as $day => $questions): ?>
                        <?php
                        $label = htmlspecialchars($day);
                        if (!empty($dayMainSentences[$day])) {
                            $label .= " - " . htmlspecialchars($dayMainSentences[$day]);
                        }
                        ?>
                        <option value="<?php echo htmlspecialchars($day); ?>"><?php echo $label; ?></option>
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

        document.addEventListener('DOMContentLoaded', () => {
            /**
             * 질문과 정답 텍스트의 글자 크기를 관리하며, 설정을 localStorage에 저장합니다.
             * 
             * @class FontSizeManager
             */
            class FontSizeManager {
                /**
                 * @param {HTMLElement} questionEl - 질문을 표시할 요소
                 * @param {HTMLElement} answerEl - 정답을 표시할 요소
                 */
                constructor(questionEl, answerEl) {
                    this.questionEl = questionEl;
                    this.answerEl = answerEl;
                    this.qSize = parseFloat(localStorage.getItem('questionFontSize')) || 2.0;
                    this.aSize = parseFloat(localStorage.getItem('answerFontSize')) || 1.6;
                    this.init();
                }

                init() {
                    this.update();
                    const increaseBtn = document.getElementById('increaseFont');
                    const decreaseBtn = document.getElementById('decreaseFont');
                    increaseBtn.addEventListener('click', () => this.changeSize(0.2));
                    decreaseBtn.addEventListener('click', () => this.changeSize(-0.2));
                }

                /**
                 * 델타 값만큼 글자 크기를 변경합니다.
                 * @param {number} delta - 변경할 크기 (예: 0.2)
                 */
                changeSize(delta) {
                    const newQSize = this.qSize + delta;

                    // 1.0에서 4.0 사이로 제한
                    if (newQSize >= 1.0 && newQSize <= 4.0) {
                        this.qSize += delta;
                        this.aSize += delta;
                        this.update();
                    }
                }

                /**
                 * 변경된 글자 크기를 DOM 요소에 적용하고 localStorage에 저장합니다.
                 */
                update() {
                    this.questionEl.style.fontSize = `${this.qSize}rem`;
                    this.answerEl.style.fontSize = `${this.aSize}rem`;
                    localStorage.setItem('questionFontSize', this.qSize);
                    localStorage.setItem('answerFontSize', this.aSize);
                }
            }

            /**
             * 다크 모드를 전환하고 설정을 localStorage에 저장합니다.
             * 
             * @class DarkModeManager
             */
            class DarkModeManager {
                constructor() {
                    this.toggleBtn = document.getElementById('darkModeToggle');
                    this.body = document.body;
                    this.isDarkMode = localStorage.getItem('useDarkMode') === 'true';
                    this.init();
                }

                /**
                 * 초기화 메서드입니다. 저장된 설정이 있으면 적용하고 이벤트를 바인딩합니다.
                 */
                init() {
                    // 초기 상태 적용
                    if (this.isDarkMode) {
                        this.enableDarkMode();
                    }

                    this.toggleBtn.addEventListener('click', () => this.toggle());
                }

                toggle() {
                    this.isDarkMode = !this.isDarkMode;
                    if (this.isDarkMode) {
                        this.enableDarkMode();
                    } else {
                        this.disableDarkMode();
                    }
                    localStorage.setItem('useDarkMode', this.isDarkMode);
                }

                enableDarkMode() {
                    this.body.classList.add('dark-mode');
                    this.toggleBtn.textContent = '☀️'; // 라이트 모드로 전환하는 해 아이콘
                }

                disableDarkMode() {
                    this.body.classList.remove('dark-mode');
                    this.toggleBtn.textContent = '🌙'; // 다크 모드로 전환하는 달 아이콘
                }
            }

            /**
             * 퀴즈 앱의 메인 로직입니다.
             * 네비게이션, Day 로딩, 옵션 정렬 등을 처리합니다.
             * 
             * @class QuizApp
             */
            class QuizApp {
                /**
                 * @param {Object} data - 퀴즈 데이터 구조
                 */
                constructor(data) {
                    this.data = data;
                    this.currentDayData = [];
                    this.currentIndex = 0;

                    this.cacheDOM();
                    this.originalOptions = Array.from(this.daySelect.options);

                    this.init();
                }

                cacheDOM() {
                    this.daySelect = document.getElementById('daySelect');
                    this.questionText = document.getElementById('questionText');
                    this.answerText = document.getElementById('answerText');
                    this.showAnswerBtn = document.getElementById('showAnswerBtn');
                    this.prevBtn = document.getElementById('prevBtn');
                    this.nextBtn = document.getElementById('nextBtn');
                    this.cardContent = document.getElementById('cardContent');
                    this.reverseOrderCheckbox = document.getElementById('reverseOrder');
                    this.randomOrderCheckbox = document.getElementById('randomOrder');
                }

                init() {
                    this.initEventListeners();

                    // 매니저 초기화
                    new DarkModeManager();
                    new FontSizeManager(this.questionText, this.answerText);

                    if (this.daySelect.options.length > 0) {
                        this.loadDay(this.daySelect.value);
                    }
                }

                /**
                 * 이벤트 리스너를 초기화하고 바인딩합니다.
                 * Day 선택, 정답 보기, 네비게이션, 정렬 옵션 등에 대한 이벤트를 처리합니다.
                 */
                initEventListeners() {
                    this.daySelect.addEventListener('change', (e) => this.loadDay(e.target.value));

                    this.showAnswerBtn.addEventListener('click', () => {
                        this.answerText.classList.add('visible');
                        this.showAnswerBtn.style.display = 'none';
                    });

                    this.prevBtn.addEventListener('click', () => this.handlePrev());
                    this.nextBtn.addEventListener('click', () => this.handleNext());

                    this.reverseOrderCheckbox.addEventListener('change', (e) => this.handleSortChange(e, this.randomOrderCheckbox));
                    this.randomOrderCheckbox.addEventListener('change', (e) => this.handleSortChange(e, this.reverseOrderCheckbox));
                }

                /**
                 * 정렬 체크박스 변경 이벤트를 처리합니다.
                 * 역순과 무작위 정렬은 동시에 선택될 수 없으므로 상호 배타적으로 동작합니다.
                 * 
                 * @param {Event} event - 발생한 이벤트 객체
                 * @param {HTMLInputElement} otherCheckbox - 해제해야 할 다른 체크박스 요소
                 */
                handleSortChange(event, otherCheckbox) {
                    if (event.target.checked) {
                        otherCheckbox.checked = false;
                    }
                    this.sortOptions();
                    this.updateCard();
                }

                /**
                 * 현재 선택된 정렬 옵션(역순, 무작위)에 따라 Day 목록을 정렬합니다.
                 * 정렬 후 현재 선택된 값을 유지하거나, 선택 값이 사라진 경우 첫 번째 항목을 선택합니다.
                 */
                sortOptions() {
                    const isReverse = this.reverseOrderCheckbox.checked;
                    const isRandom = this.randomOrderCheckbox.checked;
                    const currentVal = this.daySelect.value;

                    let optionsToSort = [...this.originalOptions];

                    if (isRandom) {
                        this.shuffleArray(optionsToSort);
                    } else if (isReverse) {
                        optionsToSort.reverse();
                    }

                    this.daySelect.innerHTML = '';
                    optionsToSort.forEach(opt => this.daySelect.add(opt));

                    this.daySelect.value = currentVal;

                    // 선택이 사라지는 엣지 케이스 처리
                    if (this.daySelect.selectedIndex === -1 && this.daySelect.options.length > 0) {
                        this.daySelect.selectedIndex = 0;
                        this.loadDay(this.daySelect.value);
                    } else {
                        this.updateNavButtons();
                    }
                }

                /**
                 * Fisher-Yates 알고리즘을 사용하여 배열을 무작위로 섞습니다.
                 * 모든 가능한 순열이 동일한 확률로 나타나도록 보장합니다.
                 * 
                 * @param {Array} array - 제자리에서 섞을 배열
                 */
                shuffleArray(array) {
                    // 마지막 요소부터 역순으로 반복
                    for (let i = array.length - 1; i > 0; i--) {
                        // 0부터 i 사이의 무작위 인덱스 선택
                        const j = Math.floor(Math.random() * (i + 1));
                        // i와 j 위치의 요소 교환
                        [array[i], array[j]] = [array[j], array[i]];
                    }
                }

                /**
                 * 특정 Day의 데이터를 로드하고 화면을 갱신합니다.
                 * 
                 * @param {string} day - 선택된 Day 식별자
                 * @param {boolean} [startAtEnd=false] - true일 경우 마지막 문제부터 시작 (이전 Day에서 넘어올 때 사용)
                 */
                loadDay(day, startAtEnd = false) {
                    this.currentDayData = this.data[day] || [];
                    this.currentIndex = startAtEnd && this.currentDayData.length > 0 ? this.currentDayData.length - 1 : 0;
                    this.updateCard();
                }

                updateCard() {
                    // 상태 초기화
                    this.answerText.classList.remove('visible');
                    this.cardContent.classList.remove('fade-in');
                    void this.cardContent.offsetWidth; // 리플로우 트리거
                    this.cardContent.classList.add('fade-in');

                    if (this.currentDayData.length === 0) {
                        this.renderEmptyState();
                        return;
                    }

                    const currentItem = this.currentDayData[this.currentIndex];
                    this.questionText.innerHTML = currentItem.q;
                    this.answerText.innerHTML = currentItem.a;
                    this.showAnswerBtn.style.display = 'block';
                    this.showAnswerBtn.textContent = 'Show Answer';

                    this.updateNavButtons();
                }

                renderEmptyState() {
                    this.questionText.textContent = "이 날짜에 해당하는 질문이 없습니다.";
                    this.answerText.textContent = "";
                    this.showAnswerBtn.style.display = 'none';
                    this.prevBtn.disabled = true;
                    this.nextBtn.disabled = true;
                }

                updateNavButtons() {
                    const isFirstQuestion = this.currentIndex === 0;
                    const isFirstDay = this.daySelect.selectedIndex === 0;
                    this.prevBtn.disabled = isFirstQuestion && isFirstDay;

                    const isLastQuestion = this.currentIndex === this.currentDayData.length - 1;
                    const isLastDay = this.daySelect.selectedIndex === this.daySelect.options.length - 1;
                    this.nextBtn.disabled = isLastQuestion && isLastDay;
                }

                /**
                 * '이전' 버튼 클릭 시 처리를 담당합니다.
                 * 현재 Day의 첫 문제라면 이전 Day로 이동합니다.
                 */
                handlePrev() {
                    if (this.currentIndex > 0) {
                        // 현재 Day의 이전 질문으로 이동
                        this.currentIndex--;
                        this.updateCard();
                    } else if (this.daySelect.selectedIndex > 0) {
                        // Day의 시작이면, 이전 Day의 마지막 질문으로 이동
                        this.daySelect.selectedIndex--;
                        this.loadDay(this.daySelect.value, true); // true = startAtEnd
                    }
                }

                /**
                 * '다음' 버튼 클릭 시 처리를 담당합니다.
                 * 현재 Day의 마지막 문제라면 다음 Day로 이동합니다.
                 */
                handleNext() {
                    if (this.currentIndex < this.currentDayData.length - 1) {
                        // 현재 Day의 다음 질문으로 이동
                        this.currentIndex++;
                        this.updateCard();
                    } else if (this.daySelect.selectedIndex < this.daySelect.options.length - 1) {
                        // Day의 끝이면, 다음 Day의 첫 번째 질문으로 이동
                        this.daySelect.selectedIndex++;
                        this.loadDay(this.daySelect.value);
                    }
                }
            }

            // 앱 초기화
            const app = new QuizApp(quizData);
        });
    </script>
</body>

</html>