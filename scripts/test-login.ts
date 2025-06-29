#!/usr/bin/env npx ts-node

import { UniFiAPI, UniFiConfig } from '../src/index';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const config: UniFiConfig = {
  host: process.env.UNIFI_HOST || 'localhost',
  port: parseInt(process.env.UNIFI_PORT || '8443'),
  username: process.env.UNIFI_USERNAME || 'admin',
  password: process.env.UNIFI_PASSWORD || 'password',
  site: process.env.UNIFI_SITE || 'default',
  strictSSL: process.env.UNIFI_STRICT_SSL === 'true'
};

async function testLogin() {
  console.log('🔍 UniFi API Login Test');
  console.log('========================');
  
  console.log(`📋 Configuration:`);
  console.log(`   Host: ${config.host}`);
  console.log(`   Port: ${config.port}`);
  console.log(`   Username: ${config.username}`);
  console.log(`   Password: ${'*'.repeat(config.password.length)} (${config.password.length} chars)`);
  console.log(`   Site: ${config.site}`);
  console.log(`   Strict SSL: ${config.strictSSL}`);
  
  try {
    console.log('\n🔍 Step 1: Creating UniFi API instance...');
    const unifi = new UniFiAPI(config);
    
    console.log('\n🔍 Step 2: Attempting login...');
    const result = await unifi.login();
    
    console.log(`\n✅ Login result: ${result}`);
    console.log(`✅ Is authenticated: ${unifi.isAuthenticated}`);
    
    if (result) {
      console.log('\n🔍 Step 3: Testing API call...');
      try {
        const info = await unifi.getControllerInfo();
        console.log('✅ Controller info:', info);
      } catch (error) {
        console.log('❌ Controller info failed:', error);
      }
      
      console.log('\n🔍 Step 4: Logging out...');
      await unifi.logout();
      console.log('✅ Logout successful');
    } else {
      console.log('❌ Login failed');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

if (require.main === module) {
  testLogin();
}
