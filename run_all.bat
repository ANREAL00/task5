@echo off
SETLOCAL
TITLE Music Store Showcase - Runner

start "Music Store - Server" cmd /k "cd /d %~dp0server && npm run dev"

start "Music Store - Client" cmd /k "cd /d %~dp0client && npm run dev"

pause > nul
