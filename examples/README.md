# TuningSearch MCP Server - Examples

This directory contains comprehensive examples and templates for deploying and configuring TuningSearch MCP Server in various environments.

## 📁 Directory Structure

### 🖥️ MCP Client Configurations (`mcp-clients/`)
Ready-to-use configuration files for popular MCP clients:
- **Claude Desktop** - Basic, advanced, and local development configs
- **Generic MCP Client** - Universal configuration template

### 🌍 Environment Templates (`environment/`)
Environment variable templates for different deployment scenarios:
- **Development** - Local development settings
- **Production** - Production-ready configuration
- **Example** - Template with all available options

### 🚀 Deployment Examples (`deployment/`)
Scripts and configurations for various deployment methods:
- **Docker** - Container deployment with docker-compose
- **Systemd** - Linux service configuration
- **Startup Scripts** - Windows and Linux startup scripts

## 🚀 Quick Start

### 1. Choose Your Client
Select the appropriate configuration from `mcp-clients/` based on your MCP client.

### 2. Get Your API Key
1. Visit [TuningSearch.com](https://tuningsearch.com)
2. Sign up for a free account
3. Navigate to your dashboard
4. Generate an API key

### 3. Configure
Copy the relevant configuration file and replace `your_api_key_here` with your actual API key.

### 4. Deploy
Use the deployment examples in `deployment/` to set up your preferred hosting method.

## 📋 Configuration Options

All configurations support these environment variables:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TUNINGSEARCH_API_KEY` | ✅ Yes | - | Your TuningSearch API key |
| `TUNINGSEARCH_BASE_URL` | ❌ No | `https://api.tuningsearch.com/v1` | API base URL |
| `TUNINGSEARCH_TIMEOUT` | ❌ No | `30000` | Request timeout (ms) |
| `TUNINGSEARCH_RETRY_ATTEMPTS` | ❌ No | `3` | Number of retry attempts |
| `TUNINGSEARCH_RETRY_DELAY` | ❌ No | `1000` | Delay between retries (ms) |
| `TUNINGSEARCH_LOG_LEVEL` | ❌ No | `info` | Log level (debug, info, warn, error) |
| `TUNINGSEARCH_LOG_FORMAT` | ❌ No | `json` | Log format (json, text) |

## 🔧 Customization

Each example includes comments explaining:
- Required vs optional settings
- Performance tuning options
- Security considerations
- Troubleshooting tips

## 📚 Additional Resources

- [Main Documentation](../README.md)
- [Quick Start Guide](../QUICK-START.md)
- [Project Structure](../PROJECT-STRUCTURE.md)
- [Contributing Guide](../CONTRIBUTING.md)

## 🆘 Need Help?

If you encounter issues with any of these examples:
1. Check the troubleshooting section in the main README
2. Review the configuration comments
3. Open an issue on GitHub with your specific setup details