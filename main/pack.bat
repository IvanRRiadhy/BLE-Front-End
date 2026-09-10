@echo off
setlocal
cd /d "%~dp0"

echo ==============================================================
echo             BUILDING AND PACKAGING FOR IIS DEPLOY
echo ==============================================================
echo.

echo [1/3] Building production bundle with Vite...
call yarn build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed. Please check build errors above.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/3] Checking web.config in dist...
if not exist "dist\web.config" (
    echo Copying public\web.config to dist\web.config...
    copy "public\web.config" "dist\web.config" >nul
)

echo.
echo [3/3] Creating dist-package.zip...
if exist "dist-package.zip" del "dist-package.zip"
powershell -Command "Compress-Archive -Path 'dist\*' -DestinationPath 'dist-package.zip' -Force"

echo.
echo ==============================================================
echo [SUCCESS] Package created: dist-package.zip
echo.
echo To distribute to clients/servers, send:
echo   1. dist-package.zip
echo   2. install-iis.bat
echo ==============================================================
pause
