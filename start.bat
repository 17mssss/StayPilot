@echo off
cd /d "%~dp0"

echo ================================
echo    StayPilot - Demarrage...
echo ================================

if not exist .env (
    copy .env.example .env
    echo .env cree depuis .env.example - remplis les cles avant de continuer
    pause
    exit /b 1
)

echo Verification de Docker...
docker --version
if errorlevel 1 (
    echo ERREUR : Docker n'est pas installe ou pas dans le PATH
    pause
    exit /b 1
)

echo Lancement des containers...
docker-compose up -d --build

if errorlevel 1 (
    echo ERREUR : docker-compose a echoue - voir message ci-dessus
    pause
    exit /b 1
)

echo ================================
echo    StayPilot est lance !
echo    Backend : http://localhost:3001
echo    n8n     : http://localhost:5678
echo ================================
pause
