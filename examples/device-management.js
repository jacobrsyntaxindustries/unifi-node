const UniFiAPI = require('../src/index');

// Configuration - Update these values for your environment
const config = {
  host: '192.168.1.1',
  port: 8443,
  username: 'admin',
  password: 'your-password',
  site: 'default',
  strictSSL: false
};

async function deviceManagement() {
  const unifi = new UniFiAPI(config);

  try {
    console.log('🔐 Connecting to UniFi Controller...');
    await unifi.login();

    // Get all devices with detailed information
    console.log('\n📱 Device Management Demo');
    console.log('='.repeat(50));
    
    const devices = await unifi.getDevices();
    
    for (const device of devices) {
      console.log(`\n🔹 Device: ${device.name || device.model}`);
      console.log(`   MAC: ${device.mac}`);
      console.log(`   Type: ${device.type}`);
      console.log(`   State: ${device.state}`);
      console.log(`   IP: ${device.ip}`);
      console.log(`   Model: ${device.model}`);
      console.log(`   Version: ${device.version}`);
      console.log(`   Uptime: ${formatUptime(device.uptime)}`);
      
      if (device.stat_sw) {
        console.log(`   Switch Stats - RX: ${formatBytes(device.stat_sw.rx_bytes)}, TX: ${formatBytes(device.stat_sw.tx_bytes)}`);
      }
      
      if (device.radio_table) {
        console.log(`   Radios: ${device.radio_table.length}`);
        device.radio_table.forEach((radio, index) => {
          console.log(`     Radio ${index + 1}: ${radio.name} (${radio.channel})`);
        });
      }

      // Get detailed device statistics
      try {
        const deviceStats = await unifi.getDeviceStats(device.mac);
        if (deviceStats) {
          console.log(`   Temperature: ${deviceStats.general_temperature || 'N/A'}°C`);
          console.log(`   CPU Usage: ${deviceStats.system_stats?.cpu || 'N/A'}%`);
          console.log(`   Memory Usage: ${deviceStats.system_stats?.mem || 'N/A'}%`);
        }
      } catch (err) {
        console.log(`   Stats: Unable to retrieve (${err.message})`);
      }
    }

    // Demo device operations (commented out for safety)
    console.log('\n🔧 Device Operations Demo');
    console.log('='.repeat(50));
    
    if (devices.length > 0) {
      const firstDevice = devices[0];
      console.log(`\nSelected device for demo: ${firstDevice.name || firstDevice.model} (${firstDevice.mac})`);
      
      // UNCOMMENT THESE LINES TO ACTUALLY PERFORM OPERATIONS
      // WARNING: These operations will affect your network!
      
      /*
      console.log('⚠️  WARNING: Uncommenting the following operations will restart/modify your device!');
      
      // Restart device
      console.log('🔄 Restarting device...');
      await unifi.restartDevice(firstDevice.mac);
      console.log('✅ Restart command sent');
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check device status after restart
      console.log('📊 Checking device status...');
      const updatedDevice = await unifi.getDevice(firstDevice.mac);
      console.log(`Device state: ${updatedDevice.state}`);
      */
      
      console.log('ℹ️  Device operations are commented out for safety.');
      console.log('   Uncomment the relevant sections to perform actual device management.');
    }

    // Show device adoption status
    console.log('\n🏠 Device Adoption Status');
    console.log('='.repeat(50));
    
    const adoptedDevices = devices.filter(d => d.adopted === true);
    const pendingDevices = devices.filter(d => d.adopted === false);
    
    console.log(`✅ Adopted devices: ${adoptedDevices.length}`);
    console.log(`⏳ Pending adoption: ${pendingDevices.length}`);
    
    if (pendingDevices.length > 0) {
      console.log('\nDevices pending adoption:');
      pendingDevices.forEach(device => {
        console.log(`- ${device.model} (${device.mac}) - ${device.ip}`);
      });
      
      // Demo: Adopt first pending device (commented for safety)
      /*
      console.log(`\n🏠 Adopting device: ${pendingDevices[0].mac}`);
      await unifi.adoptDevice(pendingDevices[0].mac);
      console.log('✅ Adoption command sent');
      */
    }

    // Show device health summary
    console.log('\n🏥 Device Health Summary');
    console.log('='.repeat(50));
    
    const onlineDevices = devices.filter(d => d.state === 1);
    const offlineDevices = devices.filter(d => d.state === 0);
    const updatingDevices = devices.filter(d => d.state === 4);
    
    console.log(`🟢 Online: ${onlineDevices.length}`);
    console.log(`🔴 Offline: ${offlineDevices.length}`);
    console.log(`🟡 Updating: ${updatingDevices.length}`);
    
    if (offlineDevices.length > 0) {
      console.log('\nOffline devices:');
      offlineDevices.forEach(device => {
        console.log(`- ${device.name || device.model} (${device.mac})`);
      });
    }

    await unifi.logout();
    console.log('\n✅ Device management demo completed!');

  } catch (error) {
    console.error('❌ Error:', error.message);
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
  deviceManagement().catch(console.error);
}

module.exports = deviceManagement;
