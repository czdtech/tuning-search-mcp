# Deployment Examples

This directory contains various deployment scripts and configurations for running the TuningSearch MCP Server in different environments.

## Available Deployment Options

### Shell Scripts

- **`start-server.sh`** - Linux/macOS startup script with process management
- **`start-server.bat`** - Windows startup script with process management

### Docker

- **`Dockerfile`** - Docker image for containerized deployment
- **`docker-compose.yml`** - Docker Compose configuration for easy deployment

### System Services

- **`systemd-service.service`** - Systemd service configuration for Linux

## Quick Start

### Linux/macOS

```bash
# Make the script executable
chmod +x examples/deployment/start-server.sh

# Start the server
./examples/deployment/start-server.sh start

# Check status
./examples/deployment/start-server.sh status

# View logs
./examples/deployment/start-server.sh logs

# Stop the server
./examples/deployment/start-server.sh stop
```

### Windows

```cmd
REM Start the server
examples\deployment\start-server.bat start

REM Check status
examples\deployment\start-server.bat status

REM Stop the server
examples\deployment\start-server.bat stop
```

### Docker

```bash
# Build and run with Docker Compose
cd examples/deployment
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## Detailed Instructions

### Shell Script Deployment

The shell scripts provide comprehensive process management with:

- **Process monitoring**: Check if server is running
- **Logging**: Automatic log file creation and rotation
- **Error handling**: Graceful error handling and recovery
- **Environment loading**: Automatic environment variable loading
- **Health checks**: Basic health monitoring

#### Features

- **start**: Start the server in background
- **stop**: Gracefully stop the server
- **restart**: Restart the server
- **status**: Show current server status
- **logs**: Display server logs in real-time

#### Configuration

1. Copy environment template:
```bash
cp examples/environment/.env.example examples/deployment/.env
```

2. Edit the configuration:
```bash
nano examples/deployment/.env
```

3. Set your API key:
```bash
TUNINGSEARCH_API_KEY=your_api_key_here
```

### Docker Deployment

Docker deployment provides:

- **Containerization**: Isolated environment
- **Easy scaling**: Simple horizontal scaling
- **Health checks**: Built-in health monitoring
- **Log management**: Structured logging with rotation

#### Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+

#### Setup

1. Create environment file:
```bash
cp examples/environment/.env.example examples/deployment/.env
```

2. Configure your API key:
```bash
echo "TUNINGSEARCH_API_KEY=your_api_key_here" > examples/deployment/.env
```

3. Start with Docker Compose:
```bash
cd examples/deployment
docker-compose up -d
```

#### Docker Commands

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f tuningsearch-mcp-server

# Scale the service
docker-compose up -d --scale tuningsearch-mcp-server=3

# Update the service
docker-compose pull
docker-compose up -d

# Stop services
docker-compose down

# Remove everything including volumes
docker-compose down -v
```

### Systemd Service (Linux)

For production Linux deployments, use systemd for automatic startup and management.

#### Installation

1. Create service user:
```bash
sudo useradd -r -s /bin/false tuningsearch
```

2. Create application directory:
```bash
sudo mkdir -p /opt/tuningsearch-mcp-server
sudo chown tuningsearch:tuningsearch /opt/tuningsearch-mcp-server
```

3. Install the service:
```bash
sudo cp examples/deployment/systemd-service.service /etc/systemd/system/tuningsearch-mcp-server.service
```

4. Create environment file:
```bash
sudo cp examples/environment/.env.production /opt/tuningsearch-mcp-server/.env
sudo chown tuningsearch:tuningsearch /opt/tuningsearch-mcp-server/.env
sudo chmod 600 /opt/tuningsearch-mcp-server/.env
```

5. Configure the service:
```bash
sudo nano /opt/tuningsearch-mcp-server/.env
# Set TUNINGSEARCH_API_KEY=your_api_key_here
```

6. Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable tuningsearch-mcp-server
sudo systemctl start tuningsearch-mcp-server
```

#### Systemd Commands

```bash
# Start the service
sudo systemctl start tuningsearch-mcp-server

# Stop the service
sudo systemctl stop tuningsearch-mcp-server

# Restart the service
sudo systemctl restart tuningsearch-mcp-server

# Check status
sudo systemctl status tuningsearch-mcp-server

# View logs
sudo journalctl -u tuningsearch-mcp-server -f

# Enable auto-start on boot
sudo systemctl enable tuningsearch-mcp-server

# Disable auto-start
sudo systemctl disable tuningsearch-mcp-server
```

## Production Considerations

### Security

1. **API Key Protection**:
   - Store API keys in secure environment variables
   - Use different keys for different environments
   - Rotate keys regularly

2. **File Permissions**:
   - Restrict access to configuration files
   - Run services with minimal privileges
   - Use dedicated service accounts

3. **Network Security**:
   - Use HTTPS for all API communications
   - Implement proper firewall rules
   - Consider using VPN for internal communications

### Monitoring

1. **Health Checks**:
   - Implement regular health checks
   - Monitor API response times
   - Track error rates

2. **Logging**:
   - Use structured logging
   - Implement log rotation
   - Monitor log files for errors

3. **Metrics**:
   - Track request counts
   - Monitor memory usage
   - Alert on high error rates

### Scaling

1. **Horizontal Scaling**:
   - Use load balancers
   - Deploy multiple instances
   - Implement session affinity if needed

2. **Vertical Scaling**:
   - Monitor resource usage
   - Adjust memory limits
   - Optimize CPU allocation

### Backup and Recovery

1. **Configuration Backup**:
   - Backup environment files
   - Version control configurations
   - Document recovery procedures

2. **Disaster Recovery**:
   - Test recovery procedures
   - Maintain multiple deployment environments
   - Implement automated failover

## Troubleshooting

### Common Issues

1. **Server won't start**:
   - Check API key configuration
   - Verify network connectivity
   - Review log files for errors

2. **Permission denied**:
   - Check file permissions
   - Verify user privileges
   - Ensure proper ownership

3. **Port conflicts**:
   - Check for conflicting services
   - Use different ports if needed
   - Verify firewall settings

### Debug Mode

Enable debug logging for troubleshooting:

```bash
export TUNINGSEARCH_LOG_LEVEL=debug
```

### Log Analysis

Check logs for common patterns:

```bash
# Check for API key errors
grep -i "api.*key" server.log

# Check for network errors
grep -i "network\|timeout\|connection" server.log

# Check for rate limiting
grep -i "rate.*limit" server.log
```