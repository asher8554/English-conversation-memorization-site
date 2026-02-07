# English Conversation Memorization Helper

영어 회화 문장 암기를 돕기 위한 심플한 웹 애플리케이션입니다.
매일 반복적인 복습을 통해 문장을 장기 기억에 저장하도록 설계되었습니다.

## 🚀 주요 기능

- **일일 퀴즈**: 날짜별(Day) 영어 회화 문장 퀴즈 제공
- **자동 발음 듣기 (TTS)**: 원어민 발음(미국식)으로 문장 읽어주기 기능
- **다크 모드**: 야간 학습을 위한 눈이 편안한 테마 제공
- **폰트 크기 조절**: 가독성을 위한 글자 크기 사용자 정의
- **복습 통계**: 날짜별 복습 횟수 및 최근 학습 시간 추적
- **자동 이메일 리포트**: 매일 아침 학습 진행 상황을 이메일로 자동 발송 (GitHub Actions + Firebase)

## 🛠 기술 스택

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend/DB**: Firebase Realtime Database (학습 기록 동기화)
- **Automation**: Python, GitHub Actions (이메일 발송)

## 📦 설치 및 실행 방법

### 1. 로컬 환경 실행

별도의 서버 설치 없이 브라우저에서 `index.html` 파일을 열면 기본적인 퀴즈 기능을 사용할 수 있습니다.
단, 이메일 리포트 기능을 사용하려면 Firebase 및 GitHub 설정이 필요합니다.

### 2. 이메일 리포트 설정 (선택 사항)

컴퓨터를 켜두지 않아도 **GitHub Actions**가 매일 아침 8시(한국 시간)에 학습 리포트를 이메일로 보내줍니다.

1. **Firebase 프로젝트 생성**:
   - [Firebase Console](https://console.firebase.google.com/)에서 프로젝트 생성
   - Realtime Database 생성 및 규칙 설정 (`read: true, write: true`)
   - `script.js` 파일 내 `firebaseConfig` 객체 업데이트

2. **GitHub 저장소 설정**:
   - 이 코드를 자신의 GitHub 저장소에 Push
   - Settings > Secrets and variables > Actions에 다음 Secret 추가:
     - `EMAIL_USER`: 보내는 사람 이메일 (Gmail 권장)
     - `EMAIL_PASSWORD`: 이메일 앱 비밀번호
     - `EMAIL_TO`: 받는 사람 이메일
     - `FIREBASE_URL`: Firebase Realtime Database URL

## 📝 라이선스

MIT License
