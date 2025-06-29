#!/usr/bin/env npx ts-node

import * as https from 'https';
import * as http from 'http';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

interface DiagnosticResult {
  step: string;
  success: boolean;
  message: string;
  details?: any;
}

class UniFiDiagnostics {
  private host: string;
  private port: number;
  private username: string;
  private password: string;
  private site: string;
  private strictSSL: boolean;

  constructor() {
    this.host = process.env.UNIFI_HOST || '';
    this.port = parseInt(process.env.UNIFI_PORT || '443', 10);
    this.username = process.env.UNIFI_USERNAME || '';
    this.password = process.env.UNIFI_PASSWORD || '';
    this.site = process.env.UNIFI_SITE || 'default';
    this.strictSSL = process.env.UNIFI_STRICT_SSL === 'true';
  }

  private log(result: DiagnosticResult): void {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.step}: ${result.message}`);
    if (result.details) {
      console.log(`   Details:`, result.details);
    }
    console.log('');
  }

  private async testBasicConnectivity(): Promise<DiagnosticResult> {
    return new Promise((resolve) => {
      const protocol = this.port === 443 ? 'https:' : 'http:';
      const agent = protocol === 'https:' ? 
        new https.Agent({ rejectUnauthorized: this.strictSSL }) :
        new http.Agent();

      const options = {
        hostname: this.host,
        port: this.port,
        path: '/',
        method: 'GET',
        timeout: 10000,
        agent
      };

      const request = (protocol === 'https:' ? https : http).request(options, (res) => {
        resolve({
          step: 'Basic Connectivity',
          success: true,
          message: `Connected to ${this.host}:${this.port}`,
          details: {
            statusCode: res.statusCode,
            headers: res.headers,
            protocol: protocol
          }
        });
        res.on('data', () => {}); // Consume response
      });

      request.on('error', (error) => {
        resolve({
          step: 'Basic Connectivity',
          success: false,
          message: `Failed to connect to ${this.host}:${this.port}`,
          details: {
            error: error.message,
            code: (error as any).code,
            protocol: protocol
          }
        });
      });

      request.on('timeout', () => {
        request.destroy();
        resolve({
          step: 'Basic Connectivity',
          success: false,
          message: `Connection timeout to ${this.host}:${this.port}`,
          details: { timeout: '10 seconds' }
        });
      });

      request.end();
    });
  }

  private async testUniFiEndpoints(): Promise<DiagnosticResult[]> {
    const endpoints = [
      '/',
      '/manage',
      '/api/login',
      `/api/s/${this.site}/stat/health`,
    ];

    const results: DiagnosticResult[] = [];

    for (const endpoint of endpoints) {
      const result = await this.testEndpoint(endpoint);
      results.push(result);
    }

    return results;
  }

  private async testEndpoint(path: string): Promise<DiagnosticResult> {
    return new Promise((resolve) => {
      const protocol = this.port === 443 ? 'https:' : 'http:';
      const agent = protocol === 'https:' ? 
        new https.Agent({ rejectUnauthorized: this.strictSSL }) :
        new http.Agent();

      const options = {
        hostname: this.host,
        port: this.port,
        path: path,
        method: 'GET',
        timeout: 10000,
        agent,
        headers: {
          'User-Agent': 'unifi-node-diagnostics/1.0.0'
        }
      };

      const request = (protocol === 'https:' ? https : http).request(options, (res) => {
        let responseBody = '';
        res.on('data', (chunk) => {
          responseBody += chunk;
        });

        res.on('end', () => {
          const isSuccess = res.statusCode !== undefined && res.statusCode < 500;
          resolve({
            step: `Endpoint Test: ${path}`,
            success: isSuccess,
            message: `${res.statusCode} ${res.statusMessage}`,
            details: {
              statusCode: res.statusCode,
              headers: res.headers,
              bodyLength: responseBody.length,
              bodyPreview: responseBody.substring(0, 200),
              redirectLocation: res.headers.location
            }
          });
        });
      });

      request.on('error', (error) => {
        resolve({
          step: `Endpoint Test: ${path}`,
          success: false,
          message: `Request failed: ${error.message}`,
          details: {
            error: error.message,
            code: (error as any).code
          }
        });
      });

      request.on('timeout', () => {
        request.destroy();
        resolve({
          step: `Endpoint Test: ${path}`,
          success: false,
          message: 'Request timeout',
          details: { timeout: '10 seconds' }
        });
      });

      request.end();
    });
  }

  private async testAuthentication(): Promise<DiagnosticResult> {
    return new Promise((resolve) => {
      const protocol = this.port === 443 ? 'https:' : 'http:';
      const agent = protocol === 'https:' ? 
        new https.Agent({ rejectUnauthorized: this.strictSSL }) :
        new http.Agent();

      const loginData = JSON.stringify({
        username: this.username,
        password: this.password,
        remember: false
      });

      const options = {
        hostname: this.host,
        port: this.port,
        path: '/api/login',
        method: 'POST',
        timeout: 15000,
        agent,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(loginData),
          'User-Agent': 'unifi-node-diagnostics/1.0.0'
        }
      };

      const request = (protocol === 'https:' ? https : http).request(options, (res) => {
        let responseBody = '';
        res.on('data', (chunk) => {
          responseBody += chunk;
        });

        res.on('end', () => {
          const isSuccess = res.statusCode === 200;
          let parsedBody: any = null;
          try {
            parsedBody = JSON.parse(responseBody);
          } catch (e) {
            // Body is not JSON
          }

          resolve({
            step: 'Authentication Test',
            success: isSuccess,
            message: isSuccess ? 'Authentication successful' : `Authentication failed (${res.statusCode})`,
            details: {
              statusCode: res.statusCode,
              headers: res.headers,
              cookies: res.headers['set-cookie'],
              responseBody: parsedBody || responseBody.substring(0, 500),
              username: this.username
            }
          });
        });
      });

      request.on('error', (error) => {
        resolve({
          step: 'Authentication Test',
          success: false,
          message: `Authentication request failed: ${error.message}`,
          details: {
            error: error.message,
            code: (error as any).code,
            username: this.username
          }
        });
      });

      request.on('timeout', () => {
        request.destroy();
        resolve({
          step: 'Authentication Test',
          success: false,
          message: 'Authentication request timeout',
          details: { timeout: '15 seconds' }
        });
      });

      request.write(loginData);
      request.end();
    });
  }

  private validateConfiguration(): DiagnosticResult {
    const issues: string[] = [];

    if (!this.host) issues.push('UNIFI_HOST is not set');
    if (!this.port || isNaN(this.port)) issues.push('UNIFI_PORT is not set or invalid');
    if (!this.username) issues.push('UNIFI_USERNAME is not set');
    if (!this.password) issues.push('UNIFI_PASSWORD is not set');
    if (!this.site) issues.push('UNIFI_SITE is not set');

    // Check if host looks like an IP or hostname
    if (this.host && !this.host.match(/^(\d{1,3}\.){3}\d{1,3}$/) && !this.host.includes('.')) {
      issues.push('UNIFI_HOST should be an IP address or fully qualified domain name');
    }

    // Check port range
    if (this.port && (this.port < 1 || this.port > 65535)) {
      issues.push('UNIFI_PORT should be between 1 and 65535');
    }

    return {
      step: 'Configuration Validation',
      success: issues.length === 0,
      message: issues.length === 0 ? 'Configuration looks good' : `Found ${issues.length} issue(s)`,
      details: {
        host: this.host,
        port: this.port,
        username: this.username,
        passwordSet: !!this.password,
        site: this.site,
        strictSSL: this.strictSSL,
        issues: issues
      }
    };
  }

  async runDiagnostics(): Promise<void> {
    console.log('🔍 UniFi Controller Diagnostics');
    console.log('=====================================\n');

    // Step 1: Validate configuration
    const configResult = this.validateConfiguration();
    this.log(configResult);

    if (!configResult.success) {
      console.log('❌ Configuration issues found. Please fix them before continuing.\n');
      return;
    }

    // Step 2: Test basic connectivity
    const connectivityResult = await this.testBasicConnectivity();
    this.log(connectivityResult);

    if (!connectivityResult.success) {
      console.log('❌ Basic connectivity failed. Check your network connection and UniFi Controller address.\n');
      console.log('Troubleshooting tips:');
      console.log('- Verify the UniFi Controller is running and accessible');
      console.log('- Check if the IP address and port are correct');
      console.log('- Ensure there are no firewall rules blocking the connection');
      console.log('- Try accessing the UniFi Controller web interface in a browser\n');
      return;
    }

    // Step 3: Test UniFi endpoints
    console.log('🔍 Testing UniFi endpoints...\n');
    const endpointResults = await this.testUniFiEndpoints();
    endpointResults.forEach(result => this.log(result));

    // Step 4: Test authentication
    const authResult = await this.testAuthentication();
    this.log(authResult);

    // Summary and recommendations
    console.log('📋 Summary and Recommendations');
    console.log('=====================================\n');

    if (authResult.success) {
      console.log('✅ All tests passed! Your UniFi Controller connection is working.\n');
    } else {
      console.log('❌ Authentication failed. Here are some troubleshooting steps:\n');
      
      console.log('1. Verify credentials:');
      console.log(`   - Username: ${this.username}`);
      console.log('   - Check password is correct');
      console.log('   - Ensure the user has admin privileges\n');
      
      console.log('2. Check UniFi Controller version:');
      console.log('   - This library works with UniFi Controller 5.x, 6.x, and 7.x');
      console.log('   - Some newer versions may have different API endpoints\n');
      
      console.log('3. Verify the site name:');
      console.log(`   - Current site: ${this.site}`);
      console.log('   - Try "default" if unsure');
      console.log('   - Check the UniFi Controller web interface for the correct site name\n');
      
      console.log('4. SSL/TLS issues:');
      console.log(`   - Current strictSSL setting: ${this.strictSSL}`);
      console.log('   - Try setting UNIFI_STRICT_SSL=false for self-signed certificates\n');
      
      console.log('5. Network access:');
      console.log('   - Ensure the UniFi Controller allows API access');
      console.log('   - Check if there are any IP restrictions or VPN requirements\n');
    }
  }
}

// Run diagnostics
async function main() {
  try {
    const diagnostics = new UniFiDiagnostics();
    await diagnostics.runDiagnostics();
  } catch (error) {
    console.error('❌ Diagnostic script failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
