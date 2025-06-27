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

async function realTimeEvents() {
  const unifi = new UniFiAPI(config);

  try {
    console.log('🔐 Connecting to UniFi Controller...');
    await unifi.login();

    console.log('\n🔄 Real-Time Events Demo');
    console.log('='.repeat(50));
    console.log('This demo will listen for real-time events from your UniFi network.');
    console.log('Try connecting/disconnecting devices to see events in action!');
    console.log('Press Ctrl+C to stop...\n');

    // Set up event handlers
    unifi.on('client.connected', (client) => {
      console.log(`✅ Client Connected: ${client.hostname || client.name || client.mac}`);
      console.log(`   IP: ${client.ip || 'N/A'}`);
      console.log(`   Connection: ${client.is_wired ? 'Wired' : 'Wireless'}`);
      if (!client.is_wired && client.rssi) {
        console.log(`   Signal: ${client.rssi}dBm`);
      }
      console.log(`   Time: ${new Date().toLocaleString()}\n`);
    });

    unifi.on('client.disconnected', (client) => {
      console.log(`❌ Client Disconnected: ${client.hostname || client.name || client.mac}`);
      console.log(`   Duration: ${formatUptime(client.uptime || 0)}`);
      console.log(`   Data Used: ⬇️ ${formatBytes(client.rx_bytes)} / ⬆️ ${formatBytes(client.tx_bytes)}`);
      console.log(`   Time: ${new Date().toLocaleString()}\n`);
    });

    unifi.on('device.detected', (device) => {
      console.log(`📱 Device Detected: ${device.name || device.model} (${device.mac})`);
      console.log(`   Type: ${device.type}`);
      console.log(`   IP: ${device.ip || 'N/A'}`);
      console.log(`   Time: ${new Date().toLocaleString()}\n`);
    });

    unifi.on('device.lost', (device) => {
      console.log(`📱 Device Lost: ${device.name || device.model} (${device.mac})`);
      console.log(`   Time: ${new Date().toLocaleString()}\n`);
    });

    // Handle all other events
    unifi.on('event', (event) => {
      console.log(`🔔 Event: ${event.type}`);
      console.log(`   Data:`, JSON.stringify(event.data, null, 2));
      console.log(`   Time: ${new Date().toLocaleString()}\n`);
    });

    // Handle raw events for debugging
    unifi.on('raw_event', (event) => {
      // Uncomment this line to see all raw event data
      // console.log('🔍 Raw Event:', JSON.stringify(event, null, 2));
    });

    // Handle WebSocket connection events
    unifi.on('events.connected', () => {
      console.log('🔗 WebSocket connected - listening for events...\n');
    });

    unifi.on('events.disconnected', () => {
      console.log('🔌 WebSocket disconnected\n');
    });

    unifi.on('error', (error) => {
      console.error('❌ Error:', error.message);
    });

    // Enable real-time events
    console.log('🔄 Connecting to event stream...');
    await unifi.enableEvents();

    // Keep the script running and show current stats periodically
    const statsInterval = setInterval(async () => {
      try {
        const clients = await unifi.getClients();
        const devices = await unifi.getDevices();
        const onlineDevices = devices.filter(d => d.state === 1);
        
        process.stdout.write(`\r📊 Status: ${clients.length} clients, ${onlineDevices.length}/${devices.length} devices online | ${new Date().toLocaleTimeString()}`);
      } catch (error) {
        // Ignore stats errors during event monitoring
      }
    }, 10000);

    // Demonstrate manual event checking as fallback
    console.log('💡 Tip: If WebSocket events are not working, the script will fall back to polling...\n');
    
    let lastClientCount = 0;
    const pollInterval = setInterval(async () => {
      try {
        const clients = await unifi.getClients();
        if (clients.length !== lastClientCount) {
          if (clients.length > lastClientCount) {
            console.log(`\n📈 Client count increased: ${lastClientCount} → ${clients.length}`);
          } else {
            console.log(`\n📉 Client count decreased: ${lastClientCount} → ${clients.length}`);
          }
          lastClientCount = clients.length;
        }
      } catch (error) {
        // Ignore polling errors
      }
    }, 15000);

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n\n🛑 Shutting down...');
      clearInterval(statsInterval);
      clearInterval(pollInterval);
      
      try {
        await unifi.disableEvents();
        await unifi.logout();
        console.log('✅ Disconnected successfully!');
      } catch (error) {
        console.error('Error during shutdown:', error.message);
      }
      
      process.exit(0);
    });

    // Show initial network state
    const initialClients = await unifi.getClients();
    const initialDevices = await unifi.getDevices();
    lastClientCount = initialClients.length;

    console.log('📊 Initial Network State:');
    console.log(`   Clients: ${initialClients.length}`);
    console.log(`   Devices: ${initialDevices.length}`);
    console.log(`   Online Devices: ${initialDevices.filter(d => d.state === 1).length}`);
    console.log('\n🎯 Monitoring events...\n');

    // Keep the process alive
    return new Promise(() => {
      // This promise never resolves, keeping the script running
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('WebSocket')) {
      console.log('\n💡 WebSocket connection failed. This might be due to:');
      console.log('   - UniFi Controller version not supporting WebSockets');
      console.log('   - Network connectivity issues');
      console.log('   - Controller configuration');
      console.log('\n   The script can still work with polling-based monitoring.');
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

// Alternative demo function that uses polling instead of WebSocket
async function pollingDemo() {
  const unifi = new UniFiAPI(config);
  
  try {
    console.log('🔐 Connecting to UniFi Controller...');
    await unifi.login();
    
    console.log('\n📊 Polling-based Monitoring Demo');
    console.log('='.repeat(50));
    console.log('This demo polls the controller every 5 seconds for changes.');
    console.log('Press Ctrl+C to stop...\n');
    
    let previousClients = [];
    let previousDevices = [];
    
    const pollInterval = setInterval(async () => {
      try {
        const currentClients = await unifi.getClients();
        const currentDevices = await unifi.getDevices();
        
        // Check for client changes
        const currentClientMacs = new Set(currentClients.map(c => c.mac));
        const previousClientMacs = new Set(previousClients.map(c => c.mac));
        
        // New clients
        const newClients = currentClients.filter(c => !previousClientMacs.has(c.mac));
        newClients.forEach(client => {
          console.log(`✅ Client Connected: ${client.hostname || client.name || client.mac} (${client.ip})`);
        });
        
        // Disconnected clients
        const disconnectedClients = previousClients.filter(c => !currentClientMacs.has(c.mac));
        disconnectedClients.forEach(client => {
          console.log(`❌ Client Disconnected: ${client.hostname || client.name || client.mac}`);
        });
        
        // Check for device state changes
        const deviceStateChanges = currentDevices.filter(current => {
          const previous = previousDevices.find(p => p.mac === current.mac);
          return previous && previous.state !== current.state;
        });
        
        deviceStateChanges.forEach(device => {
          const previous = previousDevices.find(p => p.mac === device.mac);
          console.log(`📱 Device State Changed: ${device.name || device.model} - ${getStateText(previous.state)} → ${getStateText(device.state)}`);
        });
        
        previousClients = currentClients;
        previousDevices = currentDevices;
        
        // Show status
        process.stdout.write(`\r📊 ${currentClients.length} clients, ${currentDevices.filter(d => d.state === 1).length}/${currentDevices.length} devices online | ${new Date().toLocaleTimeString()}`);
        
      } catch (error) {
        console.error('\n❌ Polling error:', error.message);
      }
    }, 5000);
    
    // Get initial state
    previousClients = await unifi.getClients();
    previousDevices = await unifi.getDevices();
    
    console.log(`📊 Initial state: ${previousClients.length} clients, ${previousDevices.length} devices\n`);
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n\n🛑 Shutting down...');
      clearInterval(pollInterval);
      
      try {
        await unifi.logout();
        console.log('✅ Disconnected successfully!');
      } catch (error) {
        console.error('Error during shutdown:', error.message);
      }
      
      process.exit(0);
    });
    
    // Keep the process alive
    return new Promise(() => {});
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

function getStateText(state) {
  const states = {
    0: 'Offline',
    1: 'Online',
    2: 'Pending Adoption',
    3: 'Upgrading',
    4: 'Provisioning',
    5: 'Unreachable'
  };
  return states[state] || `Unknown(${state})`;
}

// Run the example
if (require.main === module) {
  const useWebSocket = process.argv.includes('--websocket');
  const usePolling = process.argv.includes('--polling');
  
  if (usePolling) {
    console.log('Using polling-based monitoring...\n');
    pollingDemo().catch(console.error);
  } else {
    console.log('Using WebSocket-based monitoring (fallback to polling if needed)...\n');
    realTimeEvents().catch((error) => {
      console.error('WebSocket monitoring failed:', error.message);
      console.log('\n🔄 Falling back to polling-based monitoring...\n');
      pollingDemo().catch(console.error);
    });
  }
}

module.exports = { realTimeEvents, pollingDemo };
