/**
 * Standalone Network Scanner Utility
 * 
 * This provides network scanning functionality without Jest dependencies
 */

import { UniFiAPI, UniFiConfig } from '../src/index';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Real network configuration from environment
const createConfig = (): UniFiConfig => ({
  host: process.env.UNIFI_HOST || 'localhost',
  port: parseInt(process.env.UNIFI_PORT || '8443'),
  username: process.env.UNIFI_USERNAME || 'admin',
  password: process.env.UNIFI_PASSWORD || 'password',
  site: process.env.UNIFI_SITE || 'default',
  strictSSL: process.env.UNIFI_STRICT_SSL === 'true'
});

/**
 * Run a comprehensive network scan
 */
export async function runNetworkScan(config?: Partial<UniFiConfig>): Promise<void> {
  const testConfig = { ...createConfig(), ...config };
  const api = new UniFiAPI(testConfig);
  
  try {
    console.log('\n🔍 Starting network scan...');
    console.log(`🔗 Connecting to ${testConfig.host}:${testConfig.port}`);
    
    try {
      await api.login();
      console.log('✅ Authentication successful');
    } catch (authError: any) {
      console.error('❌ Authentication failed');
      console.error('Auth error details:', {
        message: authError.message,
        status: authError.response?.status,
        statusText: authError.response?.statusText,
        data: authError.response?.data,
        config: {
          url: authError.config?.url,
          method: authError.config?.method,
        }
      });
      
      // Provide helpful troubleshooting tips
      console.error('\n🔧 Troubleshooting tips:');
      console.error('1. Check if your credentials are correct');
      console.error('2. Verify the UniFi Controller is accessible');
      console.error('3. Try running: npm run diagnose');
      console.error('4. Ensure the user has admin privileges');
      console.error('5. Check if the site name is correct');
      
      throw authError;
    }
    
    // Get basic network information
    const [devices, clients, networks, sites] = await Promise.all([
      api.getDevices(),
      api.getClients(),
      api.getNetworks(),
      api.getSites()
    ]);
    
    console.log('\n📊 Network Summary:');
    console.log(`   Sites: ${sites.length}`);
    console.log(`   Networks: ${networks.length}`);
    console.log(`   Devices: ${devices.length}`);
    console.log(`   Clients: ${clients.length}`);
    
    // Show device breakdown
    const deviceTypes = devices.reduce((acc, device) => {
      acc[device.type] = (acc[device.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\n📱 Device Breakdown:');
    Object.entries(deviceTypes).forEach(([type, count]) => {
      const icon = type === 'uap' ? '📡' : type === 'usw' ? '🔀' : type === 'ugw' ? '🌐' : '📱';
      console.log(`   ${icon} ${type.toUpperCase()}: ${count}`);
    });
    
    // Show client breakdown
    const wiredClients = clients.filter(c => c.is_wired).length;
    const wirelessClients = clients.filter(c => !c.is_wired).length;
    const guestClients = clients.filter(c => c.is_guest).length;
    
    console.log('\n👥 Client Breakdown:');
    console.log(`   🔌 Wired: ${wiredClients}`);
    console.log(`   📡 Wireless: ${wirelessClients}`);
    console.log(`   🏨 Guest: ${guestClients}`);
    
    // Show some device details
    if (devices.length > 0) {
      console.log('\n📱 Device Details (first 5):');
      devices.slice(0, 5).forEach((device, index) => {
        const icon = device.type === 'uap' ? '📡' : device.type === 'usw' ? '🔀' : device.type === 'ugw' ? '🌐' : '📱';
        console.log(`   ${index + 1}. ${icon} ${device.name || device.model} (${device.mac})`);
        console.log(`      Status: ${device.state === 1 ? '✅ Online' : '❌ Offline'}`);
        console.log(`      IP: ${device.ip}`);
        console.log(`      Version: ${device.version || 'N/A'}`);
      });
    }
    
    // Show some client details
    if (clients.length > 0) {
      console.log('\n👥 Client Details (first 5):');
      clients.slice(0, 5).forEach((client, index) => {
        const deviceName = client.hostname || client.name || `Device-${client.mac.slice(-6)}`;
        console.log(`   ${index + 1}. ${deviceName} (${client.mac})`);
        console.log(`      IP: ${client.ip}`);
        console.log(`      Connection: ${client.is_wired ? '🔌 Wired' : '📡 Wireless'}`);
        if (!client.is_wired && client.rssi) {
          const signalQuality = client.rssi >= -50 ? 'Excellent' : 
                               client.rssi >= -60 ? 'Good' : 
                               client.rssi >= -70 ? 'Fair' : 'Poor';
          console.log(`      Signal: ${client.rssi}dBm (${signalQuality})`);
        }
      });
    }
    
    // Show network details
    if (networks.length > 0) {
      console.log('\n🌐 Network Configuration:');
      networks.forEach((network, index) => {
        console.log(`   ${index + 1}. ${network.name} (${network.purpose})`);
        console.log(`      VLAN: ${network.vlan || 'None'}`);
        console.log(`      Subnet: ${network.ip_subnet || 'N/A'}`);
        console.log(`      DHCP: ${network.dhcpd_enabled ? 'Enabled' : 'Disabled'}`);
      });
    }
    
    // Test controller information
    try {
      const controllerInfo = await api.getControllerInfo();
      console.log('\n🎛️ Controller Information:');
      console.log(`   Version: ${controllerInfo.version}`);
      console.log(`   Build: ${controllerInfo.build || 'N/A'}`);
    } catch (error) {
      console.log('\n⚠️ Could not retrieve controller information');
    }
    
    // Test alerts
    try {
      const alerts = await api.getAlerts();
      console.log(`\n🚨 System Alerts: ${alerts.length}`);
      if (alerts.length > 0) {
        console.log('   Recent alerts:');
        alerts.slice(0, 3).forEach((alert, index) => {
          console.log(`   ${index + 1}. ${alert.msg}`);
        });
      }
    } catch (error) {
      console.log('\n⚠️ Could not retrieve alerts');
    }
    
    await api.logout();
    console.log('\n✅ Network scan completed successfully');
    
    // Health summary
    const onlineDevices = devices.filter(d => d.state === 1).length;
    const deviceHealth = devices.length > 0 ? (onlineDevices / devices.length) * 100 : 100;
    
    console.log('\n📈 Network Health Summary:');
    console.log(`   Device Health: ${deviceHealth.toFixed(1)}% (${onlineDevices}/${devices.length} online)`);
    console.log(`   Client Load: ${clients.length} connected`);
    console.log(`   Network Status: ${sites.length > 0 ? '✅ Operational' : '⚠️ Check Configuration'}`);
    
  } catch (error: any) {
    console.error('\n❌ Network scan failed');
    
    // Enhanced error reporting
    if (error.response) {
      console.error('HTTP Response Error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        url: error.config?.url
      });
    } else if (error.request) {
      console.error('Network Request Error:', {
        message: error.message,
        code: error.code,
        address: error.address,
        port: error.port
      });
    } else {
      console.error('General Error:', {
        message: error.message,
        stack: error.stack
      });
    }
    
    console.error('\n🔧 Next steps:');
    console.error('1. Run "npm run diagnose" for detailed diagnostics');
    console.error('2. Check your .env file configuration');
    console.error('3. Verify UniFi Controller is accessible');
    
    throw error;
  }
}

/**
 * Test basic connectivity without full scan
 */
export async function testConnectivity(config?: Partial<UniFiConfig>): Promise<boolean> {
  const testConfig = { ...createConfig(), ...config };
  const api = new UniFiAPI(testConfig);
  
  try {
    console.log(`🔍 Testing connectivity to ${testConfig.host}:${testConfig.port}...`);
    
    await api.login();
    console.log('✅ Connection successful');
    
    await api.logout();
    console.log('✅ Logout successful');
    
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Validate environment configuration
 */
export function validateEnvironment(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!process.env.UNIFI_HOST) {
    errors.push('UNIFI_HOST is required');
  }
  
  if (!process.env.UNIFI_USERNAME) {
    errors.push('UNIFI_USERNAME is required');
  }
  
  if (!process.env.UNIFI_PASSWORD) {
    errors.push('UNIFI_PASSWORD is required');
  }
  
  const port = parseInt(process.env.UNIFI_PORT || '8443');
  if (isNaN(port) || port < 1 || port > 65535) {
    errors.push('UNIFI_PORT must be a valid port number (1-65535)');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
