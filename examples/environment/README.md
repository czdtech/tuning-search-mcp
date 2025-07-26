# Environment Variable Configuration Templates

This directory contains environment variable configuration templates for different deployment scenarios.

## Available Templates

- **`.env.example`** - Basic template with all available options
- **`.env.development`** - Development environment configuration
- **`.env.production`** - Production environment configuration

## Usage

1. Copy the appropriate template to your project root as `.env`
2. Replace placeholder values with your actual configuration
3. Ensure the `.env` file is not committed to version control

```bash
# Copy the basic template
cp examples/environment/.env.example .env

# Edit with your values
nano .env
```

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `TUNINGSEARCH_API_KEY` | Your TuningSearch API key | `ts_1234567890abcdef` |

### Optional Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `TUNINGSEARCH_BASE_URL` | API base URL | `https://api.tuningsearch.com/v1` | `https://api.tuningsearch.com/v1` |
| `TUNINGSEARCH_TIMEOUT` | Request timeout (ms) | `30000` | `30000` |
| `TUNINGSEARCH_RETRY_ATTEMPTS` | Max retry attempts | `3` | `3` |
| `TUNINGSEARCH_RETRY_DELAY` | Retry delay (ms) | `1000` | `1000` |
| `TUNINGSEARCH_LOG_LEVEL` | Logging level | `info` | `debug` |

## Environment-Specific Configurations

### Development Environment

For development, you might want:
- Higher timeout values for debugging
- More retry attempts
- Debug-level logging
- Longer retry delays

```bash
TUNINGSEARCH_TIMEOUT=60000
TUNINGSEARCH_RETRY_ATTEMPTS=5
TUNINGSEARCH_LOG_LEVEL=debug
```

### Production Environment

For production, consider:
- Standard timeout values
- Conservative retry settings
- Warning-level logging only
- Optimized retry delays

```bash
TUNINGSEARCH_TIMEOUT=30000
TUNINGSEARCH_RETRY_ATTEMPTS=3
TUNINGSEARCH_LOG_LEVEL=warn
```

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use different API keys** for different environments
3. **Restrict API key permissions** when possible
4. **Rotate API keys** regularly
5. **Use environment-specific configurations**

## Loading Environment Variables

### Node.js Applications

```javascript
require('dotenv').config();
const apiKey = process.env.TUNINGSEARCH_API_KEY;
```

### Shell Scripts

```bash
# Load from .env file
export $(cat .env | xargs)

# Or source the file
source .env
```

### Docker

```dockerfile
# Copy environment file
COPY .env .env

# Load environment variables
ENV $(cat .env | xargs)
```

## Validation

You can validate your environment configuration by running:

```bash
# Check if required variables are set
node -e "
require('dotenv').config();
const required = ['TUNINGSEARCH_API_KEY'];
const missing = required.filter(key => !process.env[key]);
if (missing.length) {
  console.error('Missing required environment variables:', missing);
  process.exit(1);
} else {
  console.log('Environment configuration is valid');
}
"
```