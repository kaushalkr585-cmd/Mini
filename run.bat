@echo off
cd /d "%~dp0"

echo ==========================================
echo        NISHY - Starting Platform
echo ==========================================

echo.
echo [1/2] Launching Backend on port 5000...
start "NISHY Backend" cmd /k "cd /d "%~dp0backend" & npm start"

timeout /t 2 /nobreak > nul

echo [2/2] Launching Frontend on port 5173...
start "NISHY Frontend" cmd /k "cd /d "%~dp0frontend" & npm run dev"

echo.
echo ==========================================
echo  Frontend -^> http://localhost:5173
echo  Backend  -^> http://localhost:5000
echo ==========================================
echo.
pause
