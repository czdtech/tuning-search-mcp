# TuningSearch MCP Server - 使用指南

## 🎉 测试结果

你的 TuningSearch MCP Server 已经完全可以使用！所有核心功能都已测试通过：

### ✅ 功能状态
- **搜索工具** (`tuningsearch_search`) - ✅ 完全正常
- **新闻工具** (`tuningsearch_news`) - ✅ 完全正常  
- **抓取工具** (`tuningsearch_crawl`) - ✅ 基本正常（有轻微验证警告）

## 🚀 快速启动

### 方法 1: 使用启动脚本

**Windows:**
```bash
start-server.bat
```

**Linux/Mac:**
```bash
chmod +x start-server.sh
./start-server.sh
```

### 方法 2: 手动启动

**Windows:**
```cmd
set TUNINGSEARCH_API_KEY=your_api_key_here
node dist/index.js
```

**Linux/Mac:**
```bash
export TUNINGSEARCH_API_KEY="your_api_key_here"
node dist/index.js
```

## 🔧 MCP 客户端配置

### Claude Desktop 配置

在 Claude Desktop 的配置文件中添加：

```json
{
  "mcpServers": {
    "tuningsearch": {
      "command": "node",
      "args": ["E:/projects/project/tuning-search-mcp/dist/index.js"],
      "env": {
        "TUNINGSEARCH_API_KEY": "your_api_key_here",
        "TUNINGSEARCH_LOG_LEVEL": "info"
      }
    }
  }
}
```

### 其他 MCP 客户端

使用相同的配置格式，确保：
1. 正确的可执行文件路径
2. 设置 `TUNINGSEARCH_API_KEY` 环境变量
3. 可选设置日志级别

## 🛠️ 可用工具

### 1. tuningsearch_search - 网络搜索
```json
{
  "q": "搜索查询",
  "language": "zh",
  "country": "CN", 
  "page": 1,
  "safe": 0
}
```

### 2. tuningsearch_news - 新闻搜索
```json
{
  "q": "新闻查询",
  "language": "zh",
  "country": "CN",
  "page": 1
}
```

### 3. tuningsearch_crawl - 网页抓取
```json
{
  "url": "https://example.com"
}
```

## 📊 测试结果示例

- **搜索结果**: 返回约 4000+ 字符的详细搜索结果
- **新闻结果**: 返回约 4000+ 字符的新闻文章
- **抓取结果**: 返回网页的文本内容

## 🔍 故障排除

### 常见问题

1. **API 密钥错误**
   - 确保 API 密钥正确设置
   - 检查环境变量是否正确传递

2. **网络连接问题**
   - 检查网络连接
   - 确认防火墙设置

3. **权限问题**
   - 确保 Node.js 有执行权限
   - 检查文件路径是否正确

### 日志级别

设置不同的日志级别来调试问题：
- `debug` - 详细调试信息
- `info` - 一般信息（推荐）
- `warn` - 警告信息
- `error` - 仅错误信息

## 🎯 下一步

1. **在 MCP 客户端中配置服务器**
2. **测试各种搜索查询**
3. **根据需要调整配置**
4. **享受强大的搜索功能！**

---

**项目状态**: ✅ 完全可用
**最后测试**: 2025-07-26
**API 状态**: ✅ 正常工作