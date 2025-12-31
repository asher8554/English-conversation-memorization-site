# API 레퍼런스

이 문서는 영어 회화 암기 사이트의 내부 구조와 주요 클래스를 설명합니다.

## 백엔드 (데이터 소스)

### `data.json`

루트 디렉토리에 위치합니다.
Notion에서 추출된 구조화된 퀴즈 데이터를 포함합니다.

#### 구조 (Structure)

Day 객체들의 배열입니다.

```json
[
  {
    "Day": "Day001",
    "MainSentence": "Working from home isn’t for me.",
    "ModelExamples": [
      {
        "ko": "저는 재택근무 체질이 아니에요. 늘 딴짓하게 되거든요.",
        "en": "Working from home isn’t for me.  I always get distracted."
      }
    ],
    "SmallTalk": [
       {
        "ko": "질문...",
        "en": "Answer..."
      }
    ]
  },
  ...
]
```

## 프론트엔드 (JavaScript)

`script.js`에 위치합니다.
대화형 퀴즈 로직을 처리합니다.

### `QuizApp`

UI와 로직을 조율하는 메인 애플리케이션 클래스입니다.

#### 속성 (Properties)

- `data`: PHP에서 전달된 파싱된 퀴즈 데이터입니다.
- `currentDayData`: 현재 선택된 Day의 질문 배열입니다.
- `currentIndex`: 현재 표시되고 있는 질문의 인덱스입니다.

#### 주요 메서드 (Key Methods)

- **`loadDay(day, startAtEnd = false)`**: 지정된 Day의 질문을 로드합니다. `startAtEnd`는 첫 번째 질문부터 시작할지 마지막 질문부터 시작할지를 결정합니다 (뒤로 가기 네비게이션에 유용).
- **`sortOptions()`**: Day 옵션 정렬을 처리합니다. 다음을 지원합니다:
  - **Reverse (거꾸로)**: Day 순서를 반대로 뒤집습니다.
  - **Random (무작위)**: Fisher-Yates 알고리즘을 사용하여 Day 순서를 무작위로 섞습니다.
- **`handleNext()` / `handlePrev()`**: 질문 간의 이동을 처리합니다. 경계에 도달하면 자동으로 다음/이전 Day로 전환합니다.

### `FontSizeManager`

질문 및 정답 텍스트의 글자 크기 설정을 관리합니다.

#### 기능 (Features)

- **영구 저장 (Persistence)**: 사용자의 글자 크기 설정을 `localStorage`에 저장합니다.
- **범위 (Range)**: 글자 크기를 `1.0rem`에서 `4.0rem` 사이로 제한합니다.

### `DarkModeManager`

다크 모드 테마를 관리합니다.

#### 기능 (Features)

- **전환 (Toggling)**: 라이트 모드와 다크 모드 간을 전환합니다.
- **영구 저장 (Persistence)**: 사용자의 설정을 `localStorage`의 `useDarkMode` 키에 저장합니다.
- **UI 업데이트 (UI Update)**: `<body>` 요소에 `.dark-mode` 클래스를 토글하고 버튼 아이콘(🌙 / ☀️)을 업데이트합니다.
