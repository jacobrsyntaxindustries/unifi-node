/**
 * Integration Tests for UniFi API
 * 
 * These tests run against a real UniFi Controller.
 * 
 * Setup:
 * 1. Copy .env.example to .env
 * 2. Fill in your UniFi Controller details in .env
 * 3. Run: npm run test:integration
 * 
 * WARNING: These tests will interact with your real network!
 * Use a test/development environment only.
 */

import { UniFiAPI, UniFiConfig } from '../src/index';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Check if integration tests should run
const SHOULD_RUN_INTEGRATION = process.env.RUN_INTEGRATION_TESTS === 'true';

// Skip all integration tests if not explicitly enabled
const describeIntegration = SHOULD_RUN_INTEGRATION ? describe : describe.skip;

// Real network configuration from environment
const realConfig: UniFiConfig = {
  host: process.env.UNIFI_HOST || 'localhost',
  port: parseInt(process.env.UNIFI_PORT || '8443'),
  username: process.env.UNIFI_USERNAME || 'admin',
  password: process.env.UNIFI_PASSWORD || 'password',
  site: process.env.UNIFI_SITE || 'default',
  strictSSL: process.env.UNIFI_STRICT_SSL === 'true'
};

describeIntegration('UniFi API Integration Tests', () => {
  let unifi: UniFiAPI;
  
  beforeAll(() => {
    // Verify required environment variables
    if (!process.env.UNIFI_HOST || !process.env.UNIFI_USERNAME || !process.env.UNIFI_PASSWORD) {
      throw new Error(
        'Missing required environment variables. Please set UNIFI_HOST, UNIFI_USERNAME, and UNIFI_PASSWORD'
      );
    }
    
    console.log(`🔗 Testing against UniFi Controller at ${realConfig.host}:${realConfig.port}`);
    console.log(`📍 Site: ${realConfig.site}`);
    console.log(`🔒 Strict SSL: ${realConfig.strictSSL}`);
    
    unifi = new UniFiAPI(realConfig);
  });

  afterAll(async () => {
    if (unifi && unifi.isAuthenticated) {
      try {
        await unifi.logout();
        console.log('✅ Logged out successfully');
      } catch (error) {
        console.warn('⚠️ Error during logout:', error);
      }
    }
  });

  describe('Authentication', () => {
    test('should authenticate successfully', async () => {
      const result = await unifi.login();
      expect(result).toBe(true);
      expect(unifi.isAuthenticated).toBe(true);
      console.log('✅ Authentication successful');
    }, 30000); // 30 second timeout

    test('should get controller info', async () => {
      const info = await unifi.getControllerInfo();
      expect(info).toBeDefined();
      expect(info.version).toBeDefined();
      console.log(`📊 Controller version: ${info.version}`);
    }, 10000);
  });

  describe('Device Management', () => {
    test('should get devices list', async () => {
      const devices = await unifi.getDevices();
      expect(Array.isArray(devices)).toBe(true);
      console.log(`📱 Found ${devices.length} devices`);
      
      if (devices.length > 0) {
        const device = devices[0];
        expect(device.mac).toBeDefined();
        expect(device.model).toBeDefined();
        expect(device.type).toBeDefined();
        console.log(`   First device: ${device.name || device.model} (${device.mac})`);
      }
    }, 15000);

    test('should get device statistics', async () => {
      const devices = await unifi.getDevices();
      
      if (devices.length > 0) {
        const deviceMac = devices[0].mac;
        const stats = await unifi.getDeviceStats(deviceMac);
        
        if (stats) {
          expect(stats.mac).toBe(deviceMac);
          console.log(`📈 Device stats retrieved for ${deviceMac}`);
        }
      } else {
        console.log('⚠️ No devices found to test statistics');
      }
    }, 15000);
  });

  describe('Client Management', () => {
    test('should get clients list', async () => {
      const clients = await unifi.getClients();
      expect(Array.isArray(clients)).toBe(true);
      console.log(`👥 Found ${clients.length} connected clients`);
      
      if (clients.length > 0) {
        const client = clients[0];
        expect(client.mac).toBeDefined();
        
        // Find a client with an IP address (some might be disconnected)
        const clientWithIP = clients.find(c => c.ip);
        if (clientWithIP) {
          expect(clientWithIP.ip).toBeDefined();
          console.log(`   Client with IP: ${clientWithIP.hostname || clientWithIP.name || 'Unknown'} (${clientWithIP.ip})`);
        } else {
          console.log(`   No clients currently have IP addresses (all may be disconnected)`);
        }
        
        console.log(`   First client: ${client.hostname || client.name || 'Unknown'} (MAC: ${client.mac})`);
      }
    }, 15000);

    test('should get client statistics', async () => {
      const clients = await unifi.getClients();
      
      if (clients.length > 0) {
        const clientMac = clients[0].mac;
        const stats = await unifi.getClientStats(clientMac);
        
        if (stats) {
          expect(stats.mac).toBe(clientMac);
          console.log(`📈 Client stats retrieved for ${clientMac}`);
        }
      } else {
        console.log('⚠️ No clients found to test statistics');
      }
    }, 15000);
  });

  describe('Network Management', () => {
    test('should get networks list', async () => {
      const networks = await unifi.getNetworks();
      expect(Array.isArray(networks)).toBe(true);
      console.log(`🌐 Found ${networks.length} networks`);
      
      if (networks.length > 0) {
        const network = networks[0];
        expect(network.name).toBeDefined();
        expect(network.purpose).toBeDefined();
        console.log(`   First network: ${network.name} (${network.purpose})`);
      }
    }, 15000);

    test('should get system statistics', async () => {
      const stats = await unifi.getSystemStats();
      expect(Array.isArray(stats)).toBe(true);
      console.log(`📊 Retrieved system statistics`);
    }, 15000);
  });

  describe('Site Management', () => {
    test('should get sites list', async () => {
      const sites = await unifi.getSites();
      expect(Array.isArray(sites)).toBe(true);
      expect(sites.length).toBeGreaterThan(0);
      console.log(`🏢 Found ${sites.length} sites`);
      
      const site = sites[0];
      expect(site.name).toBeDefined();
      expect(site.desc).toBeDefined();
      console.log(`   Current site: ${site.name} (${site.desc})`);
    }, 15000);
  });

  describe('Alerts', () => {
    test('should get alerts list', async () => {
      const alerts = await unifi.getAlerts();
      expect(Array.isArray(alerts)).toBe(true);
      console.log(`🚨 Found ${alerts.length} alerts`);
      
      if (alerts.length > 0) {
        const alert = alerts[0];
        expect(alert.key).toBeDefined();
        expect(alert.msg).toBeDefined();
        console.log(`   Latest alert: ${alert.msg}`);
      }
    }, 15000);
  });

  describe('Real-time Events', () => {
    test('should enable event streaming', async () => {
      const result = await unifi.enableEvents();
      expect(result).toBe(true);
      console.log('🎧 Event streaming enabled');
      
      // Test event listener for a short time
      return new Promise<void>((resolve) => {
        let eventReceived = false;
        
        const timeout = setTimeout(() => {
          if (!eventReceived) {
            console.log('⚠️ No events received during test period');
          }
          resolve();
        }, 5000); // Wait 5 seconds for events
        
        unifi.on('event', (event) => {
          if (!eventReceived) {
            eventReceived = true;
            console.log(`📝 Received event: ${event.type || 'unknown'}`);
            clearTimeout(timeout);
            resolve();
          }
        });
        
        unifi.on('client.connected', (client) => {
          if (!eventReceived) {
            eventReceived = true;
            console.log(`✅ Client connected: ${client.hostname || client.mac}`);
            clearTimeout(timeout);
            resolve();
          }
        });
        
        unifi.on('client.disconnected', (client) => {
          if (!eventReceived) {
            eventReceived = true;
            console.log(`❌ Client disconnected: ${client.hostname || client.mac}`);
            clearTimeout(timeout);
            resolve();
          }
        });
      });
    }, 15000);

    test('should disable event streaming', async () => {
      const result = await unifi.disableEvents();
      expect(result).toBe(true);
      console.log('🔇 Event streaming disabled');
    }, 5000);
  });
});

// Note: For standalone network scanning without Jest, use src/scanner.ts instead
// This export is kept for compatibility but requires Jest environment
