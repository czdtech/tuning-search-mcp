# TuningSearch MCP Server

[![npm version](https://badge.fury.io/js/tuningsearch-mcp-server.svg)](https://badge.fury.io/js/tuningsearch-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-blue)](https://modelcontextprotocol.io/)

A Model Context Protocol (MCP) server that integrates [TuningSearch API](https://tuningsearch.com) capabilities, providing AI assistants with web search, news search, and web crawling functionality.

## Features

- 🔍 **Web Search** - Comprehensive web search with filtering options
- 📰 **News Search** - Real-time news articles from various sources
- 🌐 **Web Crawling** - Extract clean content from web pages
- ⚡ **Performance** - Built-in caching and retry mechanisms
- 🛡️ **Reliability** - Comprehensive error handling and health monitoring

## Installation

```bash
npm install -g tuningsearch-mcp-server
```

Or install locally:

```bash
npm install tuningsearch-mcp-server
```

## Quick Start

### 1. Get Your API Key

Visit [TuningSearch](https://tuningsearch.com) to sign up and get your API key.

### 2. Configure MCP Client

#### Claude Desktop

Edit your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`  
**Linux**: `~/.config/Claude/claude_desktop_config.json`

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

The server will start automatically when Claude Desktop launches.

## Available Tools

### `tuningsearch_search` - Web Search

Search the web with advanced filtering options.

**Parameters:**
- `q` (required): Search query
- `language` (optional): Language code (e.g., "en", "zh")
- `country` (optional): Country code (e.g., "US", "CN")
- `page` (optional): Page number (default: 1)
- `safe` (optional): Safe search level 0-2 (default: 0)
- `timeRange` (optional): "day", "week", "month", "year"

### `tuningsearch_news` - News Search

Search for recent news articles.

**Parameters:**
- `q` (required): News search query
- `language` (optional): Language code
- `country` (optional): Country code
- `page` (optional): Page number
- `timeRange` (optional): Time range filter

### `tuningsearch_crawl` - Web Crawling

Extract content from web pages.

**Parameters:**
- `url` (required): URL to crawl

## Configuration

### Environment Variables

```bash
# Required
TUNINGSEARCH_API_KEY=your_api_key_here

# Optional
TUNINGSEARCH_BASE_URL=https://api.tuningsearch.com/v1
TUNINGSEARCH_TIMEOUT=30000
TUNINGSEARCH_RETRY_ATTEMPTS=3
TUNINGSEARCH_RETRY_DELAY=1000
TUNINGSEARCH_LOG_LEVEL=info  # debug, info, warn, error
TUNINGSEARCH_LOG_FORMAT=json  # json, text
```

## Command Line Usage

```bash
# Start server
TUNINGSEARCH_API_KEY="your_key" tuningsearch-mcp-server

# With debug logging
TUNINGSEARCH_API_KEY="your_key" TUNINGSEARCH_LOG_LEVEL="debug" tuningsearch-mcp-server

# Show help
tuningsearch-mcp-server --help
```

## Development

```bash
# Clone repository
git clone https://github.com/tuningsearch/tuningsearch-mcp-server.git
cd tuningsearch-mcp-server

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Lint
npm run lint
```

## Troubleshooting

**API key error**: Make sure `TUNINGSEARCH_API_KEY` is set correctly.

**Connection timeout**: Increase timeout: `export TUNINGSEARCH_TIMEOUT=60000`

**Debug issues**: Enable debug logging: `TUNINGSEARCH_LOG_LEVEL=debug tuningsearch-mcp-server`

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: [TuningSearch Docs](https://tuningsearch.com/docs)
- **Issues**: [GitHub Issues](https://github.com/tuningsearch/tuningsearch-mcp-server/issues)
- **Email**: support@tuningsearch.com

---

Made with ❤️ by the TuningSearch team
