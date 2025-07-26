@echo off
REM TuningSearch MCP Server Startup Script for Windows
REM This script starts the TuningSearch MCP server with proper error handling

setlocal enabledelayedexpansion

REM Configuration
set SCRIPT_DIR=%~dp0
set LOG_FILE=%SCRIPT_DIR%server.log
set PID_FILE=%SCRIPT_DIR%server.pid

REM Get current timestamp
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
set "timestamp=%YYYY%-%MM%-%DD% %HH%:%Min%:%Sec%"

REM Logging functions
:log
echo [%timestamp%] %~1
echo [%timestamp%] %~1 >> "%LOG_FILE%"
goto :eof

:error
echo [%timestamp%] ERROR: %~1
echo [%timestamp%] ERROR: %~1 >> "%LOG_FILE%"
goto :eof

:warn
echo [%timestamp%] WARNING: %~1
echo [%timestamp%] WARNING: %~1 >> "%LOG_FILE%"
goto :eof

REM Check if server is already running
:check_running
if exist "%PID_FILE%" (
    set /p pid=<"%PID_FILE%"
    tasklist /FI "PID eq !pid!" 2>nul | find /I "!pid!" >nul
    if !errorlevel! equ 0 (
        exit /b 0
    ) else (
        del "%PID_FILE%" 2>nul
        exit /b 1
    )
)
exit /b 1

REM Load environment variables
:load_env
if exist "%SCRIPT_DIR%..\environment\.env" (
    call :log "Loading environment variables from .env file"
    for /f "usebackq tokens=1,2 delims==" %%a in ("%SCRIPT_DIR%..\environment\.env") do (
        if not "%%a"=="" if not "%%a:~0,1%"=="#" (
            set "%%a=%%b"
        )
    )
) else if exist "%SCRIPT_DIR%.env" (
    call :log "Loading environment variables from local .env file"
    for /f "usebackq tokens=1,2 delims==" %%a in ("%SCRIPT_DIR%.env") do (
        if not "%%a"=="" if not "%%a:~0,1%"=="#" (
            set "%%a=%%b"
        )
    )
)
goto :eof

REM Validate configuration
:validate_config
if "%TUNINGSEARCH_API_KEY%"=="" (
    call :error "TUNINGSEARCH_API_KEY is not set. Please configure your API key."
    exit /b 1
)
call :log "Configuration validated successfully"
goto :eof

REM Start the server
:start_server
call :log "Starting TuningSearch MCP Server..."

REM Check if already running
call :check_running
if !errorlevel! equ 0 (
    set /p pid=<"%PID_FILE%"
    call :warn "Server is already running (PID: !pid!)"
    goto :eof
)

REM Load environment and validate
call :load_env
call :validate_config
if !errorlevel! neq 0 exit /b 1

REM Start the server
start /B "" cmd /c "npx tuningsearch-mcp-server >> "%LOG_FILE%" 2>&1"

REM Get the PID (this is a simplified approach for Windows)
for /f "tokens=2" %%i in ('tasklist /FI "IMAGENAME eq node.exe" /FO CSV ^| find /V "PID" ^| find /V """PID"""') do (
    set "pid=%%i"
    set "pid=!pid:"=!"
)

REM Save PID
echo !pid! > "%PID_FILE%"

REM Wait and check if started successfully
timeout /t 2 /nobreak >nul
tasklist /FI "PID eq !pid!" 2>nul | find /I "!pid!" >nul
if !errorlevel! equ 0 (
    call :log "Server started successfully (PID: !pid!)"
    call :log "Log file: %LOG_FILE%"
) else (
    call :error "Failed to start server"
    del "%PID_FILE%" 2>nul
    exit /b 1
)
goto :eof

REM Stop the server
:stop_server
call :log "Stopping TuningSearch MCP Server..."

call :check_running
if !errorlevel! neq 0 (
    call :warn "Server is not running"
    goto :eof
)

set /p pid=<"%PID_FILE%"
taskkill /PID !pid! /T /F >nul 2>&1

del "%PID_FILE%" 2>nul
call :log "Server stopped successfully"
goto :eof

REM Restart the server
:restart_server
call :log "Restarting TuningSearch MCP Server..."
call :stop_server
timeout /t 1 /nobreak >nul
call :start_server
goto :eof

REM Show server status
:status_server
call :check_running
if !errorlevel! equ 0 (
    set /p pid=<"%PID_FILE%"
    call :log "Server is running (PID: !pid!)"
    tasklist /FI "PID eq !pid!" 2>nul
) else (
    call :log "Server is not running"
)
goto :eof

REM Show logs
:show_logs
if exist "%LOG_FILE%" (
    type "%LOG_FILE%"
) else (
    call :error "Log file not found: %LOG_FILE%"
)
goto :eof

REM Main script logic
if "%1"=="" set "1=start"

if "%1"=="start" (
    call :start_server
) else if "%1"=="stop" (
    call :stop_server
) else if "%1"=="restart" (
    call :restart_server
) else if "%1"=="status" (
    call :status_server
) else if "%1"=="logs" (
    call :show_logs
) else (
    echo Usage: %0 {start^|stop^|restart^|status^|logs}
    echo.
    echo Commands:
    echo   start   - Start the TuningSearch MCP server
    echo   stop    - Stop the TuningSearch MCP server
    echo   restart - Restart the TuningSearch MCP server
    echo   status  - Show server status
    echo   logs    - Show server logs
    exit /b 1
)