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
set "UPDATE_AVAILABLE=0"
set "NODE_EXE="
set "NPM_CMD="

if defined SALAD_DEBUG_PORT set "DEFAULT_DEBUG_PORT=%SALAD_DEBUG_PORT%"

echo ================================================
echo   Salad Patch Injector Launcher
echo   Checking Dependencies and Starting Services
echo ================================================
echo.

set "DEBUG_PORT=%DEFAULT_DEBUG_PORT%"

echo.
echo Checking for required dependencies...
echo.

call :check_salad_executable
if errorlevel 1 goto :end

call :ensure_node
if errorlevel 1 goto :end

call :ensure_npm
if errorlevel 1 goto :end

call :check_for_update
if "!UPDATE_AVAILABLE!"=="1" (
	echo.
	echo ================================================
	echo   [ACTION REQUIRED] Update Available
	echo ================================================
	echo A newer SaladPatch version is available.
	echo Please update from: https://github.com/%GITHUB_REPO_OWNER%/%GITHUB_REPO_NAME%/releases
	echo.
	if /I "%AUTO_CONTINUE_ON_UPDATE%"=="1" (
		echo [INFO] AUTO_CONTINUE_ON_UPDATE=1, continuing with current version.
	) else (
		call :confirm "Continue anyway with current version?" || goto :end
	)
)

call :ensure_npm_package "puppeteer-core"
if errorlevel 1 goto :end

echo.
echo Ready to launch Salad with remote debugging on port %DEBUG_PORT%.
echo.
echo [INFO] Starting Salad: "%SALAD_EXE%" --remote-debugging-port=%DEBUG_PORT%
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p = Start-Process -FilePath '%SALAD_EXE%' -ArgumentList '--remote-debugging-port=%DEBUG_PORT%' -PassThru; if ($env:SALAD_PID_FILE) { Set-Content -Path $env:SALAD_PID_FILE -Value $p.Id -Encoding ASCII }"
if errorlevel 1 (
	echo.
	echo [ERROR] Failed to start Salad.
	echo Troubleshooting:
	echo   - Ensure Salad.exe exists at: "%SALAD_EXE%"
	echo   - Check that the path is correct and accessible
	echo   - Try running as administrator
	exit /b 1
)

echo.
echo Waiting for Salad to be ready on port %DEBUG_PORT%...
call :wait_for_salad_ready
if errorlevel 1 goto :end

call :launch_injector
if errorlevel 1 goto :end

echo Salad is running and injector has been started.
goto :end

:check_salad_executable
if exist "%SALAD_EXE%" (
	echo [OK] Salad executable found: "%SALAD_EXE%"
	exit /b 0
)

echo.
echo [ERROR] Salad executable not found at:
echo         "%SALAD_EXE%"
echo.
echo Troubleshooting:
echo   1. Install Salad from https://salad.com
echo   2. Or update SALAD_EXE in this script if installed elsewhere
echo      (Current batch file location: %~f0)
echo   3. To specify a custom path, set environment variable or edit this script.
echo.
call :confirm "Would you like to install Salad now (website will open)?" && (
	echo Opening Salad download page...
	start https://salad.com
	exit /b 1
)

echo Aborted by user.
exit /b 1

:ensure_node
call :locate_node_executable
if defined NODE_EXE (
	for /f "delims=" %%V in ('"!NODE_EXE!" --version 2^>nul') do set "NODE_VERSION=%%V"
	echo [OK] Node.js detected: !NODE_VERSION!
	exit /b 0
)

echo.
echo [ERROR] Node.js is not installed or not available in PATH.
call :confirm_or_auto_yes "Install Node.js LTS using winget (requires admin rights)?" || (
	echo Aborted by user.
	exit /b 1
)

where winget >nul 2>nul
if errorlevel 1 (
	echo [ERROR] winget is not available on this Windows image.
	echo Install Node.js LTS from: https://nodejs.org/en/download
	echo Then run this launcher again.
	start https://nodejs.org/en/download
	exit /b 1
)

call :run_as_admin_if_needed "winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements"
if errorlevel 1 (
	echo [ERROR] Node.js installation failed.
	exit /b 1
)

echo [INFO] Node.js installation completed. Refreshing PATH...
call :refresh_path_from_registry

rem Re-check if node is now available
call :locate_node_executable
if defined NODE_EXE (
	for /f "delims=" %%V in ('"!NODE_EXE!" --version 2^>nul') do set "NODE_VERSION=%%V"
	echo [OK] Node.js is now available: !NODE_VERSION!
	exit /b 0
)

echo [WARN] PATH refresh did not find Node.js in current session.
echo [ERROR] Could not locate Node.js even after installation.
call :confirm "Restart terminal and run this script again?" && (
	exit /b 1
)
exit /b 1

:ensure_npm
if not defined NODE_EXE call :locate_node_executable
if defined NODE_EXE (
	for %%D in ("!NODE_EXE!") do set "NODE_DIR=%%~dpD"
	if exist "!NODE_DIR!npm.cmd" set "NPM_CMD=!NODE_DIR!npm.cmd"
)

if not defined NPM_CMD (
	for /f "delims=" %%N in ('where npm.cmd 2^>nul') do if not defined NPM_CMD set "NPM_CMD=%%N"
)

if defined NPM_CMD (
	call "!NPM_CMD!" --version >nul 2>nul
	if not errorlevel 1 (
		for /f "delims=" %%V in ('"!NPM_CMD!" --version 2^>nul') do set "NPM_VERSION=%%V"
		echo [OK] npm detected: v!NPM_VERSION!
		exit /b 0
	)
)

echo.
echo [ERROR] npm is not installed or not available in PATH.
echo npm should be installed with Node.js. Please ensure Node.js was installed correctly.
call :confirm_or_auto_yes "Try reinstalling Node.js?" || (
	echo Aborted by user.
	exit /b 1
)

call :run_as_admin_if_needed "winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements --force"
if errorlevel 1 (
	echo [ERROR] Node.js reinstallation failed.
	exit /b 1
)

echo [INFO] Node.js reinstallation completed. Refreshing PATH...
call :refresh_path_from_registry

rem Re-check if npm is now available
set "NPM_CMD="
if not defined NODE_EXE call :locate_node_executable
if defined NODE_EXE (
	for %%D in ("!NODE_EXE!") do set "NODE_DIR=%%~dpD"
	if exist "!NODE_DIR!npm.cmd" set "NPM_CMD=!NODE_DIR!npm.cmd"
)
if not defined NPM_CMD (
	for /f "delims=" %%N in ('where npm.cmd 2^>nul') do if not defined NPM_CMD set "NPM_CMD=%%N"
)
if defined NPM_CMD (
	call "!NPM_CMD!" --version >nul 2>nul
	if not errorlevel 1 (
		for /f "delims=" %%V in ('"!NPM_CMD!" --version 2^>nul') do set "NPM_VERSION=%%V"
		echo [OK] npm is now available: v!NPM_VERSION!
		exit /b 0
	)
)

echo [WARN] PATH refresh did not find npm in current session.

echo [ERROR] Could not locate npm even after installation.
call :confirm "Restart terminal and run this script again?" && (
	exit /b 1
)
exit /b 1

:ensure_npm_package
set "PACKAGE_NAME=%~1"
if not defined NPM_CMD set "NPM_CMD="

pushd "%PROJECT_DIR%" >nul

if not defined NPM_CMD (
	for /f "delims=" %%N in ('where npm.cmd 2^>nul') do if not defined NPM_CMD set "NPM_CMD=%%N"
)
if not defined NPM_CMD (
	popd >nul
	echo [ERROR] npm was not found. Node.js installation may be incomplete.
	echo Please ensure Node.js was installed correctly and restart your terminal.
	exit /b 1
)

if not exist "%PROJECT_DIR%package.json" (
	echo [INFO] No package.json found. Initializing npm project...

	call "%NPM_CMD%" init -y
	if errorlevel 1 (
		popd >nul
		echo [ERROR] npm init failed. Ensure npm is working correctly.
		exit /b 1
	)
)

echo [INFO] Checking npm package: %PACKAGE_NAME%...
if not defined NODE_EXE call :locate_node_executable
if not defined NODE_EXE (
	popd >nul
	echo [ERROR] Node.js executable was not found.
	exit /b 1
)
"!NODE_EXE!" -e "try { require.resolve('%PACKAGE_NAME%/package.json') } catch(e) { process.exit(1) }" >nul 2>nul
if not errorlevel 1 (
	echo [OK] npm package already installed: %PACKAGE_NAME%
	popd >nul
	exit /b 0
)

echo [INFO] npm package missing. Installing %PACKAGE_NAME%...

call "%NPM_CMD%" install "%PACKAGE_NAME%" --no-fund --no-audit --ignore-scripts
if errorlevel 1 (
	popd >nul
	echo [ERROR] npm install %PACKAGE_NAME% failed.
	echo Troubleshooting:
	echo   - Ensure you have an active internet connection
	echo   - Check that npm registry is accessible
	echo   - Try running: npm install --verbose for more details
	exit /b 1
)

echo [OK] Successfully installed npm package: %PACKAGE_NAME%
popd >nul
exit /b 0

:check_for_update
set "UPDATE_AVAILABLE=0"
set "CURRENT_VERSION="
if not defined NODE_EXE call :locate_node_executable
if not defined NODE_EXE (
	echo [WARN] Node.js executable not available. Skipping update check.
	exit /b 0
)
for /f "delims=" %%V in ('"!NODE_EXE!" -p "require('./package.json').version" 2^>nul') do set "CURRENT_VERSION=%%V"

if not defined CURRENT_VERSION (
	echo [WARN] Could not read local version from package.json. Skipping update check.
	exit /b 0
)

echo [INFO] Checking for updates on GitHub...
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
	"    Write-Host ('[UPDATE] A newer version is available:' );" ^
	"    Write-Host ('         Current: ' + $localVersion);" ^
	"    Write-Host ('         Latest:  ' + $remoteVersion);" ^
	"    Write-Host ('         Repository: https://github.com/%GITHUB_REPO_OWNER%/%GITHUB_REPO_NAME%');" ^
	"    exit 2;" ^
	"  } else {" ^
	"    Write-Host ('[OK] You are running the latest version: ' + $localVersion);" ^
	"    exit 0;" ^
	"  }" ^
	"} catch {" ^
	"  Write-Host ('[WARN] Update check skipped: ' + $_.Exception.Message);" ^
	"  exit 0;" ^
	"}"

if errorlevel 2 set "UPDATE_AVAILABLE=1"

exit /b 0

:wait_for_salad_ready
set "ATTEMPTS=0"
set "MAX_ATTEMPTS=60"

:wait_loop
set /a ATTEMPTS+=1

tasklist /FI "IMAGENAME eq Salad.exe" | find /I "Salad.exe" >nul
if errorlevel 1 (
	echo [ERROR] Salad process is not running. It may have crashed or failed to start.
	echo Ensure Salad is properly installed and try again.
	exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:%DEBUG_PORT%/json/version' -TimeoutSec 2; if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { exit 0 } else { exit 1 } } catch { exit 1 }"
if not errorlevel 1 (
	echo [OK] Salad debug endpoint is reachable on port %DEBUG_PORT%
	exit /b 0
)

if %ATTEMPTS% GEQ %MAX_ATTEMPTS% (
	echo.
	echo [ERROR] Timed out waiting for Salad debug endpoint on port %DEBUG_PORT%.
	echo Troubleshooting:
	echo   - The port may be in use by another process
	echo   - Salad may be starting slowly
	echo   - Try setting SALAD_DEBUG_PORT environment variable to a different port
	exit /b 1
)

if %ATTEMPTS% EQU 1 (
	echo [INFO] Waiting for Salad debug endpoint...
)
if %ATTEMPTS% MOD 5 EQU 0 (
	echo [INFO] Still waiting... (attempt %ATTEMPTS% of %MAX_ATTEMPTS%)
)

timeout /t 2 /nobreak >nul
goto :wait_loop

:launch_injector
if not exist "%INJECTOR_SCRIPT%" (
	echo [ERROR] Injector script not found: "%INJECTOR_SCRIPT%"
	echo This file is required to run the injector properly.
	exit /b 1
)

echo.
if "%INJECTOR_SILENT%"=="1" (
	echo [INFO] Launching injector silently with DEBUG_PORT=%DEBUG_PORT%...
	if not defined NODE_EXE call :locate_node_executable
	if not defined NODE_EXE (
		echo [ERROR] Node.js executable is unavailable.
		exit /b 1
	)
	powershell -NoProfile -ExecutionPolicy Bypass -Command "$env:DEBUG_PORT='%DEBUG_PORT%'; Start-Process -FilePath '!NODE_EXE!' -ArgumentList '""%INJECTOR_SCRIPT%""' -WorkingDirectory '%PROJECT_DIR%' -WindowStyle Hidden"
	if errorlevel 1 (
		echo [ERROR] Failed to start injector process.
		exit /b 1
	)
	exit /b 0
)

echo [INFO] Launching injector in this terminal with DEBUG_PORT=%DEBUG_PORT%...
echo [INFO] Press Ctrl+C to stop injector output.
echo.
pushd "%PROJECT_DIR%" >nul
set "DEBUG_PORT=%DEBUG_PORT%"
if not defined NODE_EXE call :locate_node_executable
if not defined NODE_EXE (
	echo [ERROR] Node.js executable is unavailable.
	popd >nul
	exit /b 1
)
"!NODE_EXE!" "%INJECTOR_SCRIPT%"
set "INJECTOR_EXIT=%ERRORLEVEL%"
popd >nul
if not "%INJECTOR_EXIT%"=="0" (
	echo.
	echo [ERROR] Injector exited with code %INJECTOR_EXIT%.
	echo Troubleshooting:
	echo   - Check that all npm packages are installed
	echo   - Ensure puppeteer-core is available
	echo   - Check the console output above for specific errors
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

:confirm_or_auto_yes
set "AUTO_PROMPT_TEXT=%~1"
if /I "%AUTO_INSTALL_DEPENDENCIES%"=="1" (
	echo [INFO] AUTO_INSTALL_DEPENDENCIES=1, auto-approving: %AUTO_PROMPT_TEXT%
	exit /b 0
)
call :confirm "%AUTO_PROMPT_TEXT%"
exit /b %errorlevel%

:run_as_admin_if_needed
set "ADMIN_CMD=%~1"

net session >nul 2>nul
if not errorlevel 1 (
	echo [INFO] Running with elevated admin rights...
	%ADMIN_CMD%
	exit /b %errorlevel%
)

echo [INFO] This operation requires administrator privileges.
call :confirm_or_auto_yes "Request elevation now?" || (
	echo [INFO] Aborted by user.
	exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', '%ADMIN_CMD%' -Verb RunAs -Wait"
exit /b %errorlevel%

:refresh_path_from_registry
rem Attempt to refresh PATH from registry without requiring admin
for /f "delims=" %%P in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "try { [System.Environment]::GetEnvironmentVariable('PATH', 'Machine') + ';' + [System.Environment]::GetEnvironmentVariable('PATH', 'User') } catch { Write-Host ''; exit 1 }" 2^>nul') do set "PATH=%%P"
exit /b 0

:locate_node_executable
set "NODE_EXE="

if not defined NODE_EXE if exist "%PROJECT_DIR%runtime\nodejs\node.exe" set "NODE_EXE=%PROJECT_DIR%runtime\nodejs\node.exe"
if not defined NODE_EXE if exist "%PROJECT_DIR%nodejs\node.exe" set "NODE_EXE=%PROJECT_DIR%nodejs\node.exe"

for /f "delims=" %%N in ('where node 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%N"

if not defined NODE_EXE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE_EXE if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles(x86)%\nodejs\node.exe"
if not defined NODE_EXE if defined LocalAppData if exist "%LocalAppData%\Programs\nodejs\node.exe" set "NODE_EXE=%LocalAppData%\Programs\nodejs\node.exe"

if defined NODE_EXE (
	for %%D in ("!NODE_EXE!") do set "NODE_DIR=%%~dpD"
	set "PATH=!NODE_DIR!;!PATH!"
)

exit /b 0

:end
set "EXIT_CODE=%ERRORLEVEL%"
if %EXIT_CODE% EQU 0 (
	echo.
	echo ================================================
	echo   [SUCCESS] Salad and injector running!
	echo ================================================
) else (
	echo.
	echo ================================================
	echo   [INFO] Launcher exited with code %EXIT_CODE%
	echo ================================================
	if %EXIT_CODE% EQU 1 (
		echo Check the error messages above for troubleshooting.
	)
)
echo.
if /I not "%LAUNCHER_NO_PAUSE%"=="1" pause
endlocal & exit /b %EXIT_CODE%
