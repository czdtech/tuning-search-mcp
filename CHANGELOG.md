# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial implementation of TuningSearch MCP Server
- Support for web search via TuningSearch API
- Support for news search functionality
- Support for web page crawling
- Comprehensive error handling and retry mechanisms
- Performance monitoring and caching
- Full TypeScript support with type definitions
- Comprehensive test suite (unit and integration tests)
- MCP protocol compliance

### Changed
- N/A (initial release)

### Deprecated
- N/A (initial release)

### Removed
- N/A (initial release)

### Fixed
- N/A (initial release)

### Security
- Secure API key handling via environment variables
- Input validation for all tool parameters
- URL validation for crawling operations

## [1.0.0] - 2024-01-XX

### Added
- Initial release of TuningSearch MCP Server
- Complete MCP server implementation with three main tools:
  - `tuningsearch_search`: General web search functionality
  - `tuningsearch_news`: News-specific search functionality  
  - `tuningsearch_crawl`: Web page crawling functionality
- Comprehensive configuration management
- Error handling with custom error types
- Retry mechanisms with exponential backoff
- Result caching and performance optimization
- Health check and monitoring capabilities
- Full TypeScript support
- Extensive test coverage
- Production-ready build configuration
- NPM package ready for distribution

### Technical Features
- Built with TypeScript 5.0+
- Uses @modelcontextprotocol/sdk for MCP compliance
- Supports Node.js 18+
- Comprehensive error handling
- Configurable retry mechanisms
- Memory caching for performance
- Structured logging
- Health check endpoints
- Production optimized builds

### Documentation
- Complete README with installation and usage instructions
- API documentation for all tools
- Configuration examples for various MCP clients
- Troubleshooting guide
- Development setup instructions