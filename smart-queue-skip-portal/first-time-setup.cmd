@echo off
setlocal

set "ROOT=%~dp0"

start "Smart Queue - Backend Setup" cmd /k "cd /d "%ROOT%server" && if not exist .env copy .env.example .env && npm.cmd install && npm.cmd run seed"
start "Smart Queue - Frontend Setup" cmd /k "cd /d "%ROOT%client" && npm.cmd install"

echo First-time setup windows opened.
echo Backend setup will install dependencies, create .env, and seed MongoDB.
echo Frontend setup will install client dependencies.
endlocal
