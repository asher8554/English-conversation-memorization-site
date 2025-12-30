# API 레퍼런스

이 문서는 영어 회화 암기 사이트의 내부 구조와 주요 클래스를 설명합니다.

## 백엔드 (PHP)

### `App\Parser`

`src/Parser.php`에 위치합니다.
`content.md` 파일을 읽고 프론트엔드에서 사용할 수 있는 구조화JSON 호환 배열로 파싱하는 역할을 합니다.

#### 메서드

- **`parse(string $filename): array`**
  - **설명**: 파일을 읽어 '## Day' 섹션별로 내용을 분리하고 파싱합니다.
  - **파라미터**:
    - `$filename` (string): 콘텐츠 파일의 경로.
  - **반환값**: Day 제목을 키(Key)로, 질문 배열을 값(Value)으로 하는 연관 배열.
  - **데이터 구조**:
    ```php
    [
      "Day 01" => [
        ["q" => "한국어 질문", "a" => "영어 정답"],
        ...
      ],
      ...
    ]
    ```

## 프론트엔드 (JavaScript)

`script.js`에 위치합니다.
대화형 퀴즈 로직을 처리합니다.

### `QuizApp`

UI와 비즈니스 로직을 조율하는 메인 애플리케이션 클래스입니다.

#### 속성 (Properties)

- `data`: PHP에서 전달받은 파싱된 퀴즈 데이터입니다.
- `currentDayData`: 현재 선택된 Day의 질문 배열입니다.
- `currentIndex`: 현재 표시 중인 질문의 인덱스입니다.

#### 주요 메서드 (Key Methods)

- **`loadDay(day, startAtEnd = false)`**: 특정 Day의 질문을 로드합니다. `startAtEnd`는 마지막 질문부터 시작할지 여부를 결정합니다(이전 Day에서 넘어올 때 사용).
- **`sortOptions()`**: Day 목록의 정렬을 처리합니다. 다음 모드를 지원합니다:
  - **Random (랜덤)**: 피셔-예이츠(Fisher-Yates) 알고리즘을 사용하여 목록을 무작위로 섞습니다.
  - **Reverse (거꾸로)**: 목록을 역순으로 정렬합니다.
- **`handleNext()` / `handlePrev()`**: 질문 간 이동을 처리합니다. 첫/마지막 문제에 도달하면 자동으로 이전/다음 Day로 전환합니다.

### `FontSizeManager`

질문과 정답 텍스트의 글자 크기 설정을 관리합니다.

#### 특징 (Features)

- **지속성 (Persistence)**: 사용자의 글자 크기 설정을 `localStorage`에 저장하여 재방문 시에도 유지합니다.
- **범위 (Range)**: 글자 크기를 `1.0rem`에서 `4.0rem` 사이로 제한합니다.
