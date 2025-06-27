import { UniFiAPI, UniFiConfig } from '../src/index';

// Configuration - Update these values for your environment
const config: UniFiConfig = {
  host: '192.168.1.1',        // Your UniFi Controller IP
  port: 8443,                 // Controller port (usually 8443)
  username: 'admin',          // Controller username
  password: 'your-password',  // Controller password
  site: 'default',           // Site name (usually 'default')
  strictSSL: false           // Set to true in production with valid certificates
};

async function basicUsage(): Promise<void> {
  const unifi = new UniFiAPI(config);

  try {
    console.log('🔐 Connecting to UniFi Controller...');
    await unifi.login();
    console.log('✅ Successfully authenticated!');

    // Get controller information
    console.log('\n📊 Controller Information:');
    const controllerInfo = await unifi.getControllerInfo();
    console.log(`Version: ${controllerInfo.version}`);
    console.log(`Build: ${controllerInfo.build}`);

    // Get all sites
    console.log('\n🏢 Sites:');
    const sites = await unifi.getSites();
    sites.forEach(site => {
      console.log(`- ${site.name} (${site.desc})`);
    });

    // Get all devices
    console.log('\n📱 Devices:');
    const devices = await unifi.getDevices();
    devices.forEach(device => {
      console.log(`- ${device.name || device.model} (${device.mac})`);
      console.log(`  State: ${device.state}, Type: ${device.type}`);
      console.log(`  IP: ${device.ip}, Version: ${device.version}`);
    });

    // Get all connected clients
    console.log('\n👥 Connected Clients:');
    const clients = await unifi.getClients();
    clients.forEach(client => {
      console.log(`- ${client.hostname || client.name || 'Unknown'} (${client.mac})`);
      console.log(`  IP: ${client.ip}, Signal: ${client.rssi || 'N/A'}dBm`);
      console.log(`  TX/RX: ${formatBytes(client.tx_bytes)}/${formatBytes(client.rx_bytes)}`);
    });

    // Get system statistics
    console.log('\n📈 System Statistics:');
    const stats = await unifi.getSystemStats();
    if (stats && stats.length > 0) {
      const systemStats = stats[0];
      console.log(`Uptime: ${formatUptime(systemStats.uptime)}`);
      console.log(`Memory: ${Math.round(systemStats.mem_used / 1024 / 1024)}MB used`);
      console.log(`Load Average: ${systemStats.loadavg_1}`);
    }

    // Get network configurations
    console.log('\n🌐 Networks:');
    const networks = await unifi.getNetworks();
    networks.forEach(network => {
      console.log(`- ${network.name}`);
      console.log(`  VLAN: ${network.vlan || 'None'}`);
      console.log(`  Purpose: ${network.purpose}`);
    });

    // Get alerts
    console.log('\n🚨 Active Alerts:');
    const alerts = await unifi.getAlerts();
    if (alerts.length === 0) {
      console.log('No active alerts');
    } else {
      alerts.forEach(alert => {
        console.log(`- ${alert.msg}`);
        console.log(`  Time: ${new Date(alert.time * 1000).toLocaleString()}`);
        console.log(`  Key: ${alert.key}`);
      });
    }

    console.log('\n🔓 Logging out...');
    await unifi.logout();
    console.log('✅ Disconnected successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'INVALID_CREDENTIALS') {
      console.error('Please check your username and password');
    } else if (error.code === 'CONNECTION_ERROR') {
      console.error('Please check your host and port configuration');
    }
  }
}

// Helper functions
function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

function formatUptime(seconds) {
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

// Run the example
if (require.main === module) {
  basicUsage().catch(console.error);
}

module.exports = basicUsage;
