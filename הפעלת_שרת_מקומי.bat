@echo off
title Agent Operations Server
echo Starting Next.js server on http://127.0.0.1:3002
echo.
echo If port 3002 is busy, close this window and run:
echo npm.cmd run dev -- --hostname 127.0.0.1 --port 3003
echo.
start "" http://127.0.0.1:3002
npm.cmd run dev -- --hostname 127.0.0.1 --port 3002
pause
