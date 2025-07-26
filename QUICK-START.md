# TuningSearch MCP Server - Quick Start Guide

Get up and running with TuningSearch MCP Server in under 5 minutes!

## 🚀 1-Minute Setup

### Step 1: Install

```bash
npm install -g tuningsearch-mcp-server
```

### Step 2: Get API Key

1. Visit [TuningSearch.com](https://tuningsearch.com)
2. Sign up for a free account
3. Navigate to your dashboard
4. Generate an API key

### Step 3: Configure

```bash
export TUNINGSEARCH_API_KEY="your_api_key_here"
```

### Step 4: Test

```bash
tuningsearch-mcp-server --help
```

You should see the help message confirming the installation is successful.

## 🤖 Claude Desktop Setup

### 1. Find Config File

- **Windows**: `%APPDATA%\\Claude\\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

### 2. Add Configuration

```json
{
  "mcpServers": {
    "tuningsearch": {
      "command": "tuningsearch-mcp-server",
      "env": {
        "TUNINGSEARCH_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### 3. Restart Claude Desktop

Close and reopen Claude Desktop to load the new server.

## ✨ Try It Out

Ask Claude:

```
Search for "latest AI developments"
```

```
Find news about "climate change" from this week
```

```
Extract content from https://example.com
```

## 🛠️ Available Tools

| Tool | Purpose | Example |
|------|---------|---------|
| `tuningsearch_search` | Web search | "Search for Python tutorials" |
| `tuningsearch_news` | News search | "Find tech news from today" |
| `tuningsearch_crawl` | Web crawling | "Extract content from URL" |

## 🔧 Common Issues

### "API key is required"
```bash
# Check if set
echo $TUNINGSEARCH_API_KEY

# Set it
export TUNINGSEARCH_API_KEY="your_key"
```

### "Command not found"
```bash
# Reinstall globally
npm install -g tuningsearch-mcp-server

# Or use npx
npx tuningsearch-mcp-server
```

### Claude doesn't see the server
1. Check config file location
2. Verify JSON syntax
3. Restart Claude Desktop
4. Check Claude's MCP server status

## 📚 Next Steps

- Read the full [README](README.md) for advanced configuration
- Check out [examples](examples/) for more use cases
- Join our [GitHub Discussions](https://github.com/tuningsearch/tuningsearch-mcp-server/discussions)

## 🆘 Need Help?

- **Issues**: [GitHub Issues](https://github.com/tuningsearch/tuningsearch-mcp-server/issues)
- **Email**: support@tuningsearch.com
- **Docs**: [TuningSearch API Docs](https://tuningsearch.com/docs)

---

**Happy searching! 🔍**