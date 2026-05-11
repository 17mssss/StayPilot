@echo off
cd /d "%~dp0"

echo ================================================
echo   StayPilot - Demarrage en mode developpement
echo ================================================

REM --- Backend ---
echo [1/3] Lancement du Backend (port 3001)...
start "StayPilot - Backend" cmd /k "cd /d "%~dp0backend" && npm run dev"

REM --- Frontend Admin ---
echo [2/3] Lancement du Frontend Admin (port 3004)...
start "StayPilot - Admin" cmd /k "cd /d "%~dp0frontend-admin" && npm run dev"

REM --- Frontend Owner ---
echo [3/3] Lancement du Frontend Owner (port 3003)...
start "StayPilot - Owner" cmd /k "cd /d "%~dp0frontend-owner" && npm run dev"

echo.
echo ================================================
echo   Tout est lance ! Acces :
echo   Backend  : http://localhost:3001
echo   Admin    : http://localhost:3004
echo   Owner    : http://localhost:3003
echo ================================================
echo   (Ferme cette fenetre quand tu veux)
echo ================================================
pause
