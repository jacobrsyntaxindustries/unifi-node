#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';
import https from 'https';
import { URL } from 'url';

dotenv.config();

const config = {
  host: process.env.UNIFI_HOST || '192.168.1.1',
  port: parseInt(process.env.UNIFI_PORT || '8443'),
  username: process.env.UNIFI_USERNAME || 'admin',
  password: process.env.UNIFI_PASSWORD || '',
  site: process.env.UNIFI_SITE || 'default',
  strictSSL: process.env.UNIFI_STRICT_SSL === 'true'
};

console.log('🔍 UniFi Authentication Debug Tool');
console.log('==================================\n');

console.log('📋 Configuration:');
console.log(`   Host: ${config.host}`);
console.log(`   Port: ${config.port}`);
console.log(`   Username: ${config.username}`);
console.log(`   Password: ${'*'.repeat(config.password.length)} (${config.password.length} chars)`);
console.log(`   Site: ${config.site}`);
console.log(`   Strict SSL: ${config.strictSSL}\n`);

const agent = new https.Agent({
  rejectUnauthorized: config.strictSSL
});

async function makeRequest(path: string, method: string = 'GET', data?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = new URL(`https://${config.host}:${config.port}${path}`);
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      agent: agent,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'unifi-node-debug/1.0.0'
      }
    };

    if (data && method === 'POST') {
      const postData = JSON.stringify(data);
      (options.headers as any)['Content-Length'] = Buffer.byteLength(postData).toString();
    }

    const req = https.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = {
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
            headers: res.headers,
            body: body,
            data: null as any
          };
          
          try {
            result.data = JSON.parse(body);
          } catch (e) {
            // Body is not JSON, keep as string
          }
          
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data && method === 'POST') {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function debugAuthentication() {
  try {
    console.log('🔍 Step 1: Testing basic connectivity...');
    const rootResponse = await makeRequest('/');
    console.log(`   Status: ${rootResponse.statusCode} ${rootResponse.statusMessage}`);
    console.log(`   Server: ${rootResponse.headers.server || 'Unknown'}`);
    
    if (rootResponse.headers['set-cookie']) {
      console.log(`   Cookies: ${rootResponse.headers['set-cookie'].length} cookies set`);
    }
    
    console.log('\n🔍 Step 2: Checking UniFi API endpoints...');
    
    // Try different common UniFi API endpoints
    const endpoints = [
      '/api/login',
      '/api/self',
      '/status',
      '/manage/account/login',
      '/manage'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await makeRequest(endpoint);
        console.log(`   ${endpoint}: ${response.statusCode} ${response.statusMessage}`);
        
        if (response.statusCode === 200 && response.data) {
          console.log(`      Response: ${JSON.stringify(response.data).substring(0, 100)}...`);
        }
      } catch (error) {
        console.log(`   ${endpoint}: Error - ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    console.log('\n🔍 Step 3: Attempting authentication...');
    
    // Try authentication with different methods
    const authMethods = [
      {
        name: 'Standard UniFi Login',
        endpoint: '/api/login',
        payload: {
          username: config.username,
          password: config.password,
          remember: false
        }
      },
      {
        name: 'Alternative Login Format',
        endpoint: '/api/login',
        payload: {
          username: config.username,
          password: config.password,
          strict: true
        }
      },
      {
        name: 'Legacy Login Format',
        endpoint: '/login',
        payload: {
          username: config.username,
          password: config.password
        }
      }
    ];
    
    for (const method of authMethods) {
      try {
        console.log(`\n   Trying: ${method.name}`);
        const response = await makeRequest(method.endpoint, 'POST', method.payload);
        console.log(`   Status: ${response.statusCode} ${response.statusMessage}`);
        
        if (response.data) {
          console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
        }
        
        if (response.headers['set-cookie']) {
          console.log(`   Auth cookies: ${response.headers['set-cookie']}`);
        }
        
        if (response.statusCode === 200) {
          console.log('   ✅ Authentication successful!');
          
          // Try to get site info
          console.log('\n🔍 Step 4: Testing site access...');
          try {
            const sitesResponse = await makeRequest('/api/self/sites');
            console.log(`   Sites endpoint: ${sitesResponse.statusCode}`);
            if (sitesResponse.data) {
              console.log(`   Available sites: ${JSON.stringify(sitesResponse.data, null, 2)}`);
            }
          } catch (e) {
            console.log(`   Sites check failed: ${e instanceof Error ? e.message : String(e)}`);
          }
          
          return; // Success, exit
        }
        
      } catch (error) {
        console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    console.log('\n❌ All authentication methods failed.');
    console.log('\n💡 Troubleshooting suggestions:');
    console.log('   1. Verify username/password by logging into the web UI');
    console.log('   2. Check if 2FA is enabled on the account');
    console.log('   3. Verify the site name (might not be "default")');
    console.log('   4. Check for account lockout');
    console.log('   5. Try a different user account');
    console.log('   6. Check UniFi Controller logs for authentication errors');
    
  } catch (error) {
    console.error('❌ Debug process failed:', error instanceof Error ? error.message : String(error));
  }
}

debugAuthentication();
