# TuningSearch MCP Server Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install global dependencies
RUN npm install -g tuningsearch-mcp-server

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S tuningsearch -u 1001

# Set up environment
ENV NODE_ENV=production
ENV TUNINGSEARCH_LOG_LEVEL=info

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "process.exit(0)" || exit 1

# Switch to non-root user
USER tuningsearch

# Expose port (if needed for health checks)
EXPOSE 3000

# Start the server
CMD ["tuningsearch-mcp-server"]