# 프로젝트 하드닝 문서 보정 계획

> 에이전트 작업자용 메모. 이 계획은 `project-hardening-docs` 스킬을 적용해 기존 하드닝 결과물을 한글 문서 기준에 맞게 보정하는 절차입니다. 작업 상태는 체크박스로 추적합니다.

**목표.** 기존 하드닝 코드 변경은 유지하고, 사용자-facing 문서와 Word/PDF 보고서를 한글로 재작성하며 한글 깨짐이 없는지 검증합니다.

**아키텍처.** 사이트 구조는 기존 정적 GitHub Pages 구조를 유지합니다. `index.html`, `style.css`, `script.js`, `data.json`이 런타임 표면이고, 이번 작업은 문서 산출물과 검증 기록만 다룹니다.

**기술 스택.** HTML, CSS, Vanilla JavaScript, `data.json`, 브라우저 `localStorage`, Web Speech API, Node 내장 테스트 러너, Python 기반 DOCX/PDF 생성 도구.

---

### 작업 1. 현재 상태 확인

**파일.**
- 확인. `plan.md`
- 확인. `docs/project-hardening-report.md`
- 확인. `docs/project-hardening-report.docx`
- 확인. `docs/project-hardening-report.pdf`

- [x] **1단계. 현재 브랜치와 작업 트리를 확인합니다.**

실행 명령.

```powershell
git status --short --branch
```

기대 결과.

```text
## codex/project-hardening-docs
```

- [x] **2단계. 기존 문서의 언어와 깨짐 상태를 확인합니다.**

확인 기준.

```text
사용자-facing 문서는 한글이어야 합니다.
완료 보고서에는 깨진 한글, mojibake, 대체 문자, 누락 글리프가 없어야 합니다.
기존 코드 하드닝 결과는 유지합니다.
```

### 작업 2. 한글 문서로 재작성

**파일.**
- 수정. `plan.md`
- 수정. `checklist.md`
- 수정. `context-notes.md`
- 수정. `docs/project-hardening-report.md`

- [x] **1단계. 계획서를 한글로 교체합니다.**

검증 기준.

```text
계획의 목표, 범위, 검증 기준이 한글로 읽힙니다.
영어 보고서 문장이나 깨진 한글 문자열이 남지 않습니다.
```

- [x] **2단계. 작업 로그를 한글로 갱신합니다.**

검증 기준.

```text
이번 보정 작업의 결정과 검증 기준이 checklist.md와 context-notes.md에 한글로 남습니다.
```

- [x] **3단계. 하드닝 보고서 Markdown을 한글로 재작성합니다.**

포함할 내용.

```text
프로젝트 목적
모듈 지도
실행과 테스트 명령
핵심 사용자 흐름
보안 검토 결과
성능 메모
남은 위험
Mermaid 아키텍처 다이어그램
읽기용 대체 흐름 표
```

### 작업 3. Word/PDF 산출물 재생성

**파일.**
- 수정. `docs/project-hardening-report.docx`
- 수정. `docs/project-hardening-report.pdf`

- [x] **1단계. 한글 Word 문서를 재생성합니다.**

문서 프리셋.

```text
standard_business_brief
본문 기본 글꼴은 맑은 고딕 계열을 우선합니다.
표는 실제 비교와 상태 요약에만 사용합니다.
```

- [x] **2단계. 한글 PDF 문서를 재생성합니다.**

검증 기준.

```text
PDF에서 주요 섹션 텍스트가 추출됩니다.
추출 텍스트에 깨진 한글 또는 대체 문자가 없어야 합니다.
```

### 작업 4. 검증

**파일.**
- 테스트. `tests/*.test.js`
- 확인. `script.js`
- 확인. `docs/project-hardening-report.md`
- 확인. `docs/project-hardening-report.docx`
- 확인. `docs/project-hardening-report.pdf`

- [x] **1단계. 코드 회귀 검증을 실행합니다.**

실행 명령.

```powershell
node --test
node --check script.js
git diff --check
```

기대 결과.

```text
모든 명령이 종료 코드 0으로 끝납니다.
```

- [x] **2단계. 문서 구조와 한글 깨짐을 검증합니다.**

검증 기준.

```text
Markdown, DOCX, PDF에 필수 섹션이 존재합니다.
깨진 한글, mojibake, 대체 문자, 누락 글리프가 없어야 합니다.
LibreOffice 또는 Poppler가 없으면 렌더 기반 시각 검증 한계를 기록합니다.
```

### 작업 5. 커밋

**파일.**
- 수정. 문서 산출물과 작업 로그.

- [x] **1단계. 변경 사항을 하나의 논리 커밋으로 기록합니다.**

실행 명령.

```powershell
git status --short
git add plan.md checklist.md context-notes.md docs/project-hardening-report.md docs/project-hardening-report.docx docs/project-hardening-report.pdf
git commit -m "docs: translate hardening report to Korean"
```

---

# Notion 데이터 자동 동기화 계획

**목표.** Notion 원문을 사람이 수동으로 복사하지 않아도 GitHub Actions가 `data.json`을 갱신하고, GitHub Pages가 새 학습 데이터를 배포할 수 있게 합니다.

**보안 경계.** 정적 GitHub Pages 버튼은 Notion 토큰이나 GitHub 쓰기 토큰을 안전하게 보관할 수 없습니다. 따라서 브라우저의 Refresh 버튼은 배포된 데이터를 다시 불러오는 역할로 유지하고, Notion 원문 조회와 커밋은 GitHub Actions에서만 수행합니다.

**성공 기준.**

- Notion API 토큰은 GitHub Actions secret `NOTION_TOKEN`으로만 사용합니다.
- 기본동사 Notion 페이지 ID는 GitHub Actions variable `NOTION_PAGE_ID` 또는 기본 페이지 ID로 공급합니다.
- 동기화 스크립트는 `data.json`의 `courses.basic-verbs`만 재생성하고 영어회화 코스는 보존합니다.
- 빈 `Further Studies`와 `Day00x` 템플릿은 배포 데이터에 넣지 않습니다.
- 스크립트 변환 로직은 fixture 기반 Node 테스트로 검증합니다.
- 변경이 있을 때만 workflow가 커밋합니다.

## 작업 목록

- [x] 현재 Refresh 버튼이 캐시 우회만 수행한다는 사실을 확인합니다.
- [x] Notion 자동 조회는 GitHub Actions로 분리하는 구조를 확정합니다.
- [x] Notion block tree를 기본동사 코스 데이터로 바꾸는 Node 스크립트를 추가합니다.
- [x] GitHub Actions workflow를 추가합니다.
- [x] README에 secret/variable 설정과 실행 방법을 적습니다.
- [x] 테스트와 문법 검사를 통과시킨 뒤 커밋합니다.
