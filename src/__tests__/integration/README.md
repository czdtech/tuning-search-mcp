# Integration Tests

This directory contains comprehensive integration tests for the TuningSearch MCP Server. These tests verify the complete functionality from MCP protocol compliance to API integration.

## Test Suites

### 1. MCP Protocol Integration Tests (`mcp-protocol.test.ts`)

Tests the Model Context Protocol compliance and tool interactions:

- **Tool Discovery**: Verifies all tools are properly registered and discoverable
- **Search Tool Integration**: Tests complete search tool workflow with various parameters
- **News Tool Integration**: Tests news search functionality with time ranges and filters
- **Crawl Tool Integration**: Tests web page crawling and content extraction
- **Error Handling**: Tests proper error responses and MCP error format compliance
- **Response Format Compliance**: Ensures all responses follow MCP protocol standards
- **Performance and Reliability**: Tests concurrent calls and performance metrics

**Key Features Tested:**
- MCP tool registration and discovery
- Parameter validation and error handling
- Response format compliance
- Concurrent tool execution
- Performance monitoring integration

### 2. API Integration Tests (`api-integration.test.ts`)

Tests real API calls and various search scenarios:

- **Search API Integration**: Comprehensive search testing with all parameters
- **News API Integration**: News search with time ranges, languages, and regions
- **Crawl API Integration**: Web page crawling with different content types
- **Error Handling and Edge Cases**: Rate limiting, authentication, server errors
- **Performance and Load Testing**: Concurrent requests and large responses
- **API Connectivity**: Health checks and connectivity validation
- **Boundary Conditions**: Edge cases like long queries, invalid URLs, etc.

**Key Features Tested:**
- Complete API parameter coverage
- Error handling and retry mechanisms
- Performance under load
- Edge case handling
- API health monitoring

### 3. End-to-End Integration Tests (`end-to-end.test.ts`)

Tests complete workflows from MCP client to API responses:

- **Complete Search Workflow**: Full MCP-to-API search flow
- **Complete News Workflow**: End-to-end news search process
- **Complete Crawl Workflow**: Full crawling workflow
- **Error Handling Workflows**: Complete error scenarios with retry
- **Multi-Tool Workflows**: Sequential and concurrent tool usage
- **Health and Monitoring Workflows**: Health status throughout operations
- **Configuration and Lifecycle Workflows**: Server restart and config updates

**Key Features Tested:**
- Complete request-response cycles
- Multi-tool orchestration
- Server lifecycle management
- Health monitoring integration
- Configuration management

## Running Integration Tests

### Run All Integration Tests
```bash
npm run test:integration
```

### Run Specific Test Suites
```bash
# MCP Protocol tests only
npm run test:integration:mcp

# API Integration tests only
npm run test:integration:api

# End-to-End tests only
npm run test:integration:e2e
```

### Run Unit Tests Only (excluding integration)
```bash
npm run test:unit
```

### Run All Tests (Unit + Integration)
```bash
npm run test:all
```

## Test Environment Setup

The integration tests use a mock API server (MSW) to simulate TuningSearch API responses. This allows for:

- **Predictable Testing**: Consistent responses for reliable test results
- **Error Simulation**: Testing error conditions without affecting real API
- **Performance Testing**: Load testing without API rate limits
- **Offline Testing**: Tests can run without internet connectivity

### Environment Variables

The tests automatically set up test environment variables:

```bash
TUNINGSEARCH_API_KEY=test-api-key
TUNINGSEARCH_BASE_URL=https://api.test.tuningsearch.com/v1
TUNINGSEARCH_TIMEOUT=10000
TUNINGSEARCH_RETRY_ATTEMPTS=2
TUNINGSEARCH_RETRY_DELAY=500
TUNINGSEARCH_LOG_LEVEL=ERROR
```

## Test Coverage

The integration tests cover:

### MCP Protocol Compliance
- ✅ Tool registration and discovery
- ✅ Parameter validation
- ✅ Response format compliance
- ✅ Error handling and reporting
- ✅ Concurrent tool execution

### API Integration
- ✅ All search parameters and options
- ✅ News search with filters
- ✅ Web page crawling
- ✅ Error handling and retry logic
- ✅ Performance monitoring
- ✅ Health checks and connectivity

### End-to-End Workflows
- ✅ Complete request-response cycles
- ✅ Multi-tool orchestration
- ✅ Server lifecycle management
- ✅ Configuration updates
- ✅ Performance and health monitoring

### Error Scenarios
- ✅ API authentication errors
- ✅ Rate limiting and throttling
- ✅ Network connectivity issues
- ✅ Malformed responses
- ✅ Server errors with retry
- ✅ Invalid parameters and edge cases

## Test Data and Mocking

### Mock API Responses

The tests use MSW (Mock Service Worker) to intercept HTTP requests and provide controlled responses:

```typescript
// Example mock response
mockApiServer.use(
  http.post('https://api.test.tuningsearch.com/v1/search', () => {
    return HttpResponse.json({
      success: true,
      data: {
        query: 'test query',
        results: [/* ... */]
      }
    });
  })
);
```

### Test Scenarios

Each test suite includes scenarios for:
- **Happy Path**: Normal successful operations
- **Error Conditions**: Various error types and recovery
- **Edge Cases**: Boundary conditions and unusual inputs
- **Performance**: Load testing and concurrent operations
- **Integration**: Cross-component interactions

## Debugging Integration Tests

### Verbose Output
```bash
npm run test:integration:mcp -- --verbose
```

### Debug Specific Test
```bash
npx jest src/__tests__/integration/mcp-protocol.test.ts --testNamePattern="should handle search tool call"
```

### Enable Debug Logging
```bash
TUNINGSEARCH_LOG_LEVEL=DEBUG npm run test:integration
```

## Continuous Integration

The integration tests are designed to run in CI/CD environments:

- **No External Dependencies**: Uses mock API server
- **Deterministic Results**: Consistent test outcomes
- **Timeout Handling**: Proper test timeouts and cleanup
- **Resource Cleanup**: Proper server shutdown and cleanup

## Adding New Integration Tests

When adding new integration tests:

1. **Choose the Right Suite**: 
   - MCP protocol features → `mcp-protocol.test.ts`
   - API functionality → `api-integration.test.ts`
   - Complete workflows → `end-to-end.test.ts`

2. **Follow Test Structure**:
   ```typescript
   describe('Feature Category', () => {
     beforeEach(async () => {
       // Setup
     });

     afterEach(async () => {
       // Cleanup
     });

     it('should test specific behavior', async () => {
       // Test implementation
     });
   });
   ```

3. **Mock API Responses**: Use MSW to mock external API calls
4. **Test Error Conditions**: Include both success and failure scenarios
5. **Verify Cleanup**: Ensure proper resource cleanup after tests

## Performance Considerations

The integration tests are designed to be:

- **Fast**: Mock API responses eliminate network delays
- **Reliable**: Deterministic responses prevent flaky tests
- **Comprehensive**: Cover all major code paths and scenarios
- **Maintainable**: Clear structure and good documentation

## Troubleshooting

### Common Issues

1. **Test Timeouts**: Increase timeout in test configuration
2. **Port Conflicts**: Ensure no other services are running on test ports
3. **Memory Issues**: Check for proper cleanup in afterEach hooks
4. **Mock Server Issues**: Verify MSW setup and handler registration

### Getting Help

- Check test output for specific error messages
- Use `--verbose` flag for detailed test information
- Enable debug logging with `TUNINGSEARCH_LOG_LEVEL=DEBUG`
- Review mock server setup if API-related tests fail