#!/usr/bin/env npx ts-node

import * as https from 'https';
import { URL } from 'url';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface UniFiControllerInfo {
  version?: string;
  build?: string;
  product?: string;
  hostname?: string;
  isCloudKey?: boolean;
  isUDMPro?: boolean;
  endpoints: string[];
}

class UniFiInfoTool {
  private host: string;
  private port: number;
  private agent: https.Agent;

  constructor() {
    this.host = process.env.UNIFI_HOST || '192.168.1.1';
    this.port = parseInt(process.env.UNIFI_PORT || '443');
    this.agent = new https.Agent({
      rejectUnauthorized: false,
      keepAlive: true
    });
  }

  private async makeRequest(path: string, method: string = 'GET', data?: any): Promise<{ status: number; headers: any; body: string }> {
    return new Promise((resolve, reject) => {
      const url = new URL(`https://${this.host}:${this.port}${path}`);
      
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: method,
        agent: this.agent,
        headers: {
          'User-Agent': 'UniFi-Node-Tool/1.0',
          'Accept': 'application/json, text/plain, */*',
          'Content-Type': 'application/json'
        } as Record<string, string | number>,
        timeout: 10000
      };

      if (data && method !== 'GET') {
        const postData = JSON.stringify(data);
        options.headers['Content-Length'] = Buffer.byteLength(postData);
      }

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            body: body
          });
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (data && method !== 'GET') {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  private async checkEndpoint(path: string): Promise<{ path: string; status: number; info?: any }> {
    try {
      const response = await this.makeRequest(path);
      let info: any = {};
      
      try {
        if (response.body) {
          info = JSON.parse(response.body);
        }
      } catch (e) {
        info = { rawBody: response.body.substring(0, 200) };
      }

      return {
        path,
        status: response.status,
        info
      };
    } catch (error) {
      return {
        path,
        status: 0,
        info: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  private async detectControllerType(): Promise<string> {
    // Check various endpoints to determine controller type
    const checks = [
      { path: '/status', indicator: 'Generic UniFi' },
      { path: '/api/system', indicator: 'UniFi OS' },
      { path: '/proxy/network/status', indicator: 'UDM/UDMP' },
      { path: '/manage', indicator: 'Classic Controller' },
      { path: '/inform', indicator: 'Cloud Key' }
    ];

    const results = await Promise.all(
      checks.map(async (check) => {
        const result = await this.checkEndpoint(check.path);
        return { ...check, status: result.status };
      })
    );

    // Determine controller type based on responses
    if (results.find(r => r.path === '/proxy/network/status' && r.status === 200)) {
      return 'UDM/UDMP (UniFi OS)';
    }
    if (results.find(r => r.path === '/api/system' && r.status === 200)) {
      return 'UniFi OS Controller';
    }
    if (results.find(r => r.path === '/manage' && r.status === 200)) {
      return 'Classic UniFi Controller';
    }
    if (results.find(r => r.path === '/inform' && r.status === 200)) {
      return 'Cloud Key';
    }

    return 'Unknown UniFi Device';
  }

  private async getSiteList(): Promise<string[]> {
    // Try to get site list from various endpoints
    const siteEndpoints = [
      '/api/self/sites',
      '/api/stat/sites',
      '/manage/api/self/sites'
    ];

    for (const endpoint of siteEndpoints) {
      try {
        const result = await this.checkEndpoint(endpoint);
        if (result.status === 200 && result.info?.data) {
          return result.info.data.map((site: any) => site.name || site.desc || site._id);
        }
      } catch (e) {
        // Continue to next endpoint
      }
    }

    return [];
  }

  public async gatherInfo(): Promise<UniFiControllerInfo> {
    console.log('🔍 UniFi Controller Information Tool');
    console.log('=====================================\n');

    console.log('📋 Target Configuration:');
    console.log(`   Host: ${this.host}`);
    console.log(`   Port: ${this.port}`);
    console.log(`   URL: https://${this.host}:${this.port}\n`);

    const info: UniFiControllerInfo = {
      endpoints: []
    };

    // Test basic connectivity
    console.log('🔍 Step 1: Testing basic connectivity...');
    try {
      const basicTest = await this.makeRequest('/');
      console.log(`   Status: ${basicTest.status}`);
      console.log(`   Server: ${basicTest.headers.server || 'Unknown'}`);
      if (basicTest.headers['x-csrf-token']) {
        console.log(`   CSRF Token: Present`);
      }
    } catch (error) {
      console.log(`   ❌ Connection failed: ${error instanceof Error ? error.message : String(error)}`);
      return info;
    }

    // Detect controller type
    console.log('\n🔍 Step 2: Detecting controller type...');
    const controllerType = await this.detectControllerType();
    console.log(`   Controller Type: ${controllerType}`);

    // Check common endpoints
    console.log('\n🔍 Step 3: Checking common endpoints...');
    const commonEndpoints = [
      '/status',
      '/api/login',
      '/api/self',
      '/api/system',
      '/manage',
      '/manage/account/login',
      '/proxy/network/api/login',
      '/inform'
    ];

    for (const endpoint of commonEndpoints) {
      const result = await this.checkEndpoint(endpoint);
      console.log(`   ${endpoint}: ${result.status} ${this.getStatusText(result.status)}`);
      
      if (result.status === 200) {
        info.endpoints.push(endpoint);
        
        // Extract version info if available
        if (result.info?.meta?.serverVersion) {
          info.version = result.info.meta.serverVersion;
        }
        if (result.info?.meta?.serverBuild) {
          info.build = result.info.meta.serverBuild;
        }
      }
    }

    // Try to get system information
    console.log('\n🔍 Step 4: Gathering system information...');
    const systemEndpoints = [
      '/status',
      '/api/system',
      '/manage/api/system'
    ];

    for (const endpoint of systemEndpoints) {
      try {
        const result = await this.checkEndpoint(endpoint);
        if (result.status === 200 && result.info) {
          if (result.info.version) info.version = result.info.version;
          if (result.info.build) info.build = result.info.build;
          if (result.info.hostname) info.hostname = result.info.hostname;
          if (result.info.product) info.product = result.info.product;
          
          console.log(`   ${endpoint}: Found system info`);
          if (info.version) console.log(`     Version: ${info.version}`);
          if (info.build) console.log(`     Build: ${info.build}`);
          if (info.hostname) console.log(`     Hostname: ${info.hostname}`);
          if (info.product) console.log(`     Product: ${info.product}`);
          break;
        }
      } catch (e) {
        // Continue
      }
    }

    // Check for specific controller types
    console.log('\n🔍 Step 5: Checking for specific features...');
    
    // Check for UniFi OS (UDM/UDMP)
    const unifiOSCheck = await this.checkEndpoint('/proxy/network/status');
    if (unifiOSCheck.status === 200) {
      console.log('   ✅ UniFi OS detected (UDM/UDMP)');
      info.isUDMPro = true;
    }

    // Check for Cloud Key
    const cloudKeyCheck = await this.checkEndpoint('/inform');
    if (cloudKeyCheck.status === 200) {
      console.log('   ✅ Cloud Key features detected');
      info.isCloudKey = true;
    }

    // Try to enumerate sites
    console.log('\n🔍 Step 6: Attempting to discover sites...');
    console.log('   (This may fail without authentication)');
    
    const sites = await this.getSiteList();
    if (sites.length > 0) {
      console.log('   ✅ Found sites:');
      sites.forEach(site => console.log(`     - ${site}`));
    } else {
      console.log('   ℹ️  No sites discovered (authentication required)');
    }

    return info;
  }

  private getStatusText(status: number): string {
    const statusTexts: { [key: number]: string } = {
      200: 'OK',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      405: 'Method Not Allowed',
      500: 'Internal Server Error'
    };
    return statusTexts[status] || `Status ${status}`;
  }

  public async suggestAuthMethods(): Promise<void> {
    console.log('\n💡 Authentication Method Suggestions');
    console.log('====================================\n');

    console.log('Based on the detected controller type, try these authentication approaches:\n');

    // Check what we detected
    const unifiOSCheck = await this.checkEndpoint('/proxy/network/status');
    const classicCheck = await this.checkEndpoint('/manage');

    if (unifiOSCheck.status === 200) {
      console.log('🎯 For UniFi OS (UDM/UDMP):');
      console.log('   1. Use /proxy/network/api/login endpoint');
      console.log('   2. Username should be the local account username');
      console.log('   3. Make sure the account has "Network" application access');
      console.log('   4. Try both "admin" and your actual username');
      console.log('   5. Check if you need to enable "Advanced Features" in settings\n');
    }

    if (classicCheck.status === 200) {
      console.log('🎯 For Classic UniFi Controller:');
      console.log('   1. Use /api/login endpoint');
      console.log('   2. Default username is usually "ubnt" or "admin"');
      console.log('   3. Make sure you\'re using the admin password');
      console.log('   4. Check if the controller requires initial setup\n');
    }

    console.log('🔧 General troubleshooting:');
    console.log('   1. Try logging into the web UI first to verify credentials');
    console.log('   2. Check for account lockouts (wait 15 minutes if locked)');
    console.log('   3. Disable 2FA temporarily for API testing');
    console.log('   4. Try creating a new local admin account');
    console.log('   5. Check UniFi Controller logs in the web UI');
    console.log('   6. Verify the site name (might not be "default")');
    console.log('   7. Make sure API access is enabled in controller settings\n');

    console.log('🌐 Web UI URLs to try:');
    console.log(`   - https://${this.host}:${this.port}`);
    console.log(`   - https://${this.host}:${this.port}/manage`);
    if (unifiOSCheck.status === 200) {
      console.log(`   - https://${this.host}:${this.port}/network`);
    }
  }
}

async function main() {
  try {
    const tool = new UniFiInfoTool();
    const info = await tool.gatherInfo();
    await tool.suggestAuthMethods();
    
    console.log('\n📊 Summary');
    console.log('==========');
    console.log(`Available endpoints: ${info.endpoints.length}`);
    if (info.version) console.log(`Version: ${info.version}`);
    if (info.build) console.log(`Build: ${info.build}`);
    if (info.hostname) console.log(`Hostname: ${info.hostname}`);
    
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
