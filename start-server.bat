@echo off
echo 🚀 启动 TuningSearch MCP 服务器
echo.

set TUNINGSEARCH_API_KEY=your_api_key_here
set TUNINGSEARCH_LOG_LEVEL=info

echo 📋 配置信息:
echo API Key: %TUNINGSEARCH_API_KEY%
echo Log Level: %TUNINGSEARCH_LOG_LEVEL%
echo.

echo 🔄 启动服务器...
node dist/index.js

pause