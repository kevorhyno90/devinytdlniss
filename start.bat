@echo off
echo Starting YTDLnis PWA...
echo.
echo [1/2] Starting backend server on http://localhost:4123
start "YTDLnis Backend" cmd /k "\"C:\Program Files\nodejs\node.exe\" backend\server.js"
timeout /t 2 >nul
echo [2/2] Starting frontend on http://localhost:5173
start "YTDLnis Frontend" cmd /k "cd frontend && \"C:\Program Files\nodejs\npm.cmd\" run dev"
echo.
echo Both servers started! Open http://localhost:5173 in your browser.
echo.
pause
