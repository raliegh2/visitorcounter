@echo off
title Church Visitor Attendance System
cd /d "%~dp0"
echo Starting Church Visitor Attendance System...
echo Use the NEW browser tab opened by this launcher.
echo.
where py >nul 2>nul
if %errorlevel%==0 goto use_py
python server.py --open-browser
goto finished
:use_py
py -3 server.py --open-browser
:finished
echo.
echo The server has stopped or could not start.
pause
