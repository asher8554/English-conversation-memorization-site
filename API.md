# API 문서

이 문서는 영어 회화 암기 사이트 프로젝트의 주요 파일 및 함수에 대한 설명을 포함합니다.

## 목차

1. [개요](#개요)
2. [백엔드 (PHP)](#백엔드-php)
3. [프론트엔드 (JavaScript)](#프론트엔드-javascript)
4. [유틸리티 (Node.js)](#유틸리티-nodejs)

## 개요

이 프로젝트는 PHP 기반의 간단한 웹 애플리케이션으로, Notion에서 스크랩한 데이터를 JSON 형식으로 저장하고 이를 프론트엔드에서 퀴즈 형태로 제공합니다.

## 백엔드 (PHP)

### `index.php`

메인 진입점 파일입니다.

- **기능**:
  - `data.json` 파일 로드 및 파싱 검증
  - JSON 데이터를 파싱하여 HTML 구조로 변환 (서버 사이드 렌더링 일부 포함 - Select 옵션 등)
  - `quizData` 변수를 통해 프론트엔드로 데이터 주입
- **주요 변수**:
  - `$filename`: 데이터 파일 경로 (`data.json`)
  - `$data`: 날짜별 퀴즈 카드 데이터가 담긴 연관 배열

## 프론트엔드 (JavaScript)

### `script.js`

사용자 인터페이스 상호작용 및 퀴즈 로직을 담당합니다.

#### `class FontSizeManager`

질문과 정답 텍스트의 글자 크기를 관리합니다.

- **메서드**:
  - `changeSize(delta)`: 주어진 `delta`만큼 글자 크기를 변경합니다. (최소 1.0rem ~ 최대 4.0rem)
  - `update()`: 변경된 크기를 DOM에 적용하고 `localStorage`에 저장합니다.

#### `class DarkModeManager`

다크 모드/라이트 모드 전환을 관리합니다.

- **기능**:
  - `localStorage`에 사용자 설정을 저장하여 재방문 시 기본값으로 사용
  - `body` 태그에 `.dark-mode` 클래스 토글

#### `class QuizApp`

퀴즈 애플리케이션의 핵심 로직입니다.

- **생성자**: `new QuizApp(data)`
- **주요 메서드**:
  - `loadDay(day)`: 선택된 날짜의 데이터를 로드하고 첫 번째 카드를 표시합니다.
  - `updateCard()`: 현재 질문과 정답을 화면에 렌더링합니다.
  - `handlePrev() / handleNext()`: 이전/다음 질문으로 이동합니다. 날짜 경계를 넘어가면 자동으로 날짜를 변경합니다.
  - `shuffleArray(array)`: Fisher-Yates 알고리즘을 사용하여 배열을 무작위로 섞습니다.

## 유틸리티 (Node.js)

### `scraper.js`

Notion 페이지에서 데이터를 스크래핑하여 `data.json`을 생성하는 스크립트입니다.

- **사용법**: `node scraper.js`
- **주요 함수**:
  - `scrapeNotion()`: Puppeteer를 사용하여 Notion 페이지에 접속, 데이터 로드 및 텍스트 추출
  - `parseNotionText(text)`: 추출된 원본 텍스트를 파싱하여 구조화된 JSON 데이터로 변환
    - 한글/영어 라인을 감지하여 자동 매핑
    - Day 별 `ModelExamples` 및 `SmallTalk` 섹션 분류
