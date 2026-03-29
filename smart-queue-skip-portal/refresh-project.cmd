@echo off
setlocal

set "ROOT=%~dp0"
set "MONGO_EXE=C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe"
set "MONGO_DBPATH=C:\data\db"

if not exist "%MONGO_EXE%" (
  echo MongoDB executable not found at:
  echo %MONGO_EXE%
  echo Update refresh-project.cmd if MongoDB is installed in a different version folder.
  pause
  exit /b 1
)

if not exist "%MONGO_DBPATH%" (
  mkdir "%MONGO_DBPATH%"
)

start "Smart Queue - MongoDB" cmd /k ""%MONGO_EXE%" --dbpath "%MONGO_DBPATH%""

echo Waiting for MongoDB to boot...
timeout /t 5 /nobreak >nul

echo Reseeding database...
cd /d "%ROOT%server"
call npm.cmd run seed
if errorlevel 1 (
  echo Seed failed. Fix the error above and run refresh-project.cmd again.
  pause
  exit /b 1
)

start "Smart Queue - Backend" cmd /k "cd /d "%ROOT%server" && npm.cmd run dev"
start "Smart Queue - Frontend" cmd /k "cd /d "%ROOT%client" && npm.cmd run dev"

echo.
echo Database reseeded and app services started.
echo Open http://localhost:5173 after the frontend finishes starting.
endlocal
