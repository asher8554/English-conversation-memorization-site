# 프로젝트 미사용 요소 점검 노트

## 2026-07-24 Notion 타임아웃 단계적 대응 메모

- 단일 30초 요청 제한은 유지한다. 이번 실패는 재실행에서 정상 완료되어 일시 지연으로 판단했다.
- 직전 두 번이 같은 타임아웃일 때만 세 번째 실행에서 요청 단계 로그와 한 번의 재시도를 켠다.
- 상태는 저장소 커밋 대신 GitHub Actions 캐시에 보관해 `data.json` 이력에 잡음을 만들지 않는다.
- `30066420374` 수동 실행에서 일반 경로가 성공했고 `data.json` 변경 없이 46개 테스트와 검사를 통과했다.

- 2026-05-09: 사용자의 요청은 코드 수정이 아니라 현재 프로젝트의 불필요하거나 사용하지 않는 부분을 파악해 정리하는 것으로 해석했다.
- 2026-05-09: 프로젝트 지침에 따라 점검 진행 상황을 남기기 위해 `checklist.md`와 `context-notes.md`를 새로 만들었다.
- 2026-05-09: 현재 앱 진입점은 `index.html`이며 `script.js`, `style.css`, `data.json`을 직접 사용하는 정적 앱 구조다.
- 2026-05-09: `API.md`는 `index.php`와 내장 JS를 설명하지만 실제 저장소에는 `index.php`가 없고 JS는 `script.js`에 분리되어 있어 최신 구조와 맞지 않는다.
- 2026-05-09: `Utils.php`는 문서에는 설명되어 있지만 현재 코드 참조는 발견되지 않았다. `run_import.php`는 자체 `loadEnv`와 `NotionImporter.php`만 사용한다.
- 2026-05-09: Firebase 설정은 `script.js`에서 placeholder 상태라 현재 기본 실행에서는 클라우드 동기화가 비활성화되고 로컬 스토리지만 사용된다.
- 2026-05-09: CSS 선택자 중 `.card-area`, `.answer-container`, `.checkbox-container`, `.checkbox-wrapper`는 현재 HTML/JS 참조를 찾지 못했다.
- 2026-05-09: `data.json`의 `Day 034`는 카드 수가 0이고 메인 문장이 `abd`라 테스트/임시 데이터로 보인다.
- 2026-05-09: 사용자가 확실한 정리 후보와 조건부 제거 후보를 모두 정리해 달라고 요청했다. 결과적으로 Firebase 클라우드 동기화, 이메일 리포트 자동화, Notion 임포트 도구는 프로젝트 범위에서 제거하는 것으로 결정했다.
- 2026-05-09: 삭제 대상 파일은 `API.md`, `CONTRIBUTING.md.bak`, `Utils.php`, `run_import.php`, `NotionImporter.php`, `send_daily_report.py`, `requirements.txt`, `.github/workflows/daily-report.yml`, `.vscode/settings.json`, 로컬 `.env`다.
- 2026-05-09: 런타임은 `localStorage` 기반 복습 기록만 유지하도록 정리했다. `data.json`에서는 빈 `Day 034` 항목을 제거해 33일, 총 346개 카드가 남았다.
- 2026-05-09: 검증으로 `node --check script.js`, `data.json` 파싱/빈 Day 확인, 제거 대상 키워드 검색, `git diff --check`를 실행했다. `git diff --check`는 줄바꿈 변환 경고만 출력했고 공백 오류는 없었다.
- 2026-05-09: 사용자가 Notion 링크 `https://www.notion.so/100-32f3d76f88748069b726d6b6d47f5afd?source=copy_link`의 기본동사 학습 내용을 사이트에서 선택 실행할 수 있게 요청했다.
- 2026-05-09: 일반 웹 접근은 `publicAccessRole: none`으로 막혀 있었지만 Notion 커넥터로 `김재우 기본동사 100` 페이지를 읽었다.
- 2026-05-09: 커넥터 출력은 긴 본문 중간 일부가 잘려 전체 예문을 확정적으로 자동 변환하기 어렵다. 이번 구현은 Notion에서 확인된 Day별 핵심 문장을 기본동사 코스의 시작 데이터로 넣고, UI와 데이터 구조는 이후 예문 보강이 쉽도록 코스 단위로 확장한다.
- 2026-05-09: `data.json`은 `courses.conversation`과 `courses.basic-verbs`를 갖는 구조로 확장했다. 영어회화 코스는 기존 33일 346카드를 유지하고, 기본동사 코스는 Notion에서 확인한 Day 001~026 핵심 문장 26카드로 시작한다.
- 2026-05-09: 복습 통계 저장 키는 `reviewStats:<courseId>` 형식으로 분리했다. 기존 영어회화 사용자 통계는 `reviewStats` 레거시 키에서 한 번 이어받을 수 있게 유지했다.
- 2026-05-09: 한글 데이터가 깨지지 않도록 `data.json`을 UTF-8 기준으로 재생성했고, 기본동사 코스명과 첫 문장 표시를 확인했다.
- 2026-05-09: GitHub Pages에서 이전 배포본과 브라우저 캐시가 남을 수 있어 `style.css`, `script.js`, `data.json` 요청 버전을 `v=3`으로 올렸다.
- 2026-05-09: 사용자가 기본동사 코스에서 모든 카드에 `Review Complete`가 보이고 Day가 바로 넘어간다고 보고했다. 원인은 진행 로직이 아니라 기본동사 데이터가 Day별 1카드만 들어간 상태라 모든 카드가 마지막 카드로 취급되는 것이다.
- 2026-05-09: Notion fetch에서 본문이 확인된 Day 001~012, 016~025를 핵심 문장과 Model Examples 5개씩 총 6카드로 보강했다. 본문이 잘린 Day 013~015와 빈 템플릿 상태인 Day 026은 한 장짜리 Day가 되지 않도록 기본동사 목록에서 제외했다.
- 2026-05-09: 영어회화 코스는 별도 섹션 구분 없이 Day 배열의 모든 q/a를 순차 카드로 진행한다. 기본동사 Small talk도 같은 Day 배열 뒤에 추가하면 동일한 흐름으로 처리된다.
- 2026-05-09: 기본동사 Day 001~012, 016~025에 Small talk 문장을 추가했다. 대부분 Day는 12카드, Day 012는 Notion 출력에서 확인된 Small talk 4문장을 포함해 10카드이며 전체는 22일 262카드다.
- 2026-05-09: 코스 버튼 active 스타일을 코스별로 분리했다. 영어회화는 흰 배경과 보라색 강조 테두리, 기본동사는 주황색 배경과 흰 글자로 선택 상태를 표시한다.
- 2026-05-09: 비선택 코스 버튼은 코스 색을 유지하지 않고 공통 어두운 회색 배경으로 낮춰 보이게 했다. 선택된 영어회화는 흰색, 선택된 기본동사는 주황색만 유지한다.
- 2026-05-09: Notion 브라우저 화면에서 Day 013~015 토글을 직접 펼쳐 본문을 확인했다. Day 013~015를 추가해 기본동사는 Day 001~025 중 Day 026만 제외한 25일, 총 299카드가 됐다.
- 2026-05-09: 사용자가 지금까지 구현한 코드에서 불필요하거나 문제 있는 부분을 점검하고, 더 간결하게 쓸 수 있는 부분은 리팩토링해 달라고 요청했다. 범위는 최근 추가한 코스 선택, 코스별 통계, 기본동사 데이터 연결부로 본다.
- 2026-05-09: `data.json`이 이미 코스 구조로 고정되어 있어 구형 단일 코스 데이터 호환 함수 `normalizeCourses`를 제거했다. Day 옵션 생성은 `new Option()`으로 줄이고, 빈 Day 목록은 기존 `loadDay('')`의 빈 상태 처리에 맡긴다.
- 2026-05-09: 사용자가 현재 프로젝트를 마지막으로 신중하게 품평하고, 코드 축소 가능성과 이후 개선 기준을 md 문서로 남겨 달라고 요청했다. 이번 작업은 기능 변경보다 판단 기준과 개선 우선순위 문서화가 핵심이다.
- 2026-05-09: 평가 결과 큰 구조 변경은 보류하는 것이 낫다고 판단했다. 즉시 줄일 수 있는 후보는 중복 주석, 미사용 HTML 클래스, 모달 열기/닫기 중복이며, 데이터 동기화 안정화가 다음 개선의 최우선이다.
- 2026-05-09: 사용자가 평가 문서의 우선순위 높음 항목을 모두 적용하고, 중간 항목은 우려점을 설명해 달라고 요청했다. 기능 변경 없이 주석과 미사용 클래스만 정리하는 범위로 진행한다.
- 2026-05-09: 우선순위 높음 항목으로 `script.js`의 중복 음성 목록 주석과 단순 설명성 주석을 줄이고, `index.html`의 미사용 `card`, `card-content` 클래스를 제거했다. 중간 항목은 모달 동작과 TTS 브라우저 차이 때문에 이번 범위에서 제외했다.
- 2026-05-10: 사용자가 현재 프로젝트 코드리뷰와 개선사항 평가를 요청했다. 리뷰 기준은 코드 변경보다 실제 학습 흐름의 깨짐, 데이터 무결성, 접근성, 유지보수 위험을 우선해 확인한다.
- 2026-05-10: `node --check script.js`와 `data.json` 파싱 검증은 통과했다. 브라우저 자동화 도구는 설치되어 있지 않아 실제 화면 검증은 정적 코드와 문서 기준으로 평가했다.
- 2026-05-10: 주요 리뷰 결과는 `README.md`의 로컬 실행 안내와 `fetch('data.json')`의 충돌, 모바일에서 고정 상단 버튼이 콘텐츠를 덮을 가능성, 모달과 아이콘 버튼의 키보드 접근성 부족, `localStorage` JSON 파싱 실패 시 앱이 중단될 수 있는 점이다.

- 2026-05-24: TTS 개선은 외부 API 연동보다 현재 정적 GitHub Pages 구조를 유지하는 Web Speech 안정화가 우선이라고 판단했다. 이번 변경 범위는 음성 목록 로딩과 선택 안정화, 자동 읽기와 속도 설정, 테스트 음성 큐잉, 깨진 localStorage 복구, README 로컬 실행 안내 수정으로 제한한다.
- 2026-05-24: TTS 설정 모달에 자동 읽기 토글과 언어별 속도 슬라이더를 추가했다. 음성 선택 저장은 `voiceURI`를 우선 사용하고, 기존 `koVoiceName`/`enVoiceName` 저장값은 이름으로 찾아 마이그레이션한다. 브라우저에 특정 언어 음성이 없으면 다른 언어 음성을 강제로 쓰지 않고 기본 합성 엔진에 맡긴다.
- 2026-05-24: 첫 페이지 로드에서만 목소리가 다르게 들릴 수 있는 원인은 `getVoices()`가 임시 목록을 반환한 상태에서 첫 자동 재생이 먼저 실행되는 타이밍 문제로 판단했다. 첫 자동 재생은 `voiceschanged` 또는 700ms 안정화 이후로 지연해 선택된 음성 목록이 확정된 뒤 재생하도록 보완했다.
- 2026-05-24: 사용자가 여전히 첫 로드 목소리 차이를 보고했다. 추가 원인은 첫 `voiceschanged`에도 저장된 `voiceURI`가 아직 없을 수 있다는 점이다. 저장된 음성이 있으면 해당 URI가 실제 목록에 나타날 때까지 첫 자동 재생을 더 기다리고, 영구적으로 없을 때만 2.5초 뒤 현재 브라우저 기본 후보로 폴백하도록 바꿨다.
- 2026-05-24: 사용자가 새 창 첫 접속에서만 계속 다른 목소리가 난다고 보고했다. 목록 대기 이후에도 남는 증상이므로 Web Speech 엔진의 콜드 스타트 첫 utterance가 선택 음성을 무시하는 경우로 판단했다. 첫 자동 재생 전에 선택 음성으로 무음 utterance를 한 번 실행하고, 그 종료 후 실제 문장을 읽도록 보완했다.
- 2026-05-24: 사용자가 새로고침 후에도 첫 자동 재생만 설정 음성과 다르고 두 번째부터는 정상이라고 다시 보고했다. 무음 워밍업만으로 부족한 브라우저 콜드 스타트 지연으로 보고, 첫 자동 TTS를 6초 동안 보류한 뒤 음성 목록과 저장 설정을 다시 읽고 무음 워밍업 후 실제 문장을 재생하도록 보강했다.
- 2026-05-24: 사용자가 `script.js?v=13` 배포 후에는 첫 자동 TTS가 잘 나온다고 확인했고, 6초 고정 지연이 없어도 같은 문제가 재현되는지 확인하고 싶다고 요청했다. 실험을 위해 음성 목록 재확인과 무음 워밍업은 유지하되, 첫 자동 TTS 고정 대기값만 0ms로 바꾸고 `script.js?v=14`로 배포한다.
- 2026-05-24: 사용자가 마지막 종합 코드리뷰와 보수를 요청했다. 큰 구조 변경 없이 현재 정적 사이트 구조를 유지하고, 실제 장애 가능성이 큰 TTS 워밍업 종료 이벤트 누락과 브라우저 저장소 접근 실패를 우선 보수 대상으로 정했다.
- 2026-05-24: TTS 무음 워밍업에 1.2초 폴백 타이머를 추가해 Web Speech가 `onend`/`onerror`를 주지 않는 경우에도 첫 실제 문장이 재생되도록 했다. `localStorage` 접근은 안전 헬퍼로 감싸 저장소가 차단된 브라우저에서도 앱 초기화와 복습 카운트가 중단되지 않도록 했다.
- 2026-05-24: 추가 리뷰에서 복습 통계 JSON은 파싱 실패만 방어하고 내부 `count`/`lastReviewed` 값의 형식 오류는 그대로 쓰는 점을 발견했다. 저장소 값이 사용자 브라우저 안의 데이터라도 렌더링과 합산에 쓰이므로 숫자와 날짜 문자열로 정규화하는 보수를 추가한다.

- 2026-06-15: `Further Studies` 추가 요청은 새 섹션의 내용을 기존 문제 카드 흐름에 합치는 작업으로 해석했다. 현재 앱은 `course.data[day]`가 배열이라고 가정하므로, 코스 전환 시 Day 데이터를 정규화하는 작은 레이어를 두는 방식이 가장 좁은 변경이다.
- 2026-06-15: `Further Studies` 제목만 있고 내용이 비어 있는 경우는 추후 입력용 템플릿으로 보고 빈 문제를 만들지 않도록 한다. 기존 배열형 Day 데이터는 변경 없이 같은 카드 수를 유지해야 한다.
- 2026-06-15: `normalizeCourseData` 테스트를 추가해 `Further Studies` 포함, 빈 섹션 무시, 기존 배열형 Day 보존을 검증했다. `node --test`, `node --check script.js`, Edge 기반 브라우저 스모크 테스트가 모두 통과했다.
- 2026-06-15: 사용자가 Notion에는 Day 035까지 있는데 GitHub Pages에는 Day 025까지만 보인다고 보고했다. 라이브 `data.json`과 로컬 `data.json` 모두 `basic-verbs`가 Day 025에서 끝나므로 원인은 배포 지연이 아니라 데이터 누락이다.
- 2026-06-15: Notion `loadPageChunk`와 `syncRecordValues`로 page recordMap을 조회하니 Day 026~035 헤딩과 자식 블록이 존재한다. Day00x는 템플릿이므로 제외하고 Day 026~035만 반영한다.
- 2026-06-15: Day 026~035는 각각 11개 카드로 추출됐고, `basic-verbs`는 총 35일이 됐다. 로컬 브라우저에서 기본동사 선택 시 `기본동사 · 35 Days`, 마지막 옵션 `Day 035 - [Like] I don’t like to play golf, but I have to for my job.`을 확인했다.
- 2026-06-15: 사용자가 `Further Studies`가 여전히 안 보인다고 보고했다. 라이브 Day 001은 12개 카드만 있어 Notion의 Further Studies 문장이 누락되어 있고, 카드별 섹션 라벨도 렌더링하지 않는 것이 원인이다.
- 2026-06-15: Notion에서 Day 001~035를 다시 추출해 각 예문 카드에 `section`을 저장했다. Day 001~012는 실제 `Further Studies` 문장이 있어 포함했고, Day 013~035는 `Further Studies` 내용이 비어 있어 빈 카드를 만들지 않았다. 로컬 Edge 검증에서 Day 001의 13번째 카드가 `Further Studies` 라벨과 함께 표시되고 답변 버튼도 정상 동작함을 확인했다.
- 2026-06-15: GitHub Pages 배포 후 라이브 사이트에서 `script.js?v=19`, `data.json?v=8`, 기본동사 35일, Day 001의 16개 카드와 `Further Studies` 4개 카드가 확인됐다. 라이브 Edge 검증에서도 Day 001의 13번째 카드가 `Further Studies` 라벨과 함께 표시되고 답변이 정상 표시됐다.
- 2026-06-15: 사용자가 한글 텍스트 클릭 시 한글을 다시 읽고 영문 텍스트 클릭 시 영문을 다시 읽도록 요청했다. 현재 구조는 질문이 `questionText`, 답변이 `answerText`에 렌더링되고 자동 TTS만 연결되어 있으므로, `QuizApp`의 텍스트 요소 클릭 핸들러로 수동 재생을 추가하는 것이 가장 작은 변경이다.
- 2026-06-15: 수동 클릭 재생은 자동 읽기 설정과 별개로 동작해야 한다고 판단했다. 자동 읽기 옵션은 카드 전환과 답변 표시 시 자동 재생 여부만 제어하고, 사용자가 직접 텍스트를 누르는 행동은 명시적 재생 의도로 처리한다.
- 2026-06-15: 질문 클릭과 답변 클릭 테스트를 먼저 추가해 구현 전 실패를 확인했다. 이후 `QuizApp`에 `replayQuestion`, `replayAnswer`를 추가하고 각각 `ko-KR`, `en-US`로 `TTSManager.speak`를 호출하도록 했다.
- 2026-06-15: `node --test`, `node --check script.js`, in-app Browser 로컬 검증을 통과했다. 브라우저에서는 `http://127.0.0.1:8019`에서 첫 카드 렌더링, 질문 클릭, Show Answer, 답변 클릭을 확인했고 콘솔 오류는 없었다.

- 2026-06-15: 유지보수성과 실행속도 개선 요청은 전면 ES 모듈 전환보다 현재 GitHub Pages 정적 구조를 유지한 작은 최적화로 처리하기로 했다. `script.js`는 단일 파일이 길지만 빌드 없는 배포와 VM 기반 Node 테스트가 이 파일을 직접 읽고 있으므로 파일 분할은 이번 범위에서 리스크가 크다.
- 2026-06-15: 우선순위는 카드 갱신의 강제 레이아웃 읽기 제거, 정렬 변경 시 중복 렌더링 제거, 코스 데이터 정규화 캐시, TTS 음성 키 조회 캐시, 통계 테이블의 `innerHTML` 제거로 정했다. 이 변경들은 사용자 흐름을 바꾸지 않으면서 반복 작업과 동기 레이아웃 비용을 줄인다.
- 2026-06-15: 강제 레이아웃 읽기 회귀 테스트는 기존 `offsetWidth` 접근에서 `forced layout read`로 실패하는 것을 확인한 뒤 구현했다. 변경 후 `node --test`는 24개 테스트 모두 통과했고 `node --check script.js`도 통과했다.
- 2026-06-15: 로컬 서버 `http://127.0.0.1:8020`에서 Edge Playwright 검증을 수행했다. 영어회화 기본 로드, 기본동사 전환, Day 001 카드 이동, 역순 토글, 통계 테이블 35행 렌더링을 확인했고 콘솔 오류는 없었다.

- 2026-06-15: 사용자가 Refresh Page 버튼 후 `Further Studies`가 안 불러와지는 것 같다고 보고했다. 원격 `data.json?v=8`에는 `Further Studies` 문자열이 63개 포함되어 있었지만 GitHub Pages 응답 헤더가 `Cache-Control: max-age=600`이라 같은 `data.json?v=8` URL을 계속 fetch하면 배포 직후 최대 10분 동안 예전 캐시를 볼 수 있다.
- 2026-06-15: 현재 Refresh 버튼은 `window.location.reload()`만 실행하므로 HTML은 새로고침해도 `script.js`의 `fetch('data.json?v=8')` 캐시 키가 바뀌지 않는다. 해결은 버튼 클릭 시 페이지 URL에 `refresh=<timestamp>`를 붙이고, 데이터 fetch URL에도 같은 refresh 토큰을 붙여 새 데이터 요청을 강제하는 방식으로 정했다.
- 2026-06-15: `DATA_VERSION`을 9로 올리고 `buildDataUrl`, `buildRefreshUrl` helper를 추가했다. Edge 로컬 검증에서 Refresh 클릭 후 페이지 URL은 `?refresh=...`로 바뀌었고 데이터 요청은 `data.json?v=9` 다음 `data.json?v=9&refresh=...`로 수행되었다. 같은 검증에서 기본동사 Day 001의 `Further Studies` 카드가 표시되었고 콘솔 오류는 없었다.

- 2026-06-15: 사용자가 Notion에는 Day 026까지 `Further Studies`를 작성했지만 페이지에는 확인되지 않는다고 보고했다. 로컬 `data.json` 기준 기본동사 `Further Studies`는 Day 001~012까지만 존재했고, Day 013~026에는 section 값이 없었다.
- 2026-06-15: Notion MCP fetch와 `loadPageChunk` 직접 조회로 `김재우 기본동사 100` 페이지의 Day 013~026 블록이 존재함을 확인했다. `loadPageChunk`는 상위 Day 블록까지만 내려주므로 하위 컬럼 문장 추출에는 child block ID를 대상으로 `syncRecordValues`를 재귀 호출해야 한다.
- 2026-06-15: Notion에서 Day 013~026 `Further Studies`를 각각 4, 4, 4, 3, 6, 5, 7, 4, 5, 4, 5, 6, 5, 5개 문장쌍으로 추출해 `data.json`에 반영했다. 원본에 `This weather is os weird.`, `for yen years!`처럼 보이는 오타가 있었지만 이번 작업은 원본 동기화라 임의 수정하지 않았다.
- 2026-06-15: `DATA_VERSION`을 10, `script.js` 쿼리 버전을 21로 올렸다. `node --test`는 27개 테스트 모두 통과했고, 로컬 Edge 검증에서 `Day 026`의 첫 `Further Studies` 카드 `꾸준히 연습하면 훌륭한 음악가가 될 거야.`가 표시되었으며 콘솔 오류는 없었다.
- 2026-06-15: 커밋 `5220a87`을 `main`에 fast-forward 병합하고 GitHub Pages 배포 `27554640218` 성공을 확인했다. 라이브 사이트는 `script.js?v=21`과 `data.json?v=10&refresh=day026-ui-check`를 사용했고, Edge 검증에서 기본동사 Day 026의 `Further Studies` 첫 카드가 정상 표시됐으며 콘솔 오류와 실패 요청은 없었다.

- 2026-06-16: 프로젝트 하드닝 작업은 `codex/project-hardening-docs` 브랜치에서 시작했다. 기준 검증은 `node --test` 27개 통과와 `node --check script.js` 종료 코드 0으로 확인했다.
- 2026-06-16: 범위는 좁게 잡았다. 정적 GitHub Pages 구조와 단일 `script.js` 런타임은 유지하고, 실제로 확인된 데이터 로딩 실패 화면의 동적 `innerHTML` 경로만 고쳤다.
- 2026-06-16: `data.json`은 변경하지 않았으므로 `DATA_VERSION`은 `10`으로 유지했다. `script.js`가 바뀌었기 때문에 `index.html`의 스크립트 쿼리만 `v=21`에서 `v=22`로 올렸다.
- 2026-06-16: `renderLoadFailure is not a function`으로 실패하는 회귀 테스트를 먼저 추가한 뒤, DOM 노드와 `textContent` 기반 `renderLoadFailure`를 구현했다. 구현 후 `node --test tests\quiz-data-normalization.test.js`는 6개 테스트를 통과했다.
- 2026-06-16: 전체 검증은 `node --test` 28개 통과, `node --check script.js` 종료 코드 0, `git diff --check` 종료 코드 0으로 확인했다. Edge 브라우저 검증에서는 `script.js?v=22`, 기본동사 35개 Day 옵션, 답변 표시, 강제 `data.json` 실패 화면의 텍스트 렌더링을 확인했다.
- 2026-06-16: 보안 검토에서는 데이터 로딩 실패 화면의 동적 `innerHTML` 삽입을 수정 완료로 기록했다. 남은 `innerHTML = ''`는 초기화 전용 fallback으로 확인했고, 통계 표 `textContent`, 인코딩된 refresh 전달, `.github` 워크플로우 없음, 패키지 의존성 표면 없음, 구체적 비밀값 형식 미발견, `.env` 무추적을 확인했다.
- 2026-06-16: 스킬에 한글 문서 규칙이 추가된 뒤 기존 hardening 산출물을 다시 점검했다. `plan.md`와 `docs/project-hardening-report.md`가 영어였고 보고서 일부에 깨진 한글 문자열이 있어, 코드 변경 없이 사용자-facing 문서만 한글로 다시 작성하기로 했다.
- 2026-06-16: `docs/project-hardening-report.docx`와 `docs/project-hardening-report.pdf`를 한글 본문 기준으로 다시 생성했다. PDF는 맑은 고딕 글꼴을 등록해 4쪽짜리 보고서로 만들었다.
- 2026-06-16: Markdown, DOCX 표 셀 포함 전체 텍스트, PDF 추출 텍스트에서 필수 섹션과 깨진 한글 패턴을 검사했고 문제가 없었다. `soffice`와 `pdftoppm`이 없어 DOCX/PDF 렌더 기반 시각 검증은 수행하지 못했고, 텍스트 추출과 구조 검증으로 대체했다.
- 2026-06-16: 문서 보정 후 `node --test`는 28개 테스트 모두 통과했고, `node --check script.js`와 `git diff --check`도 종료 코드 0으로 끝났다.

- 2026-06-16: 사용자가 선택한 2번 개선은 Notion 원문을 읽어 `data.json`을 갱신하고 GitHub Pages에 보이게 하는 자동화로 해석했다. 현재 Refresh 버튼은 `?refresh=<timestamp>`를 붙여 배포된 JSON 캐시만 우회하며 Notion이나 GitHub API를 호출하지 않는다.
- 2026-06-16: 정적 GitHub Pages에서 Notion 토큰과 GitHub 쓰기 권한을 브라우저에 넣으면 토큰이 노출되므로, 자동 동기화는 GitHub Actions에서 수행해야 한다고 결정했다. Refresh 버튼은 새 배포본을 다시 불러오는 역할로 남긴다.
- 2026-06-16: Notion 공식 API는 페이지 내용을 block children endpoint로 읽고, 자식 블록은 필요하면 재귀적으로 다시 조회해야 한다. 이전 작업 메모와도 일치하게 `Further Studies`의 column list 하위 블록까지 읽는 방향으로 스크립트를 설계한다.
- 2026-06-16: `scripts/sync-notion-data.js`는 Notion block tree에서 Day 블록, `Model Examples`, `Small talk`, `Further Studies` 섹션과 column list 문장쌍을 추출해 `courses.basic-verbs`만 갱신한다. `Day00x`와 빈 문장쌍은 제외한다.
- 2026-06-16: `.github/workflows/sync-notion-data.yml`은 수동 실행과 6시간 주기 실행을 지원한다. `NOTION_TOKEN` secret이 없으면 실패하고, 변경된 `data.json`이 있을 때만 `github-actions[bot]` 커밋을 만든다.
- 2026-06-16: 검증은 `node --test` 32개 통과, `node --check script.js`, `node --check scripts\sync-notion-data.js`, `node --check tests\notion-sync.test.js`, `git diff --check` 종료 코드 0으로 확인했다. 실제 Notion API 호출은 이 환경에 `NOTION_TOKEN`이 없어 실행하지 못했고, 토큰 누락 시 명확히 실패하는 것은 확인했다.
- 2026-06-16: GitHub Actions 수동 실행 `27587692020`은 `NOTION_TOKEN` 존재 검증까지 통과했지만, Notion API가 `object_not_found`를 반환했다. 원인은 `NOTION_PAGE_ID` 페이지가 integration `asher`와 공유되지 않은 상태로 판단했고, 같은 실패가 다시 나도 해결 방법이 바로 보이도록 오류 메시지를 보강했다.
- 2026-06-16: 사용자가 Notion integration 연결을 완료한 뒤 수동 실행 `27587889860`을 다시 돌렸고, 이번에는 Notion 조회 단계가 성공했다. 실패 지점은 테스트 단계였으며, 동기화 스크립트가 실제 Notion 구조의 섹션 라벨을 읽지 못해 `basic-verbs.data`를 비운 것이 원인이다.
- 2026-06-16: 실제 Notion 페이지는 Day 토글 아래에서 `[Model Examples]`, `[Small talk]`, `[Further Studies]` 라벨이 별도 형제 문단이 아니라 각 컬럼 리스트의 첫 왼쪽 셀에 들어간다. 파서는 이 컬럼 내부 라벨을 섹션 시작으로 인식하고, 빈 기본동사 데이터가 만들어지면 커밋 전에 실패하도록 보정한다.

- 2026-06-19: 사용자가 현재까지 구현된 프로그램의 보완점과 유지보수 우려를 상세히 점검하고, 고칠 수 있는 문제는 직접 고쳐 달라고 요청했다. 이번 점검은 정적 앱 구조를 유지하면서 실행 진입점, 접근성 계약, Notion 동기화 CLI 오류 메시지처럼 회귀 위험이 낮고 유지보수 효익이 분명한 항목을 우선한다.
- 2026-06-19: 기준선으로 `node --test` 35개 통과, `node --check script.js`, `node --check scripts\sync-notion-data.js` 종료 코드 0을 확인했다. 한글 파일은 PowerShell 기본 출력에서 깨져 보일 수 있으나 `python -X utf8`로 읽으면 UTF-8 본문과 이모지가 정상이고 replacement character는 없었다.
- 2026-06-19: 구조적 우려로는 단일 `script.js`가 1,400줄을 넘는 점, Notion block tree 파서가 실제 페이지 구조에 강하게 결합된 점, 브라우저 Web Speech API가 환경별 차이를 갖는 점이 남아 있다. 이번 변경에서는 큰 모듈 분리는 사용자 흐름과 테스트 표면을 크게 흔들 수 있어 보류한다.
- 2026-06-19: 접근성 보완은 아이콘 버튼의 명시적 `aria-label`과 `type="button"`, 코스 버튼의 초기 `aria-pressed`, 설정과 통계 모달의 dialog 속성 및 닫기 버튼 전환으로 제한했다. 모달 열기와 닫기에서는 `aria-hidden`을 함께 갱신한다.
- 2026-06-19: Notion CLI는 `--data` 뒤에 경로가 없거나 다음 값이 다른 옵션이면 `--data 인자에는 파일 경로가 필요합니다.`로 실패하게 했다. 이 오류는 `NOTION_TOKEN` 검사보다 먼저 발생해 사용자가 실제 잘못 입력한 인자를 바로 볼 수 있다.
- 2026-06-19: 검증은 `npm test` 41개 통과, `npm run check` 종료 코드 0으로 확인했다. 브라우저 스모크는 `%TEMP%\codex-playwright-smoke-english-site`에 임시 Playwright를 설치해 Edge 채널로 실행했고, 영어회화 33 Days, 기본동사 35 Days, 답변 표시, 설정과 통계 모달 `aria-hidden` 전환, 콘솔 오류 없음, 실패 요청 없음까지 확인했다.

- 2026-06-22: 사용자가 Notion에 Day 039까지 작성하고 사이트 Update/Refresh와 GitHub Actions 수동 실행을 했지만 반영되지 않는다고 보고했다. 현재 live `data.json?refresh=...`와 로컬 `data.json`은 모두 기본동사 35 Days, 마지막 Day 035였다.
- 2026-06-22: 최근 실패 run `27930877394`, `27925213050`, `27924224416`은 모두 `Sync data from Notion` 단계가 성공해 `data.json`을 갱신했지만, 그 다음 `Run tests` 단계에서 실패해 커밋 단계가 skip되었다. 최신 로그의 실제 실패는 `tests/basic-verbs-data.test.js:19`에서 actual `Day 039`, expected `Day 035`였다.
- 2026-06-22: root cause는 Notion 파서나 인증 문제가 아니라 데이터 성장에 취약한 테스트 하드코딩이다. 테스트는 최소 보장 범위인 Day 026~035와 빈 템플릿 제거를 검증하되, Day 036 이후 새 콘텐츠는 정상 확장으로 허용해야 한다.
- 2026-06-22: `tests/basic-verbs-data.test.js`는 마지막 Day가 35 이상인지 확인하고, Day 026부터 현재 마지막 Day까지 배열, 카드, 메인 문장이 모두 채워졌는지 확인하도록 바꿨다. 특정 Day 027에 `Further Studies`가 없어야 한다는 콘텐츠 고정도 제거하고, 전체 기본동사 카드에 빈 q/a가 없는지 검증하도록 바꿨다.
- 2026-06-22: 로컬 검증은 `node --test tests\basic-verbs-data.test.js`, `npm test`, `npm run check`로 실행했고 모두 종료 코드 0이었다. 현재 로컬 데이터는 아직 Day 035까지라, 실제 Day 039 반영 여부는 main push 후 `Sync Notion data` 재실행으로 확인해야 한다.
- 2026-06-22: 수정 커밋을 `main`에 fast-forward 병합하고 push한 뒤 수동 실행 `27945837355`를 시작했다. 해당 실행은 `Sync data from Notion` 단계에서 장시간 진행 중이며, 스크립트의 Notion `fetch` 호출에 명시적 타임아웃이 없어 API 응답 지연이 Actions 전체를 오래 붙잡을 수 있음을 추가 위험으로 확인했다.
- 2026-06-22: 수동 실행 `27945837355`는 2분 53초 만에 성공했고, `fb1349d data: sync basic verbs from Notion` 커밋으로 `data.json`이 갱신되었다. 로컬과 live `data.json?refresh=...` 모두 기본동사 39일, 마지막 `Day 039`, 마지막 Day 20카드, 마지막 핵심 문장 `[Work] : Dating doesn’t work that way anymore. Times have changed.`로 확인했다.
- 2026-06-22: 추가 보수로 Notion API 단일 요청에 기본 30초 타임아웃을 추가하고, workflow의 `Sync data from Notion` 단계에는 10분 제한을 추가했다. 이는 오늘 실패의 직접 원인은 아니지만, Notion API 응답 지연이 다음 운영 장애에서 긴 무응답으로 보이지 않게 하기 위한 방어다.

## 2026-07-06 기본동사 카드 중복 검증 메모

- 사용자가 제공한 스크린샷 기준으로 첫 카드는 Day 001 `[Have] : Do you have any pets?`의 `내 조카는 거북이를 키운다.`이고, Next 후에도 `Model Examples` 라벨과 같은 한국어가 다시 보입니다.
- 우선 원인을 데이터와 렌더링으로 분리합니다. 같은 Day 안에 동일한 q가 여러 카드에 들어 있으면 데이터 문제이고, 서로 다른 q가 있는데 화면만 반복되면 렌더링 문제입니다.
- 이 저장소는 GitHub Pages 정적 앱이고 `data.json?v=10` 캐시 전략을 사용합니다. 데이터 변경이 있으면 live 반영을 위해 `DATA_VERSION` 또는 배포 흐름도 확인해야 합니다.
- 2026-07-06 재확인 결과 live `data.json`은 아직 Day 001의 1번 카드가 섹션 없는 중복이고, 로컬 수정본은 1번과 2번 카드가 서로 다른 `Model Examples`입니다. 사용자가 본 화면은 수정 전 live 배포본이 맞습니다.
# 2026-08-23 글래스모피즘 디자인 및 Pretendard 적용

- 기존 정적 HTML/CSS 구조를 유지하고 `style.css` 중심으로 수정한다.
- Pretendard는 별도 패키지 설치 없이 jsDelivr의 정적 CSS를 `index.html`에서 로드한다.
- 기존 다크 모드와 버튼 동작은 유지하며, 반투명 패널·얇은 테두리·배경 블러를 공통 토큰으로 통일한다.
- 디자인 변경 후 `npm test`, `npm run check`, `git diff --check`를 실행한다.
- `npm test`는 46개 전부 통과했고 `npm run check`와 `git diff --check`도 통과했다.
- 환경에 Playwright/agent-browser가 없어 자동 스크린샷 검증은 생략했다.
