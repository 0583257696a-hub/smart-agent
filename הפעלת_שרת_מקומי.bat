@echo off
title Agent Operations Server
echo Starting server on http://127.0.0.1:5174/index.html
start http://127.0.0.1:5174/index.html
node dev-server.js
pause
