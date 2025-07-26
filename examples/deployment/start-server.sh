#!/bin/bash

# TuningSearch MCP Server Startup Script
# This script starts the TuningSearch MCP server with proper error handling and logging

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="${SCRIPT_DIR}/server.log"
PID_FILE="${SCRIPT_DIR}/server.pid"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

# Check if server is already running
check_running() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0  # Running
        else
            rm -f "$PID_FILE"
            return 1  # Not running
        fi
    fi
    return 1  # Not running
}

# Load environment variables
load_env() {
    if [ -f "${SCRIPT_DIR}/../environment/.env" ]; then
        log "Loading environment variables from .env file"
        export $(cat "${SCRIPT_DIR}/../environment/.env" | grep -v '^#' | xargs)
    elif [ -f "${SCRIPT_DIR}/.env" ]; then
        log "Loading environment variables from local .env file"
        export $(cat "${SCRIPT_DIR}/.env" | grep -v '^#' | xargs)
    fi
}

# Validate configuration
validate_config() {
    if [ -z "$TUNINGSEARCH_API_KEY" ]; then
        error "TUNINGSEARCH_API_KEY is not set. Please configure your API key."
        exit 1
    fi
    
    log "Configuration validated successfully"
}

# Start the server
start_server() {
    log "Starting TuningSearch MCP Server..."
    
    # Check if already running
    if check_running; then
        warn "Server is already running (PID: $(cat "$PID_FILE"))"
        return 0
    fi
    
    # Load environment and validate
    load_env
    validate_config
    
    # Start the server in background
    nohup npx tuningsearch-mcp-server >> "$LOG_FILE" 2>&1 &
    local pid=$!
    
    # Save PID
    echo "$pid" > "$PID_FILE"
    
    # Wait a moment and check if it started successfully
    sleep 2
    if ps -p "$pid" > /dev/null 2>&1; then
        log "Server started successfully (PID: $pid)"
        log "Log file: $LOG_FILE"
        return 0
    else
        error "Failed to start server"
        rm -f "$PID_FILE"
        return 1
    fi
}

# Stop the server
stop_server() {
    log "Stopping TuningSearch MCP Server..."
    
    if ! check_running; then
        warn "Server is not running"
        return 0
    fi
    
    local pid=$(cat "$PID_FILE")
    kill "$pid"
    
    # Wait for graceful shutdown
    local count=0
    while ps -p "$pid" > /dev/null 2>&1 && [ $count -lt 10 ]; do
        sleep 1
        count=$((count + 1))
    done
    
    # Force kill if still running
    if ps -p "$pid" > /dev/null 2>&1; then
        warn "Forcing server shutdown"
        kill -9 "$pid"
    fi
    
    rm -f "$PID_FILE"
    log "Server stopped successfully"
}

# Restart the server
restart_server() {
    log "Restarting TuningSearch MCP Server..."
    stop_server
    sleep 1
    start_server
}

# Show server status
status_server() {
    if check_running; then
        local pid=$(cat "$PID_FILE")
        log "Server is running (PID: $pid)"
        
        # Show some basic stats
        if command -v ps > /dev/null; then
            ps -p "$pid" -o pid,ppid,cmd,etime,pcpu,pmem
        fi
    else
        log "Server is not running"
    fi
}

# Show logs
show_logs() {
    if [ -f "$LOG_FILE" ]; then
        tail -f "$LOG_FILE"
    else
        error "Log file not found: $LOG_FILE"
    fi
}

# Main script logic
case "${1:-start}" in
    start)
        start_server
        ;;
    stop)
        stop_server
        ;;
    restart)
        restart_server
        ;;
    status)
        status_server
        ;;
    logs)
        show_logs
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the TuningSearch MCP server"
        echo "  stop    - Stop the TuningSearch MCP server"
        echo "  restart - Restart the TuningSearch MCP server"
        echo "  status  - Show server status"
        echo "  logs    - Show server logs (tail -f)"
        exit 1
        ;;
esac