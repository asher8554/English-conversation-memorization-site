# 영어 회화 암기 도우미

영어 회화 문장 암기를 돕기 위한 심플한 웹 애플리케이션입니다.
매일 반복적인 복습을 통해 문장을 장기 기억에 저장하도록 설계되었습니다.

## 🚀 주요 기능

- **일일 퀴즈**: 날짜별(Day) 영어 회화 문장 퀴즈 제공
- **코스 선택**: 영어회화와 기본동사 학습 코스 전환
- **자동 발음 듣기 (TTS)**: 원어민 발음(미국식)으로 문장 읽어주기 기능
- **다크 모드**: 야간 학습을 위한 눈이 편안한 테마 제공
- **폰트 크기 조절**: 가독성을 위한 글자 크기 사용자 정의
- **복습 통계**: 날짜별 복습 횟수 및 최근 학습 시간 추적

## 🛠 기술 스택

- **프런트엔드.** HTML5, CSS3, JavaScript(별도 프레임워크 없이 사용).
- **저장 방식.** 브라우저 localStorage.

## 📦 설치 및 실행 방법

### 로컬 환경 실행

`data.json`을 `fetch`로 불러오므로 로컬에서는 정적 서버로 실행하는 것을 권장합니다.

```bash
python -m http.server 8000
```

실행 후 브라우저에서 `http://localhost:8000`을 엽니다.
복습 통계와 사용자 설정은 현재 브라우저의 `localStorage`에 저장됩니다.

### 유지보수 검증

코드를 바꾼 뒤에는 아래 명령을 실행합니다.

```bash
npm test
npm run check
```

`npm test`는 Node 내장 테스트 러너로 전체 회귀 테스트를 실행합니다. `npm run check`는 주요 JavaScript 파일의 문법 검사와 `git diff --check` 공백 검사를 함께 실행합니다.

### Notion 데이터 자동 동기화

기본동사 코스는 GitHub Actions workflow로 Notion 원문을 읽어 `data.json`에 반영할 수 있습니다. 브라우저의 Refresh 버튼은 이미 배포된 `data.json` 캐시를 우회하는 기능이며, Notion을 직접 읽거나 GitHub에 커밋하지 않습니다.

GitHub 저장소에 다음 값을 설정합니다.

- Secret. `NOTION_TOKEN`. Notion integration token입니다.
- Variable. `NOTION_PAGE_ID`. 기본동사 Notion 페이지 ID입니다. 생략하면 현재 기본 페이지 ID `32f3d76f88748069b726d6b6d47f5afd`를 사용합니다.
- Actions 설정. 워크플로우 파일이 자체적으로 `permissions: contents: write`를 선언하므로, 저장소 Settings → Actions → Workflow permissions은 더 안전한 기본값인 `Read repository contents`로 유지해도 됩니다.

수동 실행 경로입니다.

```text
GitHub Actions → Sync Notion data → Run workflow
```

로컬에서 미리 확인할 때는 환경 변수를 설정한 뒤 실행합니다.

```powershell
$env:NOTION_TOKEN='secret_...'
$env:NOTION_PAGE_ID='32f3d76f88748069b726d6b6d47f5afd'
node scripts/sync-notion-data.js --dry-run
```

workflow는 6시간마다 한 번 실행되고, `data.json`이 바뀐 경우에만 커밋합니다. Pages 배포 후 사이트에서 Refresh 버튼을 누르면 새로 배포된 JSON을 캐시 없이 다시 요청합니다.

## Android 네이티브 앱.

`android/`는 Kotlin·Jetpack Compose로 구현하는 개인용 APK 프로젝트입니다. WebView를 사용하지 않으며 현재 `data.json`과 Pretendard를 앱에 포함합니다. 지원 범위는 Android 12 이상입니다. 요구사항과 단계별 검증 기준은 [Android 앱 계획](docs/android-app-plan.md)에 기록합니다.

빌드에는 JDK 17 이상과 Android SDK가 필요합니다. `android/local.properties`에 로컬 `sdk.dir`를 지정한 뒤 실행합니다. 이 파일과 빌드 캐시·개인 키는 Git에 포함하지 않습니다.

```powershell
.\android\gradlew.bat -p android :app:testDebugUnitTest :app:assembleDebug
```

테스트용 APK는 `com.asher.englishstudy.debug`를 사용합니다. 화면 테스트는 이 별도 앱의 테스트 기록만 초기화합니다.

```powershell
.\android\gradlew.bat -p android :app:connectedDebugAndroidTest
```

삼성 인터넷에서 기존 학습 사이트의 ⚙️ → 💾 학습 기록 내보내기를 누르면 통계·설정·마지막 완료 챕터가 JSON 파일로 저장됩니다. 앱의 설정 → 브라우저 기록 가져오기에서 해당 파일을 선택하고 미리보기를 확인합니다. 삼성 인터넷의 원본 기록은 삭제하지 않으며, 가져오기 전 앱 기록도 내부 백업으로 보관합니다. 목소리 식별자가 앱의 음성 목록과 다르면 같은 언어의 설치된 오프라인 음성으로 재생하므로 음성 설정에서 다시 확인합니다.

오프라인 음성 재생에는 기기의 한국어·영어 음성 데이터 설치가 필요합니다. 네이티브 앱 구현과 실제 Notion 연결의 검증 상태는 `checklist.md`와 `context-notes.md`를 따릅니다.

## 📝 라이선스

**All rights reserved. 사전 서면 허락 없는 사용을 허용하지 않습니다.**

2026-09-14부터 저작권자 `asher8554`가 소유한 코드와 자료에는 [LICENSE](LICENSE)의 조건이 적용됩니다. 개인·학습·비상업 목적을 포함하여 사용, 실행, 복제, 수정, 배포, 재라이선스, 판매 및 파생물 제작에는 사전 서면 허락이 필요합니다. 위 설치·실행 안내는 저작권자와 허락받은 사용자를 위한 것이며, 사용 권한을 부여하지 않습니다.

기존 MIT 배포분에 대해 적법하게 부여된 권리는 소급 철회하지 않습니다. 제3자 코드·폰트·학습 자료 등에는 각 권리자의 조건이 적용됩니다. GitHub 약관상 공개 저장소 열람·포크와 법률상 허용되는 권리는 이 고지로 제한하지 않습니다.
