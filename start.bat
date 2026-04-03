@echo off
setlocal EnableExtensions EnableDelayedExpansion

rem ===== User-configurable defaults =====
set "DEFAULT_DEBUG_PORT=9222"
set "SALAD_EXE=C:\Program Files\Salad\Salad.exe"
set "PROJECT_DIR=%~dp0"
set "INJECTOR_SCRIPT=%PROJECT_DIR%loader.js"
set "INJECTOR_SILENT=0"
set "GITHUB_REPO_OWNER=AngarosGamer"
set "GITHUB_REPO_NAME=SaladPatch"
set "GITHUB_BRANCH=main"
set "GITHUB_RAW_PACKAGE_URL=https://raw.githubusercontent.com/%GITHUB_REPO_OWNER%/%GITHUB_REPO_NAME%/%GITHUB_BRANCH%/package.json"

echo ================================================
echo   Salad Injector Launcher
echo ================================================
echo.

set "DEBUG_PORT=%DEFAULT_DEBUG_PORT%"

call :check_salad_executable
if errorlevel 1 goto :end

call :ensure_node
if errorlevel 1 goto :end

call :check_for_update

call :ensure_npm_package "puppeteer-core"
if errorlevel 1 goto :end

echo.
echo Ready to launch Salad with remote debugging on port %DEBUG_PORT%.

echo.
echo Starting: "%SALAD_EXE%" --remote-debugging-port=%DEBUG_PORT%
start "Salad" "%SALAD_EXE%" --remote-debugging-port=%DEBUG_PORT%

echo.
echo Waiting for Salad to be ready on port %DEBUG_PORT%...
call :wait_for_salad_ready
if errorlevel 1 goto :end

call :launch_injector
if errorlevel 1 goto :end

echo Salad is running and injector has been started.
goto :end

:check_salad_executable
if exist "%SALAD_EXE%" exit /b 0

echo [ERROR] Salad executable not found at:
echo         "%SALAD_EXE%"
echo Install Salad first or update SALAD_EXE in this script.
exit /b 1

:ensure_node
where node >nul 2>nul
if not errorlevel 1 (
	for /f "delims=" %%V in ('node --version 2^>nul') do set "NODE_VERSION=%%V"
	echo Node.js detected: !NODE_VERSION!
	exit /b 0
)

echo.
echo Node.js is not installed or not available in PATH.
call :confirm "Install Node.js using winget (requires admin rights)?" || (
	echo Aborted by user.
	exit /b 1
)

call :run_as_admin_if_needed "winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements"
if errorlevel 1 (
	echo [ERROR] Node.js installation failed.
	exit /b 1
)

echo [OK] Node.js installation command completed. Re-open terminal if PATH is not refreshed.
exit /b 0

:ensure_npm_package
set "PACKAGE_NAME=%~1"
set "NPM_CMD="

pushd "%PROJECT_DIR%" >nul

for /f "delims=" %%N in ('where npm.cmd 2^>nul') do if not defined NPM_CMD set "NPM_CMD=%%N"
if not defined NPM_CMD (
	popd >nul
	echo [ERROR] npm was not found. Node.js installation may be incomplete.
	exit /b 1
)

if not exist "%PROJECT_DIR%package.json" (
	echo No package.json found. Initializing npm project...

	"%NPM_CMD%" init -y
	if errorlevel 1 (
		popd >nul
		echo [ERROR] npm init failed.
		exit /b 1
	)
)

echo Checking npm package: %PACKAGE_NAME%...
node -e "require.resolve('%PACKAGE_NAME%/package.json')" >nul 2>nul
if not errorlevel 1 (
	echo npm package already installed: %PACKAGE_NAME%
	popd >nul
	exit /b 0
)

echo npm package missing. Installing %PACKAGE_NAME%...

"%NPM_CMD%" install "%PACKAGE_NAME%" --no-fund --no-audit --ignore-scripts
if errorlevel 1 (
	popd >nul
	echo [ERROR] npm install %PACKAGE_NAME% failed.
	exit /b 1
)

echo [OK] Installed npm package: %PACKAGE_NAME%
popd >nul
exit /b 0

:check_for_update
set "CURRENT_VERSION="
for /f "delims=" %%V in ('node -p "require('./package.json').version" 2^>nul') do set "CURRENT_VERSION=%%V"

if not defined CURRENT_VERSION (
	echo [WARN] Could not read local version from package.json. Skipping update check.
	exit /b 0
)

echo.
echo Checking for updates on GitHub...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
	"$ErrorActionPreference = 'Stop';" ^
	"try {" ^
	"  $localVersion = '%CURRENT_VERSION%';" ^
	"  $remote = Invoke-RestMethod -Uri '%GITHUB_RAW_PACKAGE_URL%' -Headers @{ 'User-Agent' = 'SaladPatch-UpdateChecker' } -TimeoutSec 10;" ^
	"  $remoteVersion = [string]$remote.version;" ^
	"  function Convert-ToVersion([string]$value) {" ^
	"    $clean = ($value -replace '^v', '') -replace '-.*$', '';" ^
	"    $parts = $clean.Split('.');" ^
	"    while ($parts.Count -lt 3) { $parts += '0' }" ^
	"    return [version]::new([int]$parts[0], [int]$parts[1], [int]$parts[2])" ^
	"  }" ^
	"  $localParsed = Convert-ToVersion $localVersion;" ^
	"  $remoteParsed = Convert-ToVersion $remoteVersion;" ^
	"  if ($remoteParsed -gt $localParsed) {" ^
	"    Write-Host ('[UPDATE] A newer version is available: ' + $remoteVersion);" ^
	"    Write-Host ('         Current: ' + $localVersion);" ^
	"    Write-Host ('         Latest:  ' + $remoteVersion);" ^
	"    Write-Host ('         Repo:    https://github.com/%GITHUB_REPO_OWNER%/%GITHUB_REPO_NAME%');" ^
	"  } else {" ^
	"    Write-Host ('[OK] You are running the latest version (' + $localVersion + ').');" ^
	"  }" ^
	"} catch {" ^
	"  Write-Host ('[WARN] Update check skipped: ' + $_.Exception.Message);" ^
	"}"

exit /b 0

:wait_for_salad_ready
set "ATTEMPTS=0"
set "MAX_ATTEMPTS=60"

:wait_loop
set /a ATTEMPTS+=1

tasklist /FI "IMAGENAME eq Salad.exe" | find /I "Salad.exe" >nul
if errorlevel 1 (
	echo [ERROR] Salad process is not running.
	exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:%DEBUG_PORT%/json/version' -TimeoutSec 2; if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { exit 0 } else { exit 1 } } catch { exit 1 }"
if not errorlevel 1 (
	echo [OK] Salad debug endpoint is reachable.
	exit /b 0
)

if %ATTEMPTS% GEQ %MAX_ATTEMPTS% (
	echo [ERROR] Timed out waiting for Salad debug endpoint on port %DEBUG_PORT%.
	exit /b 1
)

timeout /t 2 /nobreak >nul
goto :wait_loop

:launch_injector
if not exist "%INJECTOR_SCRIPT%" (
	echo [ERROR] Injector script not found: "%INJECTOR_SCRIPT%"
	exit /b 1
)

echo.
if "%INJECTOR_SILENT%"=="1" (
	echo Launching injector silently with DEBUG_PORT=%DEBUG_PORT%...
	powershell -NoProfile -ExecutionPolicy Bypass -Command "$env:DEBUG_PORT='%DEBUG_PORT%'; Start-Process -FilePath 'node' -ArgumentList '""%INJECTOR_SCRIPT%""' -WorkingDirectory '%PROJECT_DIR%' -WindowStyle Hidden"
	if errorlevel 1 (
		echo [ERROR] Failed to start injector process.
		exit /b 1
	)
	exit /b 0
)

echo Launching injector in this terminal with DEBUG_PORT=%DEBUG_PORT%...
echo Press Ctrl+C to stop injector output.
pushd "%PROJECT_DIR%" >nul
set "DEBUG_PORT=%DEBUG_PORT%"
node "%INJECTOR_SCRIPT%"
set "INJECTOR_EXIT=%ERRORLEVEL%"
popd >nul
if not "%INJECTOR_EXIT%"=="0" (
	echo [ERROR] Injector exited with code %INJECTOR_EXIT%.
	exit /b %INJECTOR_EXIT%
)
exit /b 0

:confirm
set "PROMPT_TEXT=%~1"

:confirm_loop
set "CONFIRM_REPLY="
set /p "CONFIRM_REPLY=%PROMPT_TEXT% [Y/N]: "
for /f "tokens=*" %%A in ("%CONFIRM_REPLY%") do set "CONFIRM_REPLY=%%~A"

if /I "%CONFIRM_REPLY%"=="Y" exit /b 0
if /I "%CONFIRM_REPLY%"=="YES" exit /b 0
if /I "%CONFIRM_REPLY%"=="N" exit /b 1
if /I "%CONFIRM_REPLY%"=="NO" exit /b 1

echo Please answer Y or N.
goto :confirm_loop

:run_as_admin_if_needed
set "ADMIN_CMD=%~1"

net session >nul 2>nul
if not errorlevel 1 (
	echo Running with admin rights...
	%ADMIN_CMD%
	exit /b %errorlevel%
)

echo Admin rights required for this change.
call :confirm "Request elevation now?" || (
	echo Aborted by user.
	exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', '%ADMIN_CMD%' -Verb RunAs -Wait"
exit /b %errorlevel%

:end
echo.
echo Exiting launcher.
pause
endlocal
