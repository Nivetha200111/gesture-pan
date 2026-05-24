@echo off
setlocal
set "TD_EXE=C:\Program Files\Derivative\TouchDesigner\bin\TouchDesigner.exe"
set "TOE=%~dp0CameraBallGame.toe"

if not exist "%TD_EXE%" (
  echo TouchDesigner.exe was not found at:
  echo %TD_EXE%
  pause
  exit /b 1
)

if not exist "%TOE%" (
  echo CameraBallGame.toe was not found next to this script.
  pause
  exit /b 1
)

start "" "%TD_EXE%" "%TOE%"
