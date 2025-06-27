import { UniFiAPI, UniFiConfig, UniFiClient, UniFiDevice } from '../src/index';

// Configuration - Update these values for your environment
const config: UniFiConfig = {
  host: '192.168.1.1',
  port: 8443,
  username: 'admin',
  password: 'your-password',
  site: 'default',
  strictSSL: false
};

async function realTimeEvents(): Promise<void> {
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
    unifi.on('client.connected', (client: UniFiClient) => {
      console.log(`✅ Client Connected: ${client.hostname || client.name || client.mac}`);
      console.log(`   IP: ${client.ip || 'N/A'}`);
      console.log(`   Connection: ${client.is_wired ? 'Wired' : 'Wireless'}`);
      if (!client.is_wired && client.rssi) {
        console.log(`   Signal: ${client.rssi}dBm`);
      }
      console.log(`   Time: ${new Date().toLocaleString()}\n`);
    });

    unifi.on('client.disconnected', (client: UniFiClient) => {
      console.log(`❌ Client Disconnected: ${client.hostname || client.name || client.mac}`);
      console.log(`   Duration: ${formatUptime(client.uptime || 0)}`);
      console.log(`   Data Used: ⬇️ ${formatBytes(client.rx_bytes)} / ⬆️ ${formatBytes(client.tx_bytes)}`);
      console.log(`   Time: ${new Date().toLocaleString()}\n`);
    });

    unifi.on('device.detected', (device: UniFiDevice) => {
      console.log(`📱 Device Detected: ${device.name || device.model} (${device.mac})`);
      console.log(`   Type: ${device.type}`);
      console.log(`   IP: ${device.ip || 'N/A'}`);
      console.log(`   Time: ${new Date().toLocaleString()}\n`);
    });

    unifi.on('device.updated', (device: UniFiDevice) => {
      console.log(`🔄 Device Updated: ${device.name || device.model} (${device.mac})`);
      console.log(`   State: ${device.state === 1 ? 'Online' : 'Offline'}`);
      console.log(`   Time: ${new Date().toLocaleString()}\n`);
    });

    unifi.on('alert', (alert: any) => {
      console.log(`🚨 Alert: ${alert.msg || 'Unknown alert'}`);
      console.log(`   Severity: ${alert.key || 'N/A'}`);
      console.log(`   Time: ${new Date().toLocaleString()}\n`);
    });

    unifi.on('event', (event: any) => {
      console.log(`📝 Event: ${event.msg || 'System event'}`);
      console.log(`   Type: ${event.key || 'N/A'}`);
      if (event.user) {
        console.log(`   User: ${event.user}`);
      }
      console.log(`   Time: ${new Date().toLocaleString()}\n`);
    });

    // Error handling
    unifi.on('error', (error: Error) => {
      console.error(`❌ WebSocket Error: ${error.message}`);
    });

    unifi.on('close', () => {
      console.log('🔌 WebSocket connection closed');
    });

    unifi.on('reconnect', () => {
      console.log('🔄 Reconnecting to WebSocket...');
    });

    // Start listening for events
    await unifi.enableEvents();
    console.log('🎧 Event listener started successfully!');
    console.log('   Listening for client connections/disconnections...');
    console.log('   Listening for device status changes...');
    console.log('   Listening for system alerts and events...\n');

    // Set up periodic status updates
    const statusInterval = setInterval(async () => {
      try {
        const clients = await unifi.getClients();
        const devices = await unifi.getDevices();
        
        console.log(`📊 Status Update: ${clients.length} clients, ${devices.length} devices online`);
        
        // Show connection statistics
        const wiredClients = clients.filter(c => c.is_wired);
        const wirelessClients = clients.filter(c => !c.is_wired);
        
        console.log(`   Wired: ${wiredClients.length}, Wireless: ${wirelessClients.length}`);
        
        // Show device health
        const onlineDevices = devices.filter(d => d.state === 1);
        const offlineDevices = devices.filter(d => d.state !== 1);
        
        if (offlineDevices.length > 0) {
          console.log(`   ⚠️  ${offlineDevices.length} device(s) offline`);
        }
        
        console.log(`   Time: ${new Date().toLocaleString()}\n`);
        
      } catch (error) {
        console.error('Status update error:', error instanceof Error ? error.message : error);
      }
    }, 30000); // Every 30 seconds

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down gracefully...');
      clearInterval(statusInterval);
      
      try {
        await unifi.disableEvents();
        await unifi.logout();
        console.log('✅ Cleanup complete');
      } catch (error) {
        console.error('Cleanup error:', error instanceof Error ? error.message : error);
      }
      
      process.exit(0);
    });

    // Keep the process running
    console.log('🏃 Event listener is running...');
    console.log('   Use Ctrl+C to stop');
    
    // Demonstrate some real-time monitoring features
    setTimeout(async () => {
      try {
        console.log('\n📈 Performing network scan...');
        const clients = await unifi.getClients();
        
        // Analyze signal strength for wireless clients
        const wirelessClients = clients.filter(c => !c.is_wired);
        if (wirelessClients.length > 0) {
          console.log(`📶 Wireless signal analysis:`);
          
          const signalGroups = {
            excellent: wirelessClients.filter(c => (c.rssi || 0) >= -50),
            good: wirelessClients.filter(c => (c.rssi || 0) >= -60 && (c.rssi || 0) < -50),
            fair: wirelessClients.filter(c => (c.rssi || 0) >= -70 && (c.rssi || 0) < -60),
            poor: wirelessClients.filter(c => (c.rssi || 0) < -70)
          };
          
          console.log(`   Excellent: ${signalGroups.excellent.length}`);
          console.log(`   Good: ${signalGroups.good.length}`);
          console.log(`   Fair: ${signalGroups.fair.length}`);
          console.log(`   Poor: ${signalGroups.poor.length}`);
          
          if (signalGroups.poor.length > 0) {
            console.log(`   ⚠️  ${signalGroups.poor.length} client(s) with poor signal`);
          }
        }
        
        // Show top bandwidth users
        const topUsers = clients
          .sort((a, b) => (b.rx_bytes + b.tx_bytes) - (a.rx_bytes + a.tx_bytes))
          .slice(0, 3);
        
        if (topUsers.length > 0) {
          console.log(`🔥 Top bandwidth users:`);
          topUsers.forEach((client, index) => {
            const deviceName = client.hostname || client.name || `Device-${client.mac.slice(-6)}`;
            const totalBytes = client.rx_bytes + client.tx_bytes;
            console.log(`   ${index + 1}. ${deviceName}: ${formatBytes(totalBytes)}`);
          });
        }
        
        console.log('');
        
      } catch (error) {
        console.error('Network scan error:', error instanceof Error ? error.message : error);
      }
    }, 5000); // After 5 seconds

    // Demonstrate event simulation (for testing purposes)
    setTimeout(() => {
      console.log('💡 Tip: Try connecting or disconnecting devices to see real-time events!');
      console.log('💡 Tip: Check your UniFi Controller for system alerts and notifications.\n');
    }, 10000); // After 10 seconds

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

// Run the demo
if (require.main === module) {
  realTimeEvents().catch(console.error);
}
