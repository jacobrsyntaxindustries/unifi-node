#!/usr/bin/env npx ts-node

import * as dotenv from 'dotenv';
import { UniFiAPI } from '../src/index';

// Load environment variables
dotenv.config();

async function debugActiveClients() {
  console.log('🔍 Debug Active Client Data');
  console.log('============================\n');

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

    console.log('🔍 Step 2: Getting all clients...');
    const allClients = await unifi.getClients();
    console.log(`✅ Found ${allClients.length} total clients\n`);

    // Filter for currently connected clients
    const connectedClients = allClients.filter(client => {
      const now = Math.floor(Date.now() / 1000);
      const lastSeen = client.last_seen || 0;
      // Consider connected if seen within last 5 minutes
      return (now - lastSeen) < 300;
    });

    console.log(`🔍 Currently connected clients: ${connectedClients.length}`);
    
    if (connectedClients.length > 0) {
      console.log('\n🔍 Step 3: Examining connected client...');
      const client = connectedClients[0];
      
      console.log('Connected client structure:');
      console.log(JSON.stringify(client, null, 2));
      
      // Check for any IP-related fields
      const ipFields = Object.keys(client).filter(key => 
        key.toLowerCase().includes('ip') || 
        key.toLowerCase().includes('addr')
      );
      
      console.log('\n🔍 IP-related fields found:');
      if (ipFields.length > 0) {
        ipFields.forEach(field => {
          console.log(`   ${field}: ${(client as any)[field]}`);
        });
      } else {
        console.log('   ❌ No IP-related fields found');
      }
    } else {
      console.log('❌ No currently connected clients found');
      
      // Show the most recently seen client
      const recentClient = allClients.sort((a, b) => (b.last_seen || 0) - (a.last_seen || 0))[0];
      if (recentClient) {
        const lastSeenDate = new Date((recentClient.last_seen || 0) * 1000);
        console.log(`\n🔍 Most recent client (last seen: ${lastSeenDate.toLocaleString()}):`);
        
        // Check for any IP-related fields
        const ipFields = Object.keys(recentClient).filter(key => 
          key.toLowerCase().includes('ip') || 
          key.toLowerCase().includes('addr')
        );
        
        console.log('IP-related fields:');
        if (ipFields.length > 0) {
          ipFields.forEach(field => {
            console.log(`   ${field}: ${(recentClient as any)[field]}`);
          });
        } else {
          console.log('   ❌ No IP-related fields found');
        }
      }
    }

    // Try alternative endpoints that might have IP information
    console.log('\n🔍 Step 4: Trying alternative endpoints...');
    
    try {
      // Try the active clients endpoint (if it exists)
      console.log('   Trying active clients endpoint...');
      const response = await (unifi as any).request(`/proxy/network/api/s/${config.site}/stat/sta/active`);
      console.log(`   ✅ Active clients response: ${JSON.stringify(response, null, 2)}`);
    } catch (error) {
      console.log(`   ❌ Active clients endpoint failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    try {
      // Try the all active endpoint
      console.log('   Trying all active endpoint...');
      const response = await (unifi as any).request(`/proxy/network/api/s/${config.site}/stat/alluser`);
      console.log(`   ✅ All users response: Found ${Array.isArray(response) ? response.length : 'unknown'} entries`);
      if (Array.isArray(response) && response.length > 0) {
        const firstUser = response[0];
        console.log(`   First user structure: ${JSON.stringify(firstUser, null, 2)}`);
      }
    } catch (error) {
      console.log(`   ❌ All users endpoint failed: ${error instanceof Error ? error.message : String(error)}`);
    }

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
  }
}

if (require.main === module) {
  debugActiveClients().catch(console.error);
}
