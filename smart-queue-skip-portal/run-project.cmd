@echo off
setlocal

set "ROOT=%~dp0"
set "MONGO_EXE=C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe"
set "MONGO_DBPATH=C:\data\db"

if not exist "%MONGO_EXE%" (
  echo MongoDB executable not found at:
  echo %MONGO_EXE%
  echo Update run-project.cmd if MongoDB is installed in a different version folder.
  pause
  exit /b 1
)

if not exist "%MONGO_DBPATH%" (
  mkdir "%MONGO_DBPATH%"
)

start "Smart Queue - MongoDB" cmd /k ""%MONGO_EXE%" --dbpath "%MONGO_DBPATH%""
start "Smart Queue - Backend" cmd /k "cd /d "%ROOT%server" && npm.cmd run dev"
start "Smart Queue - Frontend" cmd /k "cd /d "%ROOT%client" && npm.cmd run dev"

echo Started MongoDB, backend, and frontend in separate windows.
echo Open http://localhost:5173 in your browser after the servers finish starting.
endlocal
