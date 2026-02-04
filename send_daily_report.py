"""
매일 학습 리포트를 생성하고 이메일로 발송하는 스크립트입니다.
Firebase Realtime Database에서 학습 현황을 조회하여 요약 리포트를 생성합니다.
"""

import json
import smtplib
import os
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import Dict, Any, Union
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

def load_json(filename: str) -> Dict[str, Any]:
    """
    로컬 JSON 파일을 읽어 딕셔너리로 반환합니다.

    Args:
        filename (str): 파일 경로

    Returns:
        Dict[str, Any]: JSON 데이터
    """
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return {}
    except Exception as e:
        print(f"Error loading {filename}: {e}")
        return {}

def fetch_progress_from_firebase() -> Dict[str, Any]:
    """
    Firebase Realtime Database에서 학습 기록을 가져옵니다.

    Returns:
        Dict[str, Any]: 학습 기록 데이터
    """
    # GitHub Secrets 또는 .env에서 URL 가져오기
    firebase_url = os.getenv('FIREBASE_URL') 
    
    if not firebase_url:
        print("경고: FIREBASE_URL이 설정되지 않았습니다. 로컬 progress.json을 확인합니다.")
        return load_json('progress.json')

    # REST API URL 생성
    if not firebase_url.endswith('/'):
        firebase_url += '/'
    
    url = f"{firebase_url}reviews.json"

    try:
        response = requests.get(url, timeout=10) # 타임아웃 설정으로 최적화
        if response.status_code == 200:
            data = response.json()
            return data if data else {}
        else:
            print(f"Firebase 데이터 가져오기 실패: {response.status_code} {response.text}")
            return {}
    except Exception as e:
        print(f"Firebase 연결 오류: {e}")
        return {}

def generate_report(progress_data: Dict[str, Any], content_data: Dict[str, Any]) -> str:
    """
    학습 데이터를 기반으로 HTML 리포트를 생성합니다.

    Args:
        progress_data: 학습 진도 데이터
        content_data: 학습 콘텐츠 데이터

    Returns:
        str: HTML 형식의 리포트 문자열
    """
    if not progress_data:
        return "아직 복습 기록이 없습니다. 학습을 시작해보세요!"

    report_lines = []
    report_lines.append(f"<h2>📅 Daily Review Report ({datetime.now().strftime('%Y-%m-%d')})</h2>")
    report_lines.append("<ul>")

    total_reviews = 0
    sorted_days = sorted(progress_data.keys())

    for day in sorted_days:
        stats = progress_data[day]
        count = stats.get('count', 0)
        last_reviewed = stats.get('lastReviewed', 'Never')
        
        # 날짜 포맷팅
        if last_reviewed != 'Never':
            try:
                # ISO 형식 시간 파싱
                dt = datetime.fromisoformat(last_reviewed.replace('Z', '+00:00'))
                last_reviewed = dt.strftime('%Y-%m-%d %H:%M')
            except ValueError:
                pass

        # 해당 Day의 메인 문장 가져오기
        main_sentence = ""
        if 'dayMainSentences' in content_data and day in content_data['dayMainSentences']:
            main_sentence = f"- <i>{content_data['dayMainSentences'][day]}</i>"
        
        report_lines.append(f"<li><b>{day}</b>: {count}회 복습 (최근: {last_reviewed}) {main_sentence}</li>")
        total_reviews += count

    report_lines.append("</ul>")
    report_lines.append(f"<p><b>Total Reviews:</b> {total_reviews}</p>")
    report_lines.append("<p>Keep up the good work! 화이팅! 💪</p>")
    
    return "".join(report_lines)

def send_email(subject: str, body: str) -> None:
    """
    SMTP를 사용하여 이메일을 발송합니다.

    Args:
        subject (str): 이메일 제목
        body (str): 이메일 본문 (HTML)
    """
    # 환경 변수에서 설정 가져오기
    email_host = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
    email_port = int(os.getenv('EMAIL_PORT', 587))
    email_user = os.getenv('EMAIL_USER')
    email_password = os.getenv('EMAIL_PASSWORD')
    email_to = os.getenv('EMAIL_TO')

    if not email_user or not email_password or not email_to:
        print("오류: 이메일 설정이 누락되었습니다. .env 파일 또는 GitHub Secrets를 확인하세요.")
        return

    msg = MIMEMultipart()
    msg['From'] = email_user
    msg['To'] = email_to
    msg['Subject'] = subject

    msg.attach(MIMEText(body, 'html'))

    try:
        server = smtplib.SMTP(email_host, email_port)
        server.starttls()
        server.login(email_user, email_password)
        text = msg.as_string()
        server.sendmail(email_user, email_to, text)
        server.quit()
        print("이메일 발송 성공!")
    except Exception as e:
        print(f"이메일 발송 실패: {e}")

def main():
    """메인 실행 함수"""
    # 파일 경로 설정
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_file = os.path.join(base_dir, 'data.json')

    # 데이터 로드
    progress = fetch_progress_from_firebase()
    content = load_json(data_file)

    # 리포트 생성
    report_html = generate_report(progress, content)

    # 이메일 발송
    send_email(f"English Study Report - {datetime.now().strftime('%Y-%m-%d')}", report_html)

if __name__ == "__main__":
    main()
