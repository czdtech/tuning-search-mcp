/**
 * Tests for Crawl Tool Definition
 */

import { crawlTool, validateCrawlArgs, validateUrl, crawlSecurityConfig } from '../tools/crawl-tool';
import { CrawlToolArgs } from '../types/tool-types';

describe('Crawl Tool', () => {
  describe('Tool Definition', () => {
    it('should have correct tool name', () => {
      expect(crawlTool.name).toBe('tuningsearch_crawl');
    });

    it('should have proper description', () => {
      expect(crawlTool.description).toContain('Crawl and extract content');
      expect(crawlTool.description).toContain('TuningSearch API');
    });

    it('should have correct required parameters', () => {
      expect(crawlTool.inputSchema.required).toEqual(['url']);
    });

    it('should have url parameter with proper validation', () => {
      const properties = crawlTool.inputSchema.properties;
      expect(properties).toBeDefined();
      
      const urlProperty = properties!.url as any;
      expect(urlProperty.type).toBe('string');
      expect(urlProperty.format).toBe('uri');
      expect(urlProperty.pattern).toBe('^https?://.+');
      expect(urlProperty.minLength).toBe(10);
      expect(urlProperty.maxLength).toBe(2000);
    });

    it('should have optional service parameter', () => {
      const properties = crawlTool.inputSchema.properties;
      expect(properties).toBeDefined();
      
      const serviceProperty = properties!.service as any;
      expect(serviceProperty.type).toBe('string');
      expect(serviceProperty.examples).toContain('default');
    });
  });

  describe('URL Validation', () => {
    describe('Valid URLs', () => {
      const validUrls = [
        'https://example.com',
        'http://example.com/path',
        'https://subdomain.example.com/path/to/page',
        'https://example.com:8080/secure',
        'https://news.example.com/article?id=123'
      ];

      validUrls.forEach(url => {
        it(`should accept valid URL: ${url}`, () => {
          const result = validateUrl(url);
          expect(result.valid).toBe(true);
          expect(result.error).toBeUndefined();
        });
      });
    });

    describe('Invalid Protocols', () => {
      const invalidProtocolUrls = [
        'ftp://example.com',
        'file:///path/to/file',
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>'
      ];

      invalidProtocolUrls.forEach(url => {
        it(`should reject invalid protocol: ${url}`, () => {
          const result = validateUrl(url);
          expect(result.valid).toBe(false);
          expect(result.error).toContain('Only HTTP and HTTPS protocols are allowed');
        });
      });
    });

    describe('Localhost and Private IPs', () => {
      const localhostUrls = [
        'http://localhost',
        'https://localhost:3000',
        'http://127.0.0.1',
        'https://127.0.0.1:8080'
      ];

      localhostUrls.forEach(url => {
        it(`should reject localhost URL: ${url}`, () => {
          const result = validateUrl(url);
          expect(result.valid).toBe(false);
          expect(result.error).toContain('Localhost URLs are not allowed');
        });
      });

      const privateIpUrls = [
        'http://10.0.0.1',
        'https://172.16.0.1',
        'http://192.168.1.1',
        'https://169.254.1.1'
      ];

      privateIpUrls.forEach(url => {
        it(`should reject private IP: ${url}`, () => {
          const result = validateUrl(url);
          expect(result.valid).toBe(false);
          expect(result.error).toContain('Private IP addresses are not allowed');
        });
      });
    });

    describe('Blocked Domains', () => {
      const blockedUrls = [
        'https://bit.ly/abc123',
        'http://tinyurl.com/xyz789',
        'https://short.link/test'
      ];

      blockedUrls.forEach(url => {
        it(`should reject blocked domain: ${url}`, () => {
          const result = validateUrl(url);
          expect(result.valid).toBe(false);
          expect(result.error).toContain('URL shorteners and suspicious domains are not allowed');
        });
      });
    });

    describe('URL Length Validation', () => {
      it('should reject URLs that are too long', () => {
        const longUrl = 'https://example.com/' + 'a'.repeat(2000);
        const result = validateUrl(longUrl);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('URL is too long');
      });

      it('should accept URLs within length limit', () => {
        const normalUrl = 'https://example.com/' + 'a'.repeat(100);
        const result = validateUrl(normalUrl);
        expect(result.valid).toBe(true);
      });
    });

    describe('Malformed URLs', () => {
      const malformedUrls = [
        'not-a-url',
        'http://',
        'https://'
      ];

      malformedUrls.forEach(url => {
        it(`should reject malformed URL: ${url}`, () => {
          const result = validateUrl(url);
          expect(result.valid).toBe(false);
          expect(result.error).toBe('Invalid URL format');
        });
      });
    });
  });

  describe('Crawl Arguments Validation', () => {
    describe('Valid Arguments', () => {
      it('should accept valid crawl arguments', () => {
        const args: CrawlToolArgs = {
          url: 'https://example.com/article'
        };

        const result = validateCrawlArgs(args);
        expect(result.valid).toBe(true);
        expect(result.data).toEqual(args);
        expect(result.error).toBeUndefined();
      });

      it('should accept arguments with optional service', () => {
        const args: CrawlToolArgs = {
          url: 'https://example.com/article',
          service: 'readability'
        };

        const result = validateCrawlArgs(args);
        expect(result.valid).toBe(true);
        expect(result.data).toEqual(args);
      });
    });

    describe('Invalid Arguments', () => {
      it('should reject null or undefined arguments', () => {
        expect(validateCrawlArgs(null).valid).toBe(false);
        expect(validateCrawlArgs(undefined).valid).toBe(false);
      });

      it('should reject non-object arguments', () => {
        expect(validateCrawlArgs('string').valid).toBe(false);
        expect(validateCrawlArgs(123).valid).toBe(false);
        expect(validateCrawlArgs(true).valid).toBe(false);
      });

      it('should reject arguments without URL', () => {
        const result = validateCrawlArgs({});
        expect(result.valid).toBe(false);
        expect(result.error).toContain('URL is required');
      });

      it('should reject arguments with empty URL', () => {
        const result = validateCrawlArgs({ url: '' });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('URL is required');
      });

      it('should reject arguments with whitespace-only URL', () => {
        const result = validateCrawlArgs({ url: '   ' });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('URL is required');
      });

      it('should reject arguments with invalid URL', () => {
        const result = validateCrawlArgs({ url: 'not-a-url' });
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Invalid URL format');
      });

      it('should reject arguments with localhost URL', () => {
        const result = validateCrawlArgs({ url: 'http://localhost:3000' });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Localhost URLs are not allowed');
      });
    });
  });

  describe('Security Configuration', () => {
    it('should have proper security configuration', () => {
      expect(crawlSecurityConfig.allowedProtocols).toEqual(['http:', 'https:']);
      expect(crawlSecurityConfig.blockedHosts).toContain('localhost');
      expect(crawlSecurityConfig.blockedHosts).toContain('127.0.0.1');
      expect(crawlSecurityConfig.maxUrlLength).toBe(2000);
    });

    it('should block known URL shorteners', () => {
      expect(crawlSecurityConfig.blockedDomains).toContain('bit.ly');
      expect(crawlSecurityConfig.blockedDomains).toContain('tinyurl.com');
    });

    it('should define private IP ranges', () => {
      expect(crawlSecurityConfig.privateIpRanges).toContain('10.0.0.0/8');
      expect(crawlSecurityConfig.privateIpRanges).toContain('192.168.0.0/16');
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors gracefully', () => {
      const invalidArgs = { url: 'javascript:alert(1)' };
      const result = validateCrawlArgs(invalidArgs);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
    });

    it('should provide descriptive error messages', () => {
      const testCases = [
        { args: {}, expectedError: 'URL is required' },
        { args: { url: 'ftp://example.com' }, expectedError: 'Only HTTP and HTTPS protocols are allowed' },
        { args: { url: 'http://localhost' }, expectedError: 'Localhost URLs are not allowed' },
        { args: { url: 'https://bit.ly/test' }, expectedError: 'URL shorteners and suspicious domains are not allowed' }
      ];

      testCases.forEach(({ args, expectedError }) => {
        const result = validateCrawlArgs(args);
        expect(result.valid).toBe(false);
        expect(result.error).toContain(expectedError);
      });
    });
  });
});