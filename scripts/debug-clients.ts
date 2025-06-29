#!/usr/bin/env npx ts-node

import * as dotenv from 'dotenv';
import { UniFiAPI } from '../src/index';

// Load environment variables
dotenv.config();

async function debugClients() {
  console.log('🔍 Debug Client Data Structure');
  console.log('===============================\n');

  const config = {
    host: process.env.UNIFI_HOST || '10.0.0.1',
    port: parseInt(process.env.UNIFI_PORT || '443'),
    username: process.env.UNIFI_USERNAME || 'admin',
    password: process.env.UNIFI_PASSWORD || '',
    site: process.env.UNIFI_SITE || 'default',
    strictSSL: false
  };

  try {
    console.log('🔍 Step 1: Connecting and authenticating...');
    const unifi = new UniFiAPI(config);
    await unifi.login();
    console.log('✅ Authenticated successfully\n');

    console.log('🔍 Step 2: Getting client data...');
    const clients = await unifi.getClients();
    console.log(`✅ Found ${clients.length} clients\n`);

    if (clients.length > 0) {
      console.log('🔍 Step 3: Examining first client structure...');
      const firstClient = clients[0];
      console.log('Raw client object:');
      console.log(JSON.stringify(firstClient, null, 2));
      
      console.log('\n🔍 Available properties:');
      Object.keys(firstClient).forEach(key => {
        const value = (firstClient as any)[key];
        console.log(`   ${key}: ${typeof value} = ${Array.isArray(value) ? '[Array]' : value}`);
      });
      
      // Check for common IP field names
      const ipFields = ['ip', 'fixed_ip', 'use_fixedip', 'last_ip', 'network_ip'];
      console.log('\n🔍 Checking for IP-related fields:');
      ipFields.forEach(field => {
        if ((firstClient as any)[field] !== undefined) {
          console.log(`   ✅ ${field}: ${(firstClient as any)[field]}`);
        } else {
          console.log(`   ❌ ${field}: undefined`);
        }
      });
    } else {
      console.log('ℹ️  No clients found to debug');
    }

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
  }
}

if (require.main === module) {
  debugClients().catch(console.error);
}
