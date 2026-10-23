@echo off
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File "%~dp0Uninstall.ps1" %*
if errorlevel 1 pause
