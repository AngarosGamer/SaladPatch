@echo off
setlocal EnableExtensions EnableDelayedExpansion

rem ===== User-configurable defaults =====
set "DEFAULT_DEBUG_PORT=9222"
set "SALAD_EXE=C:\Program Files\Salad\Salad.exe"
set "PROJECT_DIR=%~dp0"
set "INJECTOR_SCRIPT=%PROJECT_DIR%script.js"

echo ================================================
echo   Salad Injector Launcher
echo ================================================
echo.

call :resolve_debug_port
if errorlevel 1 goto :end

call :check_salad_executable
if errorlevel 1 goto :end

call :ensure_node
if errorlevel 1 goto :end

call :ensure_npm_package "puppeteer-core"
if errorlevel 1 goto :end

echo.
echo Ready to launch Salad with remote debugging on port %DEBUG_PORT%.
call :confirm "Start Salad now?" || goto :end

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

:resolve_debug_port
set "DEBUG_PORT="
set /p "DEBUG_PORT=Enter debug port (default: %DEFAULT_DEBUG_PORT%): "
if "%DEBUG_PORT%"=="" set "DEBUG_PORT=%DEFAULT_DEBUG_PORT%"

echo %DEBUG_PORT%| findstr /R "^[0-9][0-9]*$" >nul
if errorlevel 1 (
	echo [ERROR] Invalid port: "%DEBUG_PORT%". Port must be numeric.
	exit /b 1
)

if %DEBUG_PORT% LSS 1 (
	echo [ERROR] Invalid port: "%DEBUG_PORT%". Port must be between 1 and 65535.
	exit /b 1
)

if %DEBUG_PORT% GTR 65535 (
	echo [ERROR] Invalid port: "%DEBUG_PORT%". Port must be between 1 and 65535.
	exit /b 1
)
exit /b 0

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

pushd "%PROJECT_DIR%" >nul

where npm >nul 2>nul
if errorlevel 1 (
	popd >nul
	echo [ERROR] npm was not found. Node.js installation may be incomplete.
	exit /b 1
)

npm list "%PACKAGE_NAME%" --depth=0 >nul 2>nul
if not errorlevel 1 (
	echo npm package already installed: %PACKAGE_NAME%
	popd >nul
	exit /b 0
)

if not exist "%PROJECT_DIR%package.json" (
	call :confirm "No package.json found. Initialize npm project (npm init -y)?" || (
		popd >nul
		echo Aborted by user.
		exit /b 1
	)

	npm init -y
	if errorlevel 1 (
		popd >nul
		echo [ERROR] npm init failed.
		exit /b 1
	)
)

call :confirm "Install npm package %PACKAGE_NAME% in this folder?" || (
	popd >nul
	echo Aborted by user.
	exit /b 1
)

npm install "%PACKAGE_NAME%"
if errorlevel 1 (
	popd >nul
	echo [ERROR] npm install %PACKAGE_NAME% failed.
	exit /b 1
)

echo [OK] Installed npm package: %PACKAGE_NAME%
popd >nul
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
echo Launching injector with DEBUG_PORT=%DEBUG_PORT%...
start "Salad Injector" cmd /k "set DEBUG_PORT=%DEBUG_PORT%&& cd /d ""%PROJECT_DIR%"" && node ""script.js"""
exit /b 0

:confirm
set "PROMPT_TEXT=%~1"
choice /M "%PROMPT_TEXT%"
if errorlevel 2 exit /b 1
exit /b 0

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
