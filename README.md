# TuningSearch MCP Server

[![npm version](https://badge.fury.io/js/tuningsearch-mcp-server.svg)](https://badge.fury.io/js/tuningsearch-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-blue)](https://modelcontextprotocol.io/)

A powerful Model Context Protocol (MCP) server that integrates [TuningSearch API](https://tuningsearch.com) capabilities, providing AI assistants with comprehensive web search, news search, and web crawling functionality.

## 🌟 Features

### 🔍 Web Search

- **Comprehensive Search Results**: Get high-quality web search results with titles, URLs, content snippets, and metadata
- **Advanced Filtering**: Support for language, country, time range, and safety filters
- **Smart Ranking**: Results include quality scores and relevance ranking
- **Search Suggestions**: Automatic query suggestions for better search experience

### � News Search

- **Real-time News**: Access to latest news articles from various sources
- **Categorized Results**: News results with source information and publication dates
- **Geographic Filtering**: Filter news by country and language
- **Trending Topics**: Discover trending news topics and stories

### 🌐 Web Crawling

- **Content Extraction**: Extract clean text content from any web page
- **Smart Processing**: Automatic content cleaning and formatting
- **Fast Response**: Optimized crawling with reasonable timeouts
- **Error Handling**: Robust error handling for various web page types

### 🚀 Advanced Features

- **Caching System**: Built-in response caching for improved performance
- **Retry Mechanism**: Automatic retry with exponential backoff for failed requests
- **Health Monitoring**: Comprehensive health checks and performance monitoring
- **Configurable Logging**: Structured logging with multiple levels
- **Type Safety**: Full TypeScript support with comprehensive type definitions

## 📦 Installation

### Global Installation (Recommended)

```bash
npm install -g tuningsearch-mcp-server
```

### Local Installation

```bash
npm install tuningsearch-mcp-server
```

### From Source

```bash
git clone https://github.com/tuningsearch/tuningsearch-mcp-server.git
cd tuningsearch-mcp-server
npm install
npm run build
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file or set environment variables:

```bash
# Required
TUNINGSEARCH_API_KEY=your_api_key_here

# Optional Configuration
TUNINGSEARCH_BASE_URL=https://api.tuningsearch.com/v1
TUNINGSEARCH_TIMEOUT=30000
TUNINGSEARCH_RETRY_ATTEMPTS=3
TUNINGSEARCH_RETRY_DELAY=1000
TUNINGSEARCH_LOG_LEVEL=info
TUNINGSEARCH_LOG_FORMAT=json
```

### Getting Your API Key

1. Visit [TuningSearch](https://tuningsearch.com)
2. Sign up for an account
3. Navigate to your dashboard
4. Generate an API key
5. Copy the key to your environment variables

## 🚀 Usage

### Command Line

```bash
# Start the server
TUNINGSEARCH_API_KEY="your_key" tuningsearch-mcp-server

# With custom configuration
TUNINGSEARCH_API_KEY="your_key" TUNINGSEARCH_LOG_LEVEL="debug" tuningsearch-mcp-server

# Show help
tuningsearch-mcp-server --help
```

### MCP Client Configuration

#### Claude Desktop

Add to your Claude Desktop configuration file:

**Windows**: `%APPDATA%\\Claude\\claude_desktop_config.json`
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
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

#### Other MCP Clients

```json
{
  "mcpServers": {
    "tuningsearch": {
      "command": "node",
      "args": ["/path/to/tuningsearch-mcp-server/dist/index.js"],
      "env": {
        "TUNINGSEARCH_API_KEY": "your_api_key_here",
        "TUNINGSEARCH_LOG_LEVEL": "info"
      }
    }
  }
}
```

## 🛠️ Available Tools

### 1. Web Search (`tuningsearch_search`)

Search the web for comprehensive results.

**Parameters:**

- `q` (required): Search query
- `language` (optional): Language code (e.g., "en", "zh", "es")
- `country` (optional): Country code (e.g., "US", "CN", "GB")
- `page` (optional): Page number (default: 1)
- `safe` (optional): Safe search level (0-2, default: 0)
- `timeRange` (optional): Time range filter ("day", "week", "month", "year")
- `service` (optional): Search service to use

**Example:**

```json
{
  "q": "artificial intelligence latest developments",
  "language": "en",
  "country": "US",
  "page": 1,
  "safe": 1
}
```

### 2. News Search (`tuningsearch_news`)

Search for recent news articles.

**Parameters:**

- `q` (required): News search query
- `language` (optional): Language code
- `country` (optional): Country code
- `page` (optional): Page number (default: 1)
- `timeRange` (optional): Time range filter
- `service` (optional): News service to use

**Example:**

```json
{
  "q": "technology breakthrough 2025",
  "language": "en",
  "country": "US",
  "timeRange": "week"
}
```

### 3. Web Crawling (`tuningsearch_crawl`)

Extract content from web pages.

**Parameters:**

- `url` (required): URL to crawl

**Example:**

```json
{
  "url": "https://example.com/article"
}
```

## 📊 Response Format

All tools return structured responses with:

- **Rich Content**: Formatted text with titles, URLs, and descriptions
- **Metadata**: Quality scores, domains, keywords, and relevance information
- **Error Handling**: Clear error messages with helpful suggestions
- **Performance Info**: Response times and result counts

## ⚙️ Advanced Configuration

### Logging Configuration

```bash
# Set log level
TUNINGSEARCH_LOG_LEVEL=debug  # debug, info, warn, error

# Set log format
TUNINGSEARCH_LOG_FORMAT=json  # json, text
```

### Performance Tuning

```bash
# Adjust timeout (milliseconds)
TUNINGSEARCH_TIMEOUT=45000

# Configure retry behavior
TUNINGSEARCH_RETRY_ATTEMPTS=5
TUNINGSEARCH_RETRY_DELAY=2000
```

### Custom API Endpoint

```bash
# Use custom API endpoint
TUNINGSEARCH_BASE_URL=https://your-custom-api.com/v1
```

## 🔍 Troubleshooting

### Common Issues

#### "API key is required" Error

```bash
# Make sure your API key is set
echo $TUNINGSEARCH_API_KEY

# Set it if missing
export TUNINGSEARCH_API_KEY="your_key_here"
```

#### Connection Timeout

```bash
# Increase timeout
export TUNINGSEARCH_TIMEOUT=60000
```

#### Rate Limiting

```bash
# Reduce retry attempts or increase delay
export TUNINGSEARCH_RETRY_ATTEMPTS=2
export TUNINGSEARCH_RETRY_DELAY=3000
```

### Debug Mode

Enable debug logging for detailed information:

```bash
TUNINGSEARCH_LOG_LEVEL=debug tuningsearch-mcp-server
```

### Health Check

The server includes built-in health monitoring. Check logs for health status:

```bash
# Look for health check messages
grep "Health check" server.log
```

## 🧪 Development

### Prerequisites

- Node.js 18+
- npm 8+
- TypeScript 5+

### Setup

```bash
git clone https://github.com/tuningsearch/tuningsearch-mcp-server.git
cd tuningsearch-mcp-server
npm install
```

### Development Commands

```bash
# Build the project
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Type check
npm run type-check

# Start development server
npm run dev
```

### Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration

# Run with coverage
npm run test:coverage
```

## 📚 API Reference

### TuningSearch API

This server integrates with the [TuningSearch API](https://tuningsearch.com/docs). Key endpoints:

- **Search**: `/search` - Web search functionality
- **News**: `/news` - News search functionality
- **Crawl**: `/crawl` - Web page content extraction

### MCP Protocol

Implements [Model Context Protocol](https://modelcontextprotocol.io/) specification:

- **Tools**: Exposes search, news, and crawl tools
- **Resources**: Provides structured data access
- **Prompts**: Supports dynamic prompt generation

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

For project structure and development guidelines, see [Project Structure](PROJECT-STRUCTURE.md).

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run the test suite
6. Submit a pull request

### Code Style

- Use TypeScript
- Follow ESLint configuration
- Add JSDoc comments
- Write comprehensive tests

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [TuningSearch](https://tuningsearch.com) for providing the search API
- [Model Context Protocol](https://modelcontextprotocol.io/) for the MCP specification
- [Anthropic](https://www.anthropic.com/) for Claude and MCP development

## 📞 Support

- **Documentation**: [TuningSearch Docs](https://tuningsearch.com/docs)
- **Issues**: [GitHub Issues](https://github.com/tuningsearch/tuningsearch-mcp-server/issues)
- **Discussions**: [GitHub Discussions](https://github.com/tuningsearch/tuningsearch-mcp-server/discussions)
- **Email**: support@tuningsearch.com

## 🗺️ Roadmap

- [ ] Image search support
- [ ] Video search integration
- [ ] Advanced filtering options
- [ ] Custom result formatting
- [ ] Webhook support
- [ ] GraphQL API integration
- [ ] Multi-language documentation

---

**Made with ❤️ by the TuningSearch team**

_Empowering AI assistants with comprehensive search capabilities_
