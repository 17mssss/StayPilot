@echo off
:: Garder le terminal ouvert en cas d'erreur
if not defined IN_SUBPROCESS (cmd /k set IN_SUBPROCESS=1 ^& %0 %* & exit /b)
echo ============================================
echo   MISE A JOUR FRONTEND - VERCEL
echo ============================================
echo.

set /p BACKEND_URL="Collez l'URL Railway du backend (ex: https://xxx.railway.app) : "

:: Aller dans le dossier frontend-admin
cd /d "%~dp0frontend-admin"

:: Ecrire le fichier .env.production
echo VITE_API_URL=%BACKEND_URL%> .env.production
echo VITE_API_URL defini sur : %BACKEND_URL%

echo.
echo Build en cours...
call npm run build

echo.
echo Deploiement sur Vercel...
call vercel --prod --yes

echo.
echo ============================================
echo   FRONTEND MIS A JOUR !
echo   Votre app est maintenant accessible
echo   depuis n'importe quel appareil.
echo ============================================
pause
