@echo off
cls
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║  Creating Desktop Shortcut...                              ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

set SCRIPT="%TEMP%\CreateShortcut.vbs"
set DESKTOP=%USERPROFILE%\Desktop
set TARGET=%CD%\Petrol-Pump-App-Production.bat
set SHORTCUT=%DESKTOP%\Petrol Pump App.lnk

echo Set oWS = WScript.CreateObject("WScript.Shell") > %SCRIPT%
echo sLinkFile = "%SHORTCUT%" >> %SCRIPT%
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> %SCRIPT%
echo oLink.TargetPath = "%TARGET%" >> %SCRIPT%
echo oLink.WorkingDirectory = "%CD%" >> %SCRIPT%
echo oLink.Description = "Petrol Pump Management System - Click to Start" >> %SCRIPT%
echo oLink.IconLocation = "%%SystemRoot%%\System32\shell32.dll,13" >> %SCRIPT%
echo oLink.Save >> %SCRIPT%

cscript /nologo %SCRIPT%
del %SCRIPT%

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║  ✓ DESKTOP SHORTCUT CREATED!                               ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo You can now find "Petrol Pump App" on your Desktop.
echo.
echo Double-click it to start the application!
echo.
pause
