#!/usr/bin/env ts-node

/**
 * Quick Network Scanner
 * 
 * This script performs a quick scan of your UniFi network
 * without running the full test suite.
 * 
 * Usage:
 *   npm run scan
 *   or
 *   npx ts-node scripts/scan.ts
 */

import { runNetworkScan, testConnectivity, validateEnvironment } from '../src/scanner';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main(): Promise<void> {
  try {
    console.log('🔍 UniFi Network Scanner');
    console.log('========================');
    
    // Validate environment configuration
    const validation = validateEnvironment();
    
    if (!validation.valid) {
      console.error('\n❌ Configuration Error:');
      validation.errors.forEach(error => {
        console.error(`   - ${error}`);
      });
      
      console.log('\n📋 Setup Instructions:');
      console.log('1. Copy .env.example to .env');
      console.log('2. Fill in your UniFi Controller details in .env');
      console.log('3. Run: npm run scan');
      console.log('\nRequired variables: UNIFI_HOST, UNIFI_USERNAME, UNIFI_PASSWORD');
      process.exit(1);
    }
    
    // Test basic connectivity first
    console.log('\n🔗 Testing connectivity...');
    const connected = await testConnectivity();
    
    if (!connected) {
      console.log('\n💡 Troubleshooting tips:');
      console.log('- Check if the UniFi Controller is running');
      console.log('- Verify the host/IP address and port');
      console.log('- Check username and password');
      console.log('- Try setting UNIFI_STRICT_SSL=false for self-signed certificates');
      process.exit(1);
    }
    
    // Run full network scan
    await runNetworkScan();
    
    console.log('\n🎉 Scan completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('- Run full integration tests: npm run test:integration');
    console.log('- See TESTING.md for detailed testing guide');
    
  } catch (error) {
    console.error('\n❌ Scan failed:', error instanceof Error ? error.message : error);
    
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED')) {
        console.log('\n💡 Connection refused - check if UniFi Controller is running');
      } else if (error.message.includes('ENOTFOUND')) {
        console.log('\n💡 Host not found - check UNIFI_HOST setting');
      } else if (error.message.includes('certificate')) {
        console.log('\n💡 SSL certificate issue - try setting UNIFI_STRICT_SSL=false');
      } else if (error.message.includes('401') || error.message.includes('Invalid credentials')) {
        console.log('\n💡 Authentication failed - check username and password');
      }
    }
    
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('\n❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('\n❌ Uncaught Exception:', error);
  process.exit(1);
});

if (require.main === module) {
  main();
}
