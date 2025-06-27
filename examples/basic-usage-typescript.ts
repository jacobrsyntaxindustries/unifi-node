import { UniFiAPI, UniFiConfig, UniFiDevice, UniFiClient } from '../src/index';

// Configuration - Update these values for your environment
const config: UniFiConfig = {
  host: '192.168.1.1',        // Your UniFi Controller IP
  port: 8443,                 // Controller port (usually 8443)
  username: 'admin',          // Controller username
  password: 'your-password',  // Controller password
  site: 'default',           // Site name (usually 'default')
  strictSSL: false           // Set to true in production with valid certificates
};

async function basicUsageTypeScript(): Promise<void> {
  const unifi = new UniFiAPI(config);

  try {
    console.log('🔐 Connecting to UniFi Controller...');
    await unifi.login();
    console.log('✅ Successfully authenticated!');

    // Get controller information with TypeScript types
    console.log('\n📊 Controller Information:');
    const controllerInfo = await unifi.getControllerInfo();
    console.log(`Version: ${controllerInfo.version}`);
    console.log(`Build: ${controllerInfo.build}`);

    // Get all sites with TypeScript types
    console.log('\n🏢 Sites:');
    const sites = await unifi.getSites();
    sites.forEach(site => {
      console.log(`- ${site.name} (${site.desc})`);
    });

    // Get all devices with TypeScript types
    console.log('\n📱 Devices:');
    const devices: UniFiDevice[] = await unifi.getDevices();
    devices.forEach(device => {
      console.log(`- ${device.name || device.model} (${device.mac})`);
      console.log(`  State: ${device.state}, Type: ${device.type}`);
      console.log(`  IP: ${device.ip}, Version: ${device.version || 'N/A'}`);
      console.log(`  Adopted: ${device.adopted ? 'Yes' : 'No'}`);
    });

    // Get all connected clients with TypeScript types
    console.log('\n👥 Connected Clients:');
    const clients: UniFiClient[] = await unifi.getClients();
    clients.forEach(client => {
      console.log(`- ${client.hostname || client.name || 'Unknown'} (${client.mac})`);
      console.log(`  IP: ${client.ip}, Signal: ${client.rssi || 'N/A'}dBm`);
      console.log(`  TX/RX: ${formatBytes(client.tx_bytes)}/${formatBytes(client.rx_bytes)}`);
      console.log(`  Connection: ${client.is_wired ? 'Wired' : 'Wireless'}`);
      console.log(`  Guest: ${client.is_guest ? 'Yes' : 'No'}`);
    });

    // Demonstrate type safety with device filtering
    console.log('\n📡 Access Points:');
    const accessPoints = devices.filter(device => device.type === 'uap');
    console.log(`Found ${accessPoints.length} access points`);
    
    console.log('\n🔌 Switches:');
    const switches = devices.filter(device => device.type === 'usw');
    console.log(`Found ${switches.length} switches`);

    // Demonstrate type safety with client filtering
    console.log('\n📶 Wireless Clients:');
    const wirelessClients = clients.filter(client => !client.is_wired);
    console.log(`Found ${wirelessClients.length} wireless clients`);
    
    if (wirelessClients.length > 0) {
      // TypeScript ensures rssi is optional and we handle it properly
      const avgSignal = wirelessClients
        .filter(client => client.rssi !== undefined)
        .reduce((sum, client) => sum + (client.rssi || 0), 0) / wirelessClients.length;
      console.log(`Average signal strength: ${avgSignal.toFixed(1)}dBm`);
    }

    // Example of working with specific device
    if (devices.length > 0) {
      const firstDevice = devices[0];
      console.log(`\n🔍 Device Details for ${firstDevice.name || firstDevice.model}:`);
      
      try {
        const deviceStats = await unifi.getDeviceStats(firstDevice.mac);
        if (deviceStats) {
          console.log(`  Detailed stats available: Yes`);
          console.log(`  Uptime: ${formatUptime(deviceStats.uptime || 0)}`);
          if (deviceStats.general_temperature) {
            console.log(`  Temperature: ${deviceStats.general_temperature}°C`);
          }
        }
      } catch (error) {
        console.log(`  Detailed stats: Not available`);
      }
    }

    // Example of working with specific client
    if (clients.length > 0) {
      const firstClient = clients[0];
      console.log(`\n🔍 Client Details for ${firstClient.hostname || firstClient.mac}:`);
      
      try {
        const clientStats = await unifi.getClientStats(firstClient.mac);
        if (clientStats) {
          console.log(`  Detailed stats available: Yes`);
          console.log(`  Session duration: ${formatUptime(clientStats.uptime)}`);
          if (clientStats.satisfaction) {
            console.log(`  Satisfaction: ${clientStats.satisfaction}%`);
          }
        }
      } catch (error) {
        console.log(`  Detailed stats: Not available`);
      }
    }

    // Get system statistics with TypeScript types
    console.log('\n📈 System Statistics:');
    const stats = await unifi.getSystemStats();
    if (stats && stats.length > 0) {
      const systemStats = stats[0];
      console.log(`Uptime: ${formatUptime(systemStats.uptime)}`);
      console.log(`Memory: ${Math.round(systemStats.mem_used / 1024 / 1024)}MB used of ${Math.round(systemStats.mem_total / 1024 / 1024)}MB`);
      console.log(`Load Average: ${systemStats.loadavg_1}`);
      if (systemStats.general_temperature) {
        console.log(`Temperature: ${systemStats.general_temperature}°C`);
      }
    }

    // TypeScript event handling example
    console.log('\n🔔 Setting up TypeScript event handlers...');
    
    // Type-safe event handlers
    unifi.on('client.connected', (clientData: any) => {
      console.log(`📱 Client connected: ${clientData.hostname || clientData.mac}`);
    });

    unifi.on('client.disconnected', (clientData: any) => {
      console.log(`📱 Client disconnected: ${clientData.hostname || clientData.mac}`);
    });

    unifi.on('device.detected', (deviceData: any) => {
      console.log(`🔍 Device detected: ${deviceData.name || deviceData.mac}`);
    });

    unifi.on('error', (error: Error) => {
      console.error(`❌ Error: ${error.message}`);
    });

    console.log('Event handlers configured with TypeScript type safety!');

    console.log('\n🔓 Logging out...');
    await unifi.logout();
    console.log('✅ Disconnected successfully!');

  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
    
    // TypeScript-aware error handling
    if (error instanceof Error) {
      const unifiError = error as any;
      if (unifiError.code === 'INVALID_CREDENTIALS') {
        console.error('Please check your username and password');
      } else if (unifiError.code === 'CONNECTION_ERROR') {
        console.error('Please check your host and port configuration');
      }
    }
  }
}

// Helper functions with TypeScript types
function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

function formatUptime(seconds: number): string {
  if (!seconds) return '0s';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  let result = '';
  if (days > 0) result += `${days}d `;
  if (hours > 0) result += `${hours}h `;
  if (minutes > 0) result += `${minutes}m`;
  
  return result || '< 1m';
}

// Type-safe configuration validation
function validateConfig(config: UniFiConfig): boolean {
  if (!config.host || !config.username || !config.password) {
    throw new Error('Host, username, and password are required');
  }
  
  if (config.port && (config.port < 1 || config.port > 65535)) {
    throw new Error('Port must be between 1 and 65535');
  }
  
  return true;
}

// Example of extending the API with custom types
interface NetworkStats {
  totalDevices: number;
  onlineDevices: number;
  totalClients: number;
  wirelessClients: number;
  guestClients: number;
  averageSignal?: number;
}

async function getNetworkStats(unifi: UniFiAPI): Promise<NetworkStats> {
  const [devices, clients] = await Promise.all([
    unifi.getDevices(),
    unifi.getClients()
  ]);

  const wirelessClients = clients.filter(c => !c.is_wired);
  const guestClients = clients.filter(c => c.is_guest);
  
  const wirelessClientsWithSignal = wirelessClients.filter(c => c.rssi !== undefined);
  const averageSignal = wirelessClientsWithSignal.length > 0
    ? wirelessClientsWithSignal.reduce((sum, c) => sum + (c.rssi || 0), 0) / wirelessClientsWithSignal.length
    : undefined;

  return {
    totalDevices: devices.length,
    onlineDevices: devices.filter(d => d.state === 1).length,
    totalClients: clients.length,
    wirelessClients: wirelessClients.length,
    guestClients: guestClients.length,
    averageSignal
  };
}

// Run the example
if (require.main === module) {
  basicUsageTypeScript().catch(console.error);
}

export { basicUsageTypeScript, validateConfig, getNetworkStats };
export type { NetworkStats };
