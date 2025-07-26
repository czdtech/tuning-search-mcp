# Project Structure

This document outlines the structure and organization of the TuningSearch MCP Server project.

## 📁 Directory Structure

```
tuningsearch-mcp-server/
├── src/                          # Source code
│   ├── clients/                  # API clients
│   │   ├── index.ts             # Client exports
│   │   └── tuningsearch-client.ts # TuningSearch API client
│   ├── handlers/                 # MCP tool handlers
│   │   ├── crawl-tool-handler.ts # Web crawling handler
│   │   ├── news-tool-handler.ts  # News search handler
│   │   ├── search-tool-handler.ts # Web search handler
│   │   └── index.ts             # Handler exports
│   ├── services/                 # Business logic services
│   │   ├── cache-service.ts     # Response caching
│   │   ├── config-service.ts    # Configuration management
│   │   ├── error-handler.ts     # Error handling
│   │   ├── health-check.ts      # Health monitoring
│   │   ├── logger.ts            # Logging service
│   │   ├── performance-monitor.ts # Performance tracking
│   │   ├── result-formatter.ts  # Result formatting
│   │   ├── retry-service.ts     # Retry logic
│   │   ├── search-service.ts    # Core search logic
│   │   └── index.ts             # Service exports
│   ├── tools/                    # MCP tool definitions
│   │   ├── crawl-tool.ts        # Crawl tool definition
│   │   ├── news-tool.ts         # News tool definition
│   │   ├── search-tool.ts       # Search tool definition
│   │   └── index.ts             # Tool exports
│   ├── types/                    # TypeScript type definitions
│   │   ├── api-responses.ts     # API response types
│   │   ├── config-types.ts      # Configuration types
│   │   ├── error-types.ts       # Error types
│   │   ├── logger-types.ts      # Logger types
│   │   ├── tool-types.ts        # Tool types
│   │   └── index.ts             # Type exports
│   ├── __tests__/               # Test files
│   │   ├── integration/         # Integration tests
│   │   └── *.test.ts           # Unit tests
│   ├── index.ts                 # Main entry point
│   └── server.ts                # MCP server implementation
├── examples/                     # Usage examples
│   ├── deployment/              # Deployment examples
│   │   ├── docker-compose.yml  # Docker deployment
│   │   ├── Dockerfile           # Docker image
│   │   ├── start-server.sh      # Linux startup script
│   │   ├── start-server.bat     # Windows startup script
│   │   ├── systemd-service.service # Systemd service
│   │   └── README.md            # Deployment guide
│   ├── environment/             # Environment examples
│   │   ├── .env.development     # Development config
│   │   ├── .env.production      # Production config
│   │   ├── .env.example         # Example config
│   │   └── README.md            # Environment guide
│   ├── mcp-clients/             # MCP client configs
│   │   ├── claude-desktop.json  # Basic Claude config
│   │   ├── claude-desktop-advanced.json # Advanced config
│   │   ├── claude-desktop-local.json # Local development
│   │   ├── generic-mcp-client.json # Generic client
│   │   └── README.md            # Client setup guide
│   └── README.md                # Examples overview
├── scripts/                     # Build and deployment scripts
│   ├── pre-deploy-check.js      # Pre-deployment validation
│   ├── test-deployment-environments.ts # Environment testing
│   └── verify-deployment.ts     # Deployment verification
├── dist/                        # Compiled JavaScript (generated)
├── node_modules/                # Dependencies (generated)
├── .env.example                 # Environment variables template
├── .eslintrc.js                 # ESLint configuration
├── .gitignore                   # Git ignore rules
├── .npmignore                   # NPM ignore rules
├── CHANGELOG.md                 # Version history
├── jest.config.js               # Jest test configuration
├── LICENSE                      # MIT license
├── package.json                 # NPM package configuration
├── package-lock.json            # Dependency lock file
├── QUICK-START.md               # Quick start guide
├── README.md                    # Main documentation
├── tsconfig.json                # TypeScript configuration
└── tsconfig.build.json          # Build-specific TypeScript config
```

## 🏗️ Architecture Overview

### Core Components

1. **MCP Server (`src/server.ts`)**
   - Implements Model Context Protocol
   - Manages tool registration and execution
   - Handles client connections

2. **Tool Handlers (`src/handlers/`)**
   - Process MCP tool requests
   - Validate input parameters
   - Format responses

3. **Services (`src/services/`)**
   - Business logic implementation
   - API client management
   - Caching and performance optimization

4. **API Client (`src/clients/`)**
   - TuningSearch API integration
   - Request/response handling
   - Error management

### Data Flow

```
MCP Client → MCP Server → Tool Handler → Service → API Client → TuningSearch API
                ↓
         Response Formatter → Cache Service → MCP Client
```

## 📦 Build Process

1. **Development**: `npm run dev`
   - TypeScript compilation in watch mode
   - Automatic restart on changes

2. **Build**: `npm run build`
   - Clean previous build
   - TypeScript compilation
   - Generate type definitions
   - Verify build output

3. **Test**: `npm test`
   - Unit tests with Jest
   - Integration tests
   - Coverage reporting

4. **Package**: `npm pack`
   - Create distributable package
   - Include only necessary files
   - Verify package contents

## 🔧 Configuration

### Environment Variables

- `TUNINGSEARCH_API_KEY`: TuningSearch API key (required)
- `TUNINGSEARCH_BASE_URL`: API base URL (optional)
- `TUNINGSEARCH_TIMEOUT`: Request timeout (optional)
- `TUNINGSEARCH_LOG_LEVEL`: Logging level (optional)

### Configuration Files

- `package.json`: NPM package metadata and scripts
- `tsconfig.json`: TypeScript compiler options
- `jest.config.js`: Test framework configuration
- `.eslintrc.js`: Code linting rules

## 🧪 Testing Strategy

### Unit Tests
- Individual component testing
- Mock external dependencies
- High code coverage target (>90%)

### Integration Tests
- End-to-end functionality testing
- Real API integration testing
- MCP protocol compliance testing

### Performance Tests
- Response time benchmarks
- Memory usage monitoring
- Concurrent request handling

## 📋 File Naming Conventions

- **Source files**: `kebab-case.ts`
- **Test files**: `kebab-case.test.ts`
- **Type files**: `kebab-case-types.ts`
- **Config files**: `lowercase.config.js`
- **Documentation**: `UPPERCASE.md` or `Title-Case.md`

## 🚀 Deployment

### NPM Package
- Published to npm registry
- Includes compiled JavaScript
- Type definitions included
- CLI executable configured

### Docker Container
- Multi-stage build
- Optimized image size
- Health check included
- Environment configuration

### System Service
- Systemd service file
- Automatic startup
- Log rotation
- Process monitoring

## 📈 Monitoring

### Health Checks
- API connectivity
- Response time monitoring
- Error rate tracking
- Memory usage alerts

### Logging
- Structured JSON logging
- Multiple log levels
- Request/response logging
- Error stack traces

### Performance Metrics
- Request latency
- Throughput measurements
- Cache hit rates
- API quota usage

## 🔄 Development Workflow

1. **Feature Development**
   - Create feature branch
   - Implement with tests
   - Code review process
   - Merge to main

2. **Release Process**
   - Version bump
   - Update changelog
   - Create release tag
   - Publish to npm

3. **Quality Assurance**
   - Automated testing
   - Code coverage checks
   - Security scanning
   - Performance validation

This structure ensures maintainability, scalability, and ease of development while following TypeScript and Node.js best practices.