# 프로젝트 미사용 요소 점검 노트

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
