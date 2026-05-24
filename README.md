# English Conversation Memorization Helper

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

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Storage**: Browser localStorage

## 📦 설치 및 실행 방법

### 로컬 환경 실행

`data.json`을 `fetch`로 불러오므로 로컬에서는 정적 서버로 실행하는 것을 권장합니다.

```bash
python -m http.server 8000
```

실행 후 브라우저에서 `http://localhost:8000`을 엽니다.
복습 통계와 사용자 설정은 현재 브라우저의 `localStorage`에 저장됩니다.

## 📝 라이선스

MIT License
