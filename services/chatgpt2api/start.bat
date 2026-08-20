@echo off
chcp 65001 >nul
echo ==========================================
echo Khoi dong ChatGPT2API Local
echo ==========================================

echo [1/2] Dang khoi dong Backend (Python)...
start "ChatGPT2API - Backend" cmd /k "set CHATGPT2API_AUTH_KEY=16022005 && uv sync && uv run main.py"

echo [2/2] Dang khoi dong Frontend (Web UI)...
start "ChatGPT2API - Frontend" cmd /k "cd web && bun install && bun run dev"