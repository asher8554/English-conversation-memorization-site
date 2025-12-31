# English Conversation Memorization Site (영어 회화 암기 사이트)

이 프로젝트는 사용자가 **Day별 영어 회화 문장**을 효과적으로 암기할 수 있도록 돕는 웹 애플리케이션입니다.
Markdown 파일(`content.md`)에 저장된 데이터를 파싱하여 인터랙티브한 퀴즈 형태로 제공합니다.

## ✨ 주요 기능 (Features)

- **Day별 학습**: 드롭다운 메뉴를 통해 원하는 Day의 학습 내용을 선택할 수 있습니다.
- **문장 암기 모드**: 한국어 문장을 보고 영어 문장을 유추한 뒤, 버튼을 눌러 정답을 확인합니다.
- **다크 모드**: 우측 상단의 토글 버튼을 통해 눈이 편안한 다크 모드로 전환할 수 있습니다.
- **다양한 학습 순서**: 기본 순서 외에도 **거꾸로(Reverse)** 및 **랜덤(Random)** 순서로 학습할 수 있습니다.
- **글자 크기 조절**: `+`, `-` 버튼으로 자신에게 맞는 글자 크기를 설정하고 저장할 수 있습니다.
- **간편한 네비게이션**: 'Previous', 'Next' 버튼으로 문장 간 이동이 자유로우며, Day 간 자동 이동도 지원합니다.
- **반응형 디자인**: PC와 모바일 환경 모두에서 깔끔하게 학습할 수 있습니다.

## 🛠️ 설치 및 실행 (Installation & Setup)

### 로컬 환경 (Localhost)

PHP가 설치된 환경에서 다음 명령어로 서버를 실행하세요.

```bash
# 프로젝트 폴더로 이동
cd English-conversation-memorization-site

# 내장 PHP 서버 실행
php -S localhost:8000
```

브라우저에서 `http://localhost:8000`으로 접속합니다.

### 호스팅 서버 (Hosting)

PHP를 지원하는 웹 호스팅 서버(예: Dothome)에 파일들을 업로드합니다.

1. `index.php`, `script.js`, `style.css`, `data.json` 파일을 `html` (또는 `public_html`) 폴더에 업로드합니다.

## 📂 파일 구조 (File Structure)

- `index.php`: `data.json`을 읽어와 HTML 구조를 렌더링하는 메인 파일
- `data.json`: 학습 데이터가 담긴 JSON 파일 (Notion에서 추출된 Day별 데이터)
- `script.js`: 프론트엔드 로직 (퀴즈 기능, 다크 모드, 폰트 관리)
- `style.css`: 전체 스타일링 (다크 모드 변수 포함)

## 📝 라이선스

이 프로젝트는 오픈 소스입니다.

## 📚 Documentation

- [API 및 데이터 포맷](API.md)
- [기여 가이드](CONTRIBUTING.md)
