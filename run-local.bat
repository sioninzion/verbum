@echo off
cd /d "%~dp0"
echo 로컬 서버를 시작합니다... (종료하려면 이 창을 닫으세요)
start "" http://localhost:8000/index.html
python -m http.server 8000
