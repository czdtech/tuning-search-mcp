# MCP Client Configuration Examples

This directory contains configuration examples for various MCP (Model Context Protocol) clients.

## Available Configurations

### Claude Desktop

- **`claude-desktop.json`** - Basic configuration for Claude Desktop
- **`claude-desktop-advanced.json`** - Advanced configuration with all options
- **`claude-desktop-local.json`** - Configuration for locally installed server

### Generic MCP Client

- **`generic-mcp-client.json`** - Generic configuration template for other MCP clients

## Usage Instructions

### Claude Desktop

1. Locate your Claude Desktop configuration file:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **Linux**: `~/.config/Claude/claude_desktop_config.json`

2. Copy the contents of the desired configuration file
3. Replace `your_api_key_here` with your actual TuningSearch API key
4. Restart Claude Desktop

### Other MCP Clients

1. Copy the appropriate configuration template
2. Adapt the format to match your MCP client's requirements
3. Replace `your_api_key_here` with your actual API key
4. Configure any additional client-specific settings

## Configuration Options

### Basic Configuration

The minimal configuration requires only the API key:

```json
{
  "mcpServers": {
    "tuningsearch": {
      "command": "npx",
      "args": ["-y", "tuningsearch-mcp-server"],
      "env": {
        "TUNINGSEARCH_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### Advanced Configuration

For production use or specific requirements, you can configure additional options:

```json
{
  "mcpServers": {
    "tuningsearch": {
      "command": "npx",
      "args": ["-y", "tuningsearch-mcp-server"],
      "env": {
        "TUNINGSEARCH_API_KEY": "your_api_key_here",
        "TUNINGSEARCH_BASE_URL": "https://api.tuningsearch.com/v1",
        "TUNINGSEARCH_TIMEOUT": "30000",
        "TUNINGSEARCH_RETRY_ATTEMPTS": "3",
        "TUNINGSEARCH_RETRY_DELAY": "1000",
        "TUNINGSEARCH_LOG_LEVEL": "info"
      }
    }
  }
}
```

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `TUNINGSEARCH_API_KEY` | Your TuningSearch API key | - | Yes |
| `TUNINGSEARCH_BASE_URL` | API base URL | `https://api.tuningsearch.com/v1` | No |
| `TUNINGSEARCH_TIMEOUT` | Request timeout in milliseconds | `30000` | No |
| `TUNINGSEARCH_RETRY_ATTEMPTS` | Number of retry attempts | `3` | No |
| `TUNINGSEARCH_RETRY_DELAY` | Delay between retries in milliseconds | `1000` | No |
| `TUNINGSEARCH_LOG_LEVEL` | Logging level (error, warn, info, debug) | `info` | No |

## Troubleshooting

### Common Issues

1. **Server not starting**: Check that the API key is correctly set
2. **Permission denied**: Ensure the command has proper execution permissions
3. **Module not found**: Try installing globally with `npm install -g tuningsearch-mcp-server`

### Testing Configuration

You can test your configuration by running the server directly:

```bash
TUNINGSEARCH_API_KEY="your_key" npx tuningsearch-mcp-server
```

If the server starts without errors, your configuration should work with MCP clients.