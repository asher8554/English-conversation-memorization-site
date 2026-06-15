# Further Studies 문제 포함 계획

## 목표

`data.json`에 `Further Studies` 섹션이 추가되어도 해당 문장을 일반 문제 카드처럼 풀 수 있게 한다.

## 가정

- 기존 `Day` 값이 배열인 데이터 구조는 그대로 유지한다.
- 새 데이터는 `Day` 값이 섹션 객체가 될 수 있으며, `Further Studies`는 그 안의 배열이나 빈 값으로 들어올 수 있다.
- `Further Studies` 제목만 있고 내용이 비어 있으면 빈 문제를 만들지 않는다.

## 작업

1. 섹션형 Day 데이터에서 `Further Studies`가 카드 목록에 합쳐지는 테스트를 추가한다.
2. 빈 `Further Studies` 섹션이 빈 문제를 만들지 않는 테스트를 추가한다.
3. `QuizApp`이 코스 전환 시 Day 데이터를 정규화하도록 구현한다.
4. 기존 테스트와 문법 검사를 실행한다.

## 검증

- `node --test tests/quiz-data-normalization.test.js`.
- `node --test`.
- `node --check script.js`.
