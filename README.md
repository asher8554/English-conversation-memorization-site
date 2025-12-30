# English Conversation Memorization Site (영어 회화 암기 사이트)

이 프로젝트는 사용자가 **Day별 영어 회화 문장**을 효과적으로 암기할 수 있도록 돕는 웹 애플리케이션입니다.
Markdown 파일(`content.md`)에 저장된 데이터를 파싱하여 인터랙티브한 퀴즈 형태로 제공합니다.

## ✨ 주요 기능 (Features)

- **Day별 학습**: 드롭다운 메뉴를 통해 원하는 Day의 학습 내용을 선택할 수 있습니다.
- **문장 암기 모드**: 한국어 문장을 보고 영어 문장을 유추한 뒤, 버튼을 눌러 정답을 확인합니다.
- **간편한 네비게이션**: 'Previous', 'Next' 버튼으로 문장 간 이동이 자유롭습니다.
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

1. `index.php`, `script.js`, `style.css`, `content.md` 파일을 `html` (또는 `public_html`) 폴더에 업로드합니다.
2. **주의**: `content.md` 파일명이 정확히 소문자인지 확인하세요.

## ⚠️ 트러블슈팅 (Troubleshooting)

### "Error: content.md not found" 오류가 발생할 때

서버(특히 리눅스 환경)는 **대소문자를 엄격하게 구분**합니다.

- **확인 1**: 파일명이 `Content.md`가 아닌 `content.md`인지 확인하세요.
- **확인 2**: `index.php`와 같은 폴더에 있는지 확인하세요.
- **확인 3**: 파일 권한이 읽기 가능(644)으로 설정되어 있는지 확인하세요.

## 📂 파일 구조 (File Structure)

- `index.php`: `content.md`를 파싱하고 HTML 구조를 렌더링하는 메인 파일
- `src/Parser.php`: `content.md` 파싱 및 마크다운 변환 로직 처리
- `content.md`: 학습 데이터가 담긴 마크다운 파일 (형식: `## Day...` > `한국어` > `영어`)
- `script.js`: 프론트엔드 로직 (퀴즈 인터랙티브 기능)
- `style.css`: 전체 스타일링

## 📝 라이선스

This project is open source.

## 📚 Documentation

- [API & Data Format](API.md)
- [Contributing Guide](CONTRIBUTING.md)
