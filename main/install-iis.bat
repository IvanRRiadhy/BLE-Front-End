@echo off
setlocal enabledelayedexpansion

:: -------------------------------------------------------------
:: 1. Auto-elevate to Administrator
:: -------------------------------------------------------------
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Requesting Administrator privileges...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

title Deploying React App to Windows IIS
cd /d "%~dp0"

echo ==============================================================
echo              DEPLOYING REACT APP TO WINDOWS IIS
echo ==============================================================
echo.

:: -------------------------------------------------------------
:: 2. Check and Enable IIS (if missing)
:: -------------------------------------------------------------
echo [Step 1/5] Checking IIS installation...
sc query W3SVC >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] IIS is not installed. Enabling IIS and Static Content features via DISM...
    echo (This may take 1-3 minutes. Please wait...)
    dism /online /enable-feature /featurename:IIS-WebServerRole /featurename:IIS-WebServer /featurename:IIS-CommonHttpFeatures /featurename:IIS-StaticContent /featurename:IIS-DefaultDocument /featurename:IIS-DirectoryBrowsing /featurename:IIS-HttpErrors /featurename:IIS-HttpRedirect /featurename:IIS-ManagementConsole /all /norestart
    if !errorlevel! neq 0 (
        echo [ERROR] Failed to enable IIS features via DISM.
        pause
        exit /b 1
    )
    echo [OK] IIS features enabled successfully.
) else (
    echo [OK] IIS is already installed.
)

:: Ensure W3SVC service is started
net start W3SVC >nul 2>&1

:: -------------------------------------------------------------
:: 3. Check and Install URL Rewrite Module
:: -------------------------------------------------------------
echo.
echo [Step 2/5] Checking IIS URL Rewrite Module...
set "REWRITE_DLL=%windir%\system32\inetsrv\rewrite.dll"
if not exist "%REWRITE_DLL%" (
    echo [INFO] URL Rewrite Module is not installed.
    set "MSI_URL=https://download.microsoft.com/download/1/2/8/128E2E22-C1B9-44A4-BE2A-5859ED1D4592/rewrite_amd64_en-US.msi"
    set "TEMP_MSI=%TEMP%\rewrite_amd64_en-US.msi"

    if exist "rewrite_amd64_en-US.msi" (
        echo [INFO] Found local installer 'rewrite_amd64_en-US.msi'.
        set "INSTALLER_PATH=rewrite_amd64_en-US.msi"
    ) else (
        echo [INFO] Downloading URL Rewrite 2.1 x64 from Microsoft...
        curl.exe -L -s -o "!TEMP_MSI!" "!MSI_URL!" 2>nul
        if not exist "!TEMP_MSI!" (
            powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object Net.WebClient).DownloadFile('!MSI_URL!', '!TEMP_MSI!')"
        )
        set "INSTALLER_PATH=!TEMP_MSI!"
    )

    echo [INFO] Installing URL Rewrite Module silently...
    msiexec /i "!INSTALLER_PATH!" /qn /norestart
    if !errorlevel! neq 0 (
        echo [WARNING] msiexec returned code !errorlevel!. Verifying installation...
    )

    :: Wait 3 seconds for file registration
    timeout /t 3 /nobreak >nul
    if not exist "%REWRITE_DLL%" (
        echo [ERROR] URL Rewrite installation failed.
        echo Please manually install 'rewrite_amd64_en-US.msi' from Microsoft:
        echo !MSI_URL!
        pause
        exit /b 1
    )

    echo [OK] URL Rewrite Module installed successfully!
    echo [INFO] Restarting IIS to apply module...
    iisreset >nul 2>&1
    if exist "!TEMP_MSI!" del "!TEMP_MSI!" 2>nul
) else (
    echo [OK] IIS URL Rewrite Module is already installed.
)

:: -------------------------------------------------------------
:: 4. Find Available Port (Start at 3000, increment by 5)
:: -------------------------------------------------------------
echo.
echo [Step 3/5] Finding available HTTP port...
set "TARGET_PORT=3000"

:CHECK_PORT
powershell -Command "if (Get-NetTCPConnection -LocalPort %TARGET_PORT% -ErrorAction SilentlyContinue) { exit 1 } else { exit 0 }"
if %errorlevel% neq 0 (
    echo Port %TARGET_PORT% is already in use.
    set /a TARGET_PORT+=5
    echo Checking port !TARGET_PORT!...
    goto CHECK_PORT
)

echo [OK] Assigned Port: %TARGET_PORT%

:: -------------------------------------------------------------
:: 5. Prepare Target Directory & Extract Files
:: -------------------------------------------------------------
echo.
echo [Step 4/5] Deploying website files...
set "SITE_NAME=ModernizeFrontend"
set "APP_POOL=ModernizeAppPool"
set "INSTALL_DIR=C:\inetpub\wwwroot\%SITE_NAME%"

if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

if exist "dist-package.zip" (
    echo [INFO] Unpacking 'dist-package.zip' into '%INSTALL_DIR%'...
    powershell -Command "Expand-Archive -Path 'dist-package.zip' -DestinationPath '%INSTALL_DIR%' -Force"
) else if exist "dist" (
    echo [INFO] Copying files from 'dist' folder into '%INSTALL_DIR%'...
    xcopy /E /I /Y "dist\*" "%INSTALL_DIR%\" >nul
) else (
    echo [ERROR] Neither 'dist-package.zip' nor 'dist' folder found in '%~dp0'!
    pause
    exit /b 1
)

:: Copy local web.config if missing from dist
if not exist "%INSTALL_DIR%\web.config" (
    if exist "public\web.config" copy "public\web.config" "%INSTALL_DIR%\web.config" >nul
    if exist "web.config" copy "web.config" "%INSTALL_DIR%\web.config" >nul
)

:: Set proper permissions for IIS
echo [INFO] Setting IIS file permissions...
icacls "%INSTALL_DIR%" /grant "IIS_IUSRS":(OI)(CI)RX /T >nul 2>&1
icacls "%INSTALL_DIR%" /grant "IUSR":(OI)(CI)RX /T >nul 2>&1

:: -------------------------------------------------------------
:: 6. Register Site in IIS using appcmd
:: -------------------------------------------------------------
echo.
echo [Step 5/5] Configuring IIS site and application pool...
set "APPCMD=%windir%\system32\inetsrv\appcmd.exe"

if not exist "%APPCMD%" (
    echo [ERROR] appcmd.exe not found at '%APPCMD%'.
    pause
    exit /b 1
)

:: Recreate AppPool with No Managed Code (optimal for static SPA)
%APPCMD% delete apppool "%APP_POOL%" >nul 2>&1
%APPCMD% add apppool /name:"%APP_POOL%" /managedRuntimeVersion:"" >nul 2>&1

:: Recreate Site with designated port
%APPCMD% delete site "%SITE_NAME%" >nul 2>&1
%APPCMD% add site /name:"%SITE_NAME%" /bindings:http/*:%TARGET_PORT%: /physicalPath:"%INSTALL_DIR%" >nul 2>&1
%APPCMD% set site /site.name:"%SITE_NAME%" /[path='/'].applicationPool:"%APP_POOL%" >nul 2>&1
%APPCMD% start site "%SITE_NAME%" >nul 2>&1

echo.
echo ==============================================================
echo [SUCCESS] Application successfully installed and running on IIS!
echo URL: http://localhost:%TARGET_PORT%
echo Physical Path: %INSTALL_DIR%
echo ==============================================================
echo.

start http://localhost:%TARGET_PORT%
pause
