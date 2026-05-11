@echo off
echo ============================================
echo   DEPLOIEMENT STAYPILOT BACKEND - RAILWAY
echo ============================================
echo.

:: Aller dans le dossier backend
cd /d "%~dp0backend"

:: Verifier si Railway CLI est installe
railway --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Installation de Railway CLI...
    npm install -g @railway/cli
)

echo.
echo Connexion a Railway...
echo [Votre navigateur va s'ouvrir - connectez-vous avec GitHub]
echo.
railway login

echo.
echo Initialisation du projet Railway...
railway init

echo.
echo Deploiement en cours...
railway up --detach

echo.
echo Recuperation de l'URL...
railway domain

echo.
echo ============================================
echo   DEPLOIEMENT TERMINE !
echo   Copiez l'URL affichee ci-dessus
echo   et collez-la dans Vercel comme
echo   VITE_API_URL
echo ============================================
echo.
echo Appuyez sur une touche pour fermer...
pause >nul
