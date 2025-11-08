/**
 * MCP Client Compatibility Tests
 * Tests compatibility with different MCP clients and environments
 */

import { TuningSearchServer } from "../../server.js";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

// Mock MSW server for compatibility testing
const mockApiServer = setupServer(
  http.get("https://api.test.tuningsearch.com/v1/search", ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get("q") || "compatibility test";

    return HttpResponse.json({
      success: true,
      data: {
        query: query,
        results: [
          {
            title: "Compatibility Test Result",
            url: "https://example.com/compatibility",
            content: "MCP client compatibility test content",
            position: 1,
          },
        ],
      },
      message: "Search completed successfully",
      code: "SUCCESS",
    });
  }),

  http.get("https://api.test.tuningsearch.com/v1/news", ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get("q") || "compatibility news";

    return HttpResponse.json({
      success: true,
      data: {
        query: query,
        results: [
          {
            title: "Compatibility News Result",
            url: "https://news.example.com/compatibility",
            content: "MCP client compatibility news content",
            position: 1,
            publishedDate: "2024-01-15T12:00:00Z",
            source: "Compatibility News",
          },
        ],
      },
      message: "News search completed successfully",
      code: "SUCCESS",
    });
  }),

  http.get("https://api.test.tuningsearch.com/v1/crawl", ({ request }) => {
    const url = new URL(request.url);
    const targetUrl =
      url.searchParams.get("url") || "https://example.com/compatibility";

    return HttpResponse.json({
      success: true,
      data: {
        url: targetUrl,
        title: "Compatibility Test Page",
        content: "MCP client compatibility crawl content",
        metadata: {
          description: "Compatibility test page description",
        },
      },
      message: "Crawl completed successfully",
      code: "SUCCESS",
    });
  }),

  http.get("https://api.test.tuningsearch.com/v1/health", () => {
    return HttpResponse.json({
      success: true,
      message: "API is healthy",
      code: "SUCCESS",
    });
  })
);

describe("MCP Client Compatibility Tests", () => {
  let server: TuningSearchServer;

  beforeAll(() => {
    mockApiServer.listen();
    // Set test environment variables
    process.env.TUNINGSEARCH_API_KEY = "test-api-key";
    process.env.TUNINGSEARCH_BASE_URL = "https://api.test.tuningsearch.com/v1";
    process.env.TUNINGSEARCH_LOG_LEVEL = "ERROR";
  });

  afterAll(() => {
    mockApiServer.close();
  });

  beforeEach(async () => {
    mockApiServer.resetHandlers();

    server = new TuningSearchServer({
      name: "compatibility-test-server",
      version: "1.0.0-compatibility",
    });

    await server.run();
  });

  afterEach(async () => {
    if (server && server.isServerRunning()) {
      await server.stop();
    }
  });

  describe("Claude Desktop Compatibility", () => {
    it("should work with Claude Desktop MCP configuration", async () => {
      // Simulate Claude Desktop environment
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        MCP_CLIENT: "claude-desktop",
        MCP_CLIENT_VERSION: "1.0.0",
      };

      const searchArgs = {
        q: "Claude Desktop compatibility test",
        language: "en",
      };

      const result = await executeToolCall(
        server,
        "tuningsearch_search",
        searchArgs
      );

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0]?.type).toBe("text");

      const responseText = result.content[0]?.text || "";
      expect(responseText).toContain("Compatibility Test Result");

      // Restore environment
      process.env = originalEnv;
    });

    it("should handle Claude Desktop tool call format", async () => {
      // Test with Claude Desktop specific parameters
      const claudeArgs = {
        q: "Claude specific search",
        // Claude might send additional metadata
        _metadata: {
          client: "claude-desktop",
          version: "1.0.0",
          requestId: "claude-req-123",
        },
      };

      const result = await executeToolCall(
        server,
        "tuningsearch_search",
        claudeArgs
      );

      expect(result.isError).toBe(false);
      expect(result.content[0]?.text).toContain("Compatibility Test Result");
    });

    it("should provide Claude-compatible error responses", async () => {
      mockApiServer.use(
        http.get("https://api.test.tuningsearch.com/v1/search", () => {
          return HttpResponse.json(
            {
              success: false,
              message: "API rate limit exceeded",
              code: "RATE_LIMIT_ERROR",
            },
            { status: 429 }
          );
        })
      );

      const result = await executeToolCall(server, "tuningsearch_search", {
        q: "error test",
      });

      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0]?.type).toBe("text");
      expect(result.content[0]?.text).toContain("rate limit");
    });
  });

  describe("Generic MCP Client Compatibility", () => {
    it("should work with standard MCP protocol", async () => {
      const standardArgs = {
        q: "standard MCP test",
      };

      const result = await executeToolCall(
        server,
        "tuningsearch_search",
        standardArgs
      );

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0]?.type).toBe("text");

      // Verify MCP-compliant response structure
      expect(result).toHaveProperty("content");
      expect(result).toHaveProperty("isError");
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty("type");
      expect(result.content[0]).toHaveProperty("text");
    });

    it("should handle various parameter formats", async () => {
      const testCases = [
        // Minimal parameters
        { q: "minimal test" },
        // Full parameters
        {
          q: "full test",
          language: "en",
          country: "US",
          page: 1,
          safe: 0,
          timeRange: "week",
          service: "google",
        },
        // Mixed case parameters (some clients might send these)
        {
          Q: "mixed case test",
          Language: "en",
        },
      ];

      for (const args of testCases) {
        const result = await executeToolCall(
          server,
          "tuningsearch_search",
          args
        );

        // Should handle all parameter formats gracefully
        expect(result.content).toHaveLength(1);
        expect(result.content[0]?.type).toBe("text");
      }
    });

    it("should validate required parameters consistently", async () => {
      // Test missing required parameter
      const result = await executeToolCall(server, "tuningsearch_search", {});

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain("query");
    });
  });

  describe("Cross-Platform Compatibility", () => {
    it("should work on Windows environment", async () => {
      // Simulate Windows environment
      const originalPlatform = process.platform;
      Object.defineProperty(process, "platform", {
        value: "win32",
      });

      const result = await executeToolCall(server, "tuningsearch_search", {
        q: "Windows compatibility test",
      });

      expect(result.isError).toBe(false);
      expect(result.content[0]?.text).toContain("Compatibility Test Result");

      // Restore platform
      Object.defineProperty(process, "platform", {
        value: originalPlatform,
      });
    });

    it("should work on macOS environment", async () => {
      // Simulate macOS environment
      const originalPlatform = process.platform;
      Object.defineProperty(process, "platform", {
        value: "darwin",
      });

      const result = await executeToolCall(server, "tuningsearch_search", {
        q: "macOS compatibility test",
      });

      expect(result.isError).toBe(false);
      expect(result.content[0]?.text).toContain("Compatibility Test Result");

      // Restore platform
      Object.defineProperty(process, "platform", {
        value: originalPlatform,
      });
    });

    it("should work on Linux environment", async () => {
      // Simulate Linux environment
      const originalPlatform = process.platform;
      Object.defineProperty(process, "platform", {
        value: "linux",
      });

      const result = await executeToolCall(server, "tuningsearch_search", {
        q: "Linux compatibility test",
      });

      expect(result.isError).toBe(false);
      expect(result.content[0]?.text).toContain("Compatibility Test Result");

      // Restore platform
      Object.defineProperty(process, "platform", {
        value: originalPlatform,
      });
    });
  });

  describe("Node.js Version Compatibility", () => {
    it("should work with Node.js 18+", async () => {
      // Test features that require Node.js 18+
      const result = await executeToolCall(server, "tuningsearch_search", {
        q: "Node.js 18 compatibility test",
      });

      expect(result.isError).toBe(false);
      expect(result.content[0]?.text).toContain("Compatibility Test Result");

      // Verify fetch API is available (Node.js 18+ feature)
      expect(typeof fetch).toBe("function");
    });

    it("should handle modern JavaScript features", async () => {
      // Test with modern JS features
      const modernArgs = {
        q: "modern JS test",
        // Use optional chaining and nullish coalescing
        options: {
          timeout: 5000,
          retries: 3,
        },
      };

      const result = await executeToolCall(
        server,
        "tuningsearch_search",
        modernArgs
      );

      expect(result.isError).toBe(false);
      expect(result.content[0]?.text).toContain("Compatibility Test Result");
    });
  });

  describe("Environment Variable Compatibility", () => {
    it("should handle different environment variable formats", async () => {
      const originalEnv = process.env;

      // Test with different casing
      process.env = {
        ...originalEnv,
        tuningsearch_api_key: "test-lowercase-key",
        TUNINGSEARCH_BASE_URL: "https://api.test.tuningsearch.com/v1",
      };

      // Server should still work with different env var formats
      const result = await executeToolCall(server, "tuningsearch_search", {
        q: "env var compatibility test",
      });

      expect(result.isError).toBe(false);

      // Restore environment
      process.env = originalEnv;
    });

    it("should handle missing optional environment variables", async () => {
      const originalEnv = process.env;

      // Remove optional env vars
      process.env = {
        ...originalEnv,
        TUNINGSEARCH_TIMEOUT: undefined,
        TUNINGSEARCH_RETRY_ATTEMPTS: undefined,
        TUNINGSEARCH_LOG_LEVEL: undefined,
      };

      const result = await executeToolCall(server, "tuningsearch_search", {
        q: "missing optional env vars test",
      });

      expect(result.isError).toBe(false);

      // Restore environment
      process.env = originalEnv;
    });
  });

  describe("Unicode and Internationalization", () => {
    it("should handle Unicode characters in queries", async () => {
      const unicodeQueries = [
        "Unicode test: 你好世界",
        "Emoji test: 🔍 search 🌍",
        "Special chars: àáâãäåæçèéêë",
        "Arabic: مرحبا بالعالم",
        "Japanese: こんにちは世界",
        "Russian: Привет мир",
      ];

      for (const query of unicodeQueries) {
        const result = await executeToolCall(server, "tuningsearch_search", {
          q: query,
        });

        expect(result.isError).toBe(false);
        expect(result.content[0]?.text).toContain("Compatibility Test Result");
      }
    });

    it("should handle different language parameters", async () => {
      const languageTests = [
        { q: "English test", language: "en" },
        { q: "Spanish test", language: "es" },
        { q: "French test", language: "fr" },
        { q: "German test", language: "de" },
        { q: "Chinese test", language: "zh" },
        { q: "Japanese test", language: "ja" },
      ];

      for (const test of languageTests) {
        const result = await executeToolCall(
          server,
          "tuningsearch_search",
          test
        );

        expect(result.isError).toBe(false);
        expect(result.content[0]?.text).toContain("Compatibility Test Result");
      }
    });
  });

  describe("Performance Compatibility", () => {
    it("should maintain performance across different client loads", async () => {
      const startTime = Date.now();
      const requests = [];

      // Simulate multiple clients making concurrent requests
      for (let client = 0; client < 3; client++) {
        for (let request = 0; request < 5; request++) {
          requests.push(
            executeToolCall(server, "tuningsearch_search", {
              q: `client ${client} request ${request}`,
            })
          );
        }
      }

      const results = await Promise.all(requests);
      const endTime = Date.now();

      // All requests should succeed
      results.forEach((result) => {
        expect(result.isError).toBe(false);
      });

      // Performance should be reasonable
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(15000); // Should complete within 15 seconds

      // Verify performance metrics
      const metrics = server.getPerformanceMetrics();
      expect(metrics.server).toBeDefined();
      expect(metrics.service).toBeDefined();
    });

    it("should handle memory efficiently with different client patterns", async () => {
      const initialMemory = process.memoryUsage();

      // Simulate different client usage patterns
      const patterns = [
        // Burst pattern
        async () => {
          const requests = [];
          for (let i = 0; i < 5; i++) {
            requests.push(
              executeToolCall(server, "tuningsearch_search", {
                q: `burst ${i}`,
              })
            );
          }
          await Promise.all(requests);
        },
        // Sequential pattern
        async () => {
          for (let i = 0; i < 5; i++) {
            await executeToolCall(server, "tuningsearch_search", {
              q: `sequential ${i}`,
            });
          }
        },
        // Mixed tool pattern
        async () => {
          await executeToolCall(server, "tuningsearch_search", {
            q: "mixed search",
          });
          await executeToolCall(server, "tuningsearch_news", {
            q: "mixed news",
          });
          await executeToolCall(server, "tuningsearch_crawl", {
            url: "https://example.com/mixed",
          });
        },
      ];

      for (const pattern of patterns) {
        await pattern();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB
    });
  });

  describe("Error Handling Compatibility", () => {
    it("should provide consistent error formats across clients", async () => {
      const errorScenarios = [
        {
          name: "missing_parameter",
          args: {},
          expectedError: "query",
        },
        {
          name: "invalid_url",
          tool: "tuningsearch_crawl",
          args: { url: "not-a-valid-url" },
          expectedError: "valid URL",
        },
      ];

      for (const scenario of errorScenarios) {
        const tool = scenario.tool || "tuningsearch_search";
        const result = await executeToolCall(server, tool, scenario.args);

        expect(result.isError).toBe(true);
        expect(result.content).toHaveLength(1);
        expect(result.content[0]?.type).toBe("text");
        expect(result.content[0]?.text).toContain(scenario.expectedError);
      }
    });

    it("should handle network errors consistently", async () => {
      mockApiServer.use(
        http.get("https://api.test.tuningsearch.com/v1/search", () => {
          return HttpResponse.error();
        })
      );

      const result = await executeToolCall(server, "tuningsearch_search", {
        q: "network error test",
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.type).toBe("text");
      expect(typeof result.content[0]?.text).toBe("string");
    });
  });

  describe("Tool Discovery Compatibility", () => {
    it("should provide consistent tool information", async () => {
      const serverInfo = server.getServerInfo();

      expect(serverInfo.tools).toHaveLength(3);

      const toolNames = serverInfo.tools.map((tool) => tool.name);
      expect(toolNames).toContain("tuningsearch_search");
      expect(toolNames).toContain("tuningsearch_news");
      expect(toolNames).toContain("tuningsearch_crawl");

      // Each tool should have required properties
      serverInfo.tools.forEach((tool) => {
        expect(tool).toHaveProperty("name");
        expect(tool).toHaveProperty("description");
        expect(tool).toHaveProperty("handler");
        expect(typeof tool.name).toBe("string");
        expect(typeof tool.description).toBe("string");
        expect(typeof tool.handler).toBe("string");
      });
    });

    it("should provide tool metadata for client discovery", async () => {
      const healthReport = server.getHealthReport();

      expect(healthReport.handlers).toBeDefined();
      expect(healthReport.handlers.search).toBeDefined();
      expect(healthReport.handlers.news).toBeDefined();
      expect(healthReport.handlers.crawl).toBeDefined();

      // Each handler should provide metadata
      Object.values(healthReport.handlers).forEach((handler) => {
        if (typeof handler === "object" && handler !== null) {
          expect(handler).toHaveProperty("name");
          expect(handler).toHaveProperty("version");
        }
      });
    });
  });

  describe("Configuration Compatibility", () => {
    it("should handle different configuration sources", async () => {
      // Test that server works with current configuration
      const config = server.getConfig();

      expect(config.name).toBe("compatibility-test-server");
      expect(config.version).toBe("1.0.0-compatibility");

      // Test configuration updates
      server.updateConfig({
        description: "Updated for compatibility testing",
      });

      const updatedConfig = server.getConfig();
      expect(updatedConfig.description).toBe(
        "Updated for compatibility testing"
      );

      // Server should still work after config update
      const result = await executeToolCall(server, "tuningsearch_search", {
        q: "config compatibility test",
      });

      expect(result.isError).toBe(false);
    });

    it("should provide health status for client monitoring", async () => {
      const health = server.getHealthStatus();

      expect(health).toHaveProperty("status");
      expect(health).toHaveProperty("initialized");
      expect(health.status).toBe("running");
      expect((health as any).initialized).toBe(true);

      // Should provide metrics for monitoring
      if ("totalRequests" in health) {
        expect(typeof health.totalRequests).toBe("number");
      }
      if ("successRate" in health) {
        expect(typeof health.successRate).toBe("number");
      }
    });
  });

  describe("Stress Testing for Client Compatibility", () => {
    it("should handle rapid successive calls from same client", async () => {
      const rapidCalls = [];
      const numCalls = 20;

      for (let i = 0; i < numCalls; i++) {
        rapidCalls.push(
          executeToolCall(server, "tuningsearch_search", {
            q: `rapid call ${i}`,
          })
        );
      }

      const results = await Promise.all(rapidCalls);

      // All calls should succeed
      results.forEach((result) => {
        expect(result.isError).toBe(false);
        expect(result.content[0]?.text).toContain("Compatibility Test Result");
      });

      // Server should remain healthy
      const health = server.getHealthStatus();
      expect(health.status).toBe("running");
    });

    it("should handle mixed tool types from multiple clients", async () => {
      const mixedCalls = [];

      // Simulate 3 different clients making different types of calls
      for (let client = 0; client < 3; client++) {
        mixedCalls.push(
          executeToolCall(server, "tuningsearch_search", {
            q: `client ${client} search`,
          }),
          executeToolCall(server, "tuningsearch_news", {
            q: `client ${client} news`,
          }),
          executeToolCall(server, "tuningsearch_crawl", {
            url: `https://example.com/client-${client}`,
          })
        );
      }

      const results = await Promise.all(mixedCalls);

      // All calls should succeed
      results.forEach((result) => {
        expect(result.isError).toBe(false);
      });

      // Verify statistics reflect all operations
      const stats = server.getSearchStats();
      expect(stats.totalSearches).toBeGreaterThanOrEqual(3);
      expect(stats.totalNewsSearches).toBeGreaterThanOrEqual(3);
      expect(stats.totalCrawls).toBeGreaterThanOrEqual(3);
    });
  });

  // Helper function to execute tool calls through the server
  async function executeToolCall(
    server: TuningSearchServer,
    toolName: string,
    args: any
  ) {
    try {
      const serverAny = server as any;

      switch (toolName) {
        case "tuningsearch_search":
          return await serverAny.searchToolHandler.handleSearchRequest(args);
        case "tuningsearch_news":
          return await serverAny.newsToolHandler.handleNewsRequest(args);
        case "tuningsearch_crawl":
          return await serverAny.crawlToolHandler.handleCrawlRequest(args);
        default:
          return {
            content: [
              {
                type: "text" as const,
                text: `Unknown tool: ${toolName}`,
              },
            ],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: error instanceof Error ? error.message : "Unknown error",
          },
        ],
        isError: true,
      };
    }
  }
});
