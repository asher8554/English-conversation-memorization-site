# API 문서 (API Documentation)

이 문서는 프로젝트의 주요 클래스, 함수 및 프론트엔드 로직에 대한 명세를 기술합니다.

## 백엔드 (PHP)

### `NotionImporter.php`

Notion API를 통해 데이터를 가져오고 파싱하여 `data.json` 파일을 생성하는 핵심 클래스입니다.

#### `class NotionImporter`

- **설명**: Notion 페이지의 텍스트 내용을 재귀적으로 수집하여 구조화된 JSON 데이터로 변환합니다.

#### 메서드

- **`__construct(string $apiKey, string $pageId)`**
  - Notion API 키와 대상 페이지 ID로 인스턴스를 초기화합니다.
- **`import(): int`**
  - Notion 데이터 수집, 파싱, 파일 저장을 수행하는 메인 메서드입니다.
  - **반환값**: 파싱된 총 Day 데이터의 개수
- **`private fetchPageContent(string $blockId, int $depth = 0): string`**
  - 특정 블록(페이지)의 하위 콘텐츠를 재귀적으로 조회하여 텍스트로 추출합니다.
- **`private makeRequest(string $url): array|null`**
  - cURL을 사용하여 Notion API 요청을 수행합니다.
- **`private parseNotionText(string $text): array`**
  - 원시 텍스트 데이터를 분석하여 Day, MainSentence, ModelExamples, SmallTalk 구조로 변환합니다.

### `index.php`

웹 애플리케이션의 진입점이며, 환경 설정 로딩 및 초기 데이터 처리를 담당합니다.

#### 함수

- **`loadEnv(string $path): array`**
  - `.env` 파일을 파싱하여 PHP 환경 변수 배열로 반환합니다.
- **`processQuizData(array $jsonData): array`**
  - 원시 JSON 데이터를 프론트엔드에서 사용할 형식으로 변환합니다.

---

## 프론트엔드 (JavaScript)

`index.php` 내부에 내장된 클라이언트 측 로직입니다.

### `class FontSizeManager`

질문과 정답 텍스트의 글자 크기를 조절하고 사용자 설정을 저장합니다.

- **기능**:
  - `+`, `-` 버튼을 통한 폰트 크기 변경 (0.2rem 단위)
  - `localStorage`를 통한 설정 유지
  - 최소 1.0rem ~ 최대 4.0rem 범위 제한

### `class DarkModeManager`

다크 모드 테마를 토글하고 사용자 설정을 관리합니다.

- **기능**:
  - `localStorage` 기반 다크 모드 설정 유지 (`useDarkMode`)
  - `body` 태그에 `.dark-mode` 클래스 토글
  - 아이콘(☀️/🌙) 상태 변경

### `class QuizApp`

애플리케이션의 핵심 퀴즈 로직과 UI 상호작용을 담당합니다.

- **기능**:
  - `data.json` 데이터 로드 및 관리
  - 날짜(Day) 선택 및 변경 처리
  - 이전/다음 문제 네비게이션
  - 정답 보기 토글
  - 옵션 정렬 (역순, 무작위 섞기)
