#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';
import * as https from 'https';

// Load environment variables
dotenv.config();

const host = process.env.UNIFI_HOST || 'localhost';
const port = parseInt(process.env.UNIFI_PORT || '443');
const username = process.env.UNIFI_USERNAME || '';
const password = process.env.UNIFI_PASSWORD || '';
const strictSSL = process.env.UNIFI_STRICT_SSL === 'true';

console.log('🔍 UniFi OS Authentication Test');
console.log('================================\n');

console.log('📋 Configuration:');
console.log(`   Host: ${host}`);
console.log(`   Port: ${port}`);
console.log(`   Username: ${username}`);
console.log(`   Password: ${'*'.repeat(password.length)} (${password.length} chars)`);
console.log(`   Strict SSL: ${strictSSL}\n`);

// HTTP agent that ignores SSL errors
const agent = new https.Agent({
  rejectUnauthorized: strictSSL
});

function makeRequest(path: string, method: string = 'GET', data?: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: host,
      port: port,
      path: path,
      method: method,
      agent: agent,
      headers: {
        'User-Agent': 'UniFi-Node-Test/2.0.0',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      } as any
    };

    if (data) {
      options.headers['Content-Length'] = Buffer.byteLength(data);
    }

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonBody = JSON.parse(body);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: jsonBody
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(data);
    }
    req.end();
  });
}

async function testUniFiOSAuth() {
  try {
    console.log('🔍 Step 1: Testing UniFi OS login endpoint...');
    
    // Try the UniFi OS login endpoint
    const loginData = JSON.stringify({
      username: username,
      password: password,
      remember: false,
      strict: true
    });

    const loginResult = await makeRequest('/api/auth/login', 'POST', loginData);
    console.log(`   Status: ${loginResult.statusCode}`);
    console.log(`   Response: ${JSON.stringify(loginResult.body, null, 2)}`);
    
    if (loginResult.headers['set-cookie']) {
      console.log(`   Cookies: ${loginResult.headers['set-cookie'].join(', ')}`);
    }

    if (loginResult.statusCode === 200) {
      console.log('   ✅ UniFi OS login successful!');
      
      // Extract token or cookies for further testing
      const cookies = loginResult.headers['set-cookie'];
      if (cookies) {
        console.log('\n🔍 Step 2: Testing authenticated request...');
        
        // Try to get user info with the auth cookie
        const userInfoResult = await makeRequest('/proxy/network/api/self', 'GET');
        console.log(`   User info status: ${userInfoResult.statusCode}`);
        console.log(`   User info: ${JSON.stringify(userInfoResult.body, null, 2)}`);
      }
    } else {
      console.log('   ❌ UniFi OS login failed');
      
      console.log('\n🔍 Step 2: Trying alternative UniFi OS endpoints...');
      
      // Try the legacy auth endpoint
      const legacyLoginData = JSON.stringify({
        username: username,
        password: password
      });

      const legacyResult = await makeRequest('/api/login', 'POST', legacyLoginData);
      console.log(`   Legacy login status: ${legacyResult.statusCode}`);
      console.log(`   Legacy response: ${JSON.stringify(legacyResult.body, null, 2)}`);
      
      // Try the network proxy endpoint
      const proxyResult = await makeRequest('/proxy/network/api/login', 'POST', legacyLoginData);
      console.log(`   Proxy login status: ${proxyResult.statusCode}`);
      console.log(`   Proxy response: ${JSON.stringify(proxyResult.body, null, 2)}`);
    }

  } catch (error) {
    console.error('❌ Error during authentication test:', (error as Error).message);
  }
}

async function checkSystemInfo() {
  try {
    console.log('\n🔍 Step 3: Checking system information...');
    
    const systemResult = await makeRequest('/api/system');
    console.log(`   System info status: ${systemResult.statusCode}`);
    
    if (systemResult.statusCode === 200 && systemResult.body) {
      console.log('   System information:');
      if (systemResult.body.version) {
        console.log(`     Version: ${systemResult.body.version}`);
      }
      if (systemResult.body.build) {
        console.log(`     Build: ${systemResult.body.build}`);
      }
      if (systemResult.body.hostname) {
        console.log(`     Hostname: ${systemResult.body.hostname}`);
      }
      if (systemResult.body.name) {
        console.log(`     Name: ${systemResult.body.name}`);
      }
    }
    
  } catch (error) {
    console.log(`   ❌ System info failed: ${(error as Error).message}`);
  }
}

async function main() {
  if (!username || !password) {
    console.error('❌ Username and password must be set in .env file');
    process.exit(1);
  }

  await testUniFiOSAuth();
  await checkSystemInfo();
  
  console.log('\n💡 Troubleshooting for UniFi OS:');
  console.log('   1. Make sure you can log into the web UI at https://10.0.0.1');
  console.log('   2. UniFi OS accounts are different from UniFi Network accounts');
  console.log('   3. Try using the root/admin account created during initial setup');
  console.log('   4. Check if the account has "Super Administrator" privileges');
  console.log('   5. Look for any account lockout messages in the UI');
  console.log('   6. UniFi OS may require 2FA to be disabled for API access');
  console.log('   7. Try using the owner account (first account created)');
}

main().catch(console.error);
