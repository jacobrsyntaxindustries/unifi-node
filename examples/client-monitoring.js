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

async function clientMonitoring() {
  const unifi = new UniFiAPI(config);

  try {
    console.log('🔐 Connecting to UniFi Controller...');
    await unifi.login();

    console.log('\n👥 Client Monitoring Demo');
    console.log('='.repeat(50));

    // Get all connected clients
    const clients = await unifi.getClients();
    console.log(`Total connected clients: ${clients.length}`);

    // Categorize clients
    const wiredClients = clients.filter(c => c.is_wired === true);
    const wirelessClients = clients.filter(c => c.is_wired === false);
    const guestClients = clients.filter(c => c.is_guest === true);

    console.log(`📡 Wireless clients: ${wirelessClients.length}`);
    console.log(`🔌 Wired clients: ${wiredClients.length}`);
    console.log(`🏨 Guest clients: ${guestClients.length}`);

    // Show detailed client information
    if (clients.length > 0) {
      console.log('\n📋 Client Details:');
      
      for (const client of clients.slice(0, 10)) { // Show first 10 clients
        console.log(`\n🔹 ${client.hostname || client.name || 'Unknown Device'}`);
        console.log(`   MAC: ${client.mac}`);
        console.log(`   IP: ${client.ip}`);
        console.log(`   Connection: ${client.is_wired ? 'Wired' : 'Wireless'}`);
        
        if (!client.is_wired) {
          console.log(`   Signal: ${client.rssi}dBm (${getSignalQuality(client.rssi)})`);
          console.log(`   Channel: ${client.channel || 'N/A'}`);
          console.log(`   Radio: ${client.radio || 'N/A'}`);
        }
        
        console.log(`   OS: ${client.os_name || 'Unknown'}`);
        console.log(`   Device: ${client.oui || 'Unknown'}`);
        console.log(`   First Seen: ${new Date(client.first_seen * 1000).toLocaleString()}`);
        console.log(`   Last Seen: ${new Date(client.last_seen * 1000).toLocaleString()}`);
        console.log(`   Uptime: ${formatUptime(client.uptime)}`);
        console.log(`   Data Usage: ⬇️ ${formatBytes(client.rx_bytes)} / ⬆️ ${formatBytes(client.tx_bytes)}`);
        console.log(`   Packets: ⬇️ ${client.rx_packets} / ⬆️ ${client.tx_packets}`);
        
        if (client.satisfaction) {
          console.log(`   Satisfaction: ${client.satisfaction}%`);
        }
        
        if (client.is_guest) {
          console.log(`   🏨 Guest Client - Authorized: ${client.authorized ? 'Yes' : 'No'}`);
        }
        
        if (client.blocked) {
          console.log(`   🚫 Status: BLOCKED`);
        }
      }

      if (clients.length > 10) {
        console.log(`\n... and ${clients.length - 10} more clients`);
      }
    }

    // Show network usage statistics
    console.log('\n📊 Network Usage Statistics');
    console.log('='.repeat(50));
    
    const totalRxBytes = clients.reduce((sum, client) => sum + (client.rx_bytes || 0), 0);
    const totalTxBytes = clients.reduce((sum, client) => sum + (client.tx_bytes || 0), 0);
    const totalBytes = totalRxBytes + totalTxBytes;
    
    console.log(`Total Download: ${formatBytes(totalRxBytes)}`);
    console.log(`Total Upload: ${formatBytes(totalTxBytes)}`);
    console.log(`Total Transfer: ${formatBytes(totalBytes)}`);

    // Show top data users
    const topUsers = clients
      .sort((a, b) => ((b.rx_bytes || 0) + (b.tx_bytes || 0)) - ((a.rx_bytes || 0) + (a.tx_bytes || 0)))
      .slice(0, 5);

    console.log('\n🏆 Top Data Users:');
    topUsers.forEach((client, index) => {
      const totalUsage = (client.rx_bytes || 0) + (client.tx_bytes || 0);
      console.log(`${index + 1}. ${client.hostname || client.name || client.mac} - ${formatBytes(totalUsage)}`);
    });

    // Show signal quality distribution for wireless clients
    if (wirelessClients.length > 0) {
      console.log('\n📶 Wireless Signal Quality Distribution:');
      
      const excellent = wirelessClients.filter(c => c.rssi >= -50).length;
      const good = wirelessClients.filter(c => c.rssi >= -60 && c.rssi < -50).length;
      const fair = wirelessClients.filter(c => c.rssi >= -70 && c.rssi < -60).length;
      const poor = wirelessClients.filter(c => c.rssi < -70).length;
      
      console.log(`🟢 Excellent (-50dBm or better): ${excellent}`);
      console.log(`🟡 Good (-60 to -50dBm): ${good}`);
      console.log(`🟠 Fair (-70 to -60dBm): ${fair}`);
      console.log(`🔴 Poor (below -70dBm): ${poor}`);
    }

    // Demo client management operations (commented for safety)
    console.log('\n🔧 Client Management Demo');
    console.log('='.repeat(50));
    
    if (clients.length > 0) {
      const firstClient = clients[0];
      console.log(`Selected client for demo: ${firstClient.hostname || firstClient.name || firstClient.mac}`);
      
      // Get detailed client statistics
      try {
        const clientStats = await unifi.getClientStats(firstClient.mac);
        if (clientStats) {
          console.log('\n📈 Detailed Client Statistics:');
          console.log(`   Connection Time: ${formatUptime(clientStats.uptime)}`);
          console.log(`   Average Signal: ${clientStats.rssi}dBm`);
          console.log(`   Data Rate: ${clientStats.tx_rate || 'N/A'} Mbps`);
        }
      } catch (err) {
        console.log(`   Unable to get detailed stats: ${err.message}`);
      }
      
      // UNCOMMENT THESE LINES TO ACTUALLY PERFORM CLIENT OPERATIONS
      // WARNING: These operations will affect client connectivity!
      
      /*
      console.log('\n⚠️  WARNING: Uncommenting the following operations will affect client connectivity!');
      
      // Block client
      console.log('🚫 Blocking client...');
      await unifi.blockClient(firstClient.mac);
      console.log('✅ Client blocked');
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Unblock client
      console.log('✅ Unblocking client...');
      await unifi.unblockClient(firstClient.mac);
      console.log('✅ Client unblocked');
      
      // Reconnect client (kick)
      console.log('🔄 Forcing client reconnection...');
      await unifi.reconnectClient(firstClient.mac);
      console.log('✅ Reconnection forced');
      */
      
      console.log('ℹ️  Client management operations are commented out for safety.');
      console.log('   Uncomment the relevant sections to perform actual client management.');
    }

    // Monitor client connections for a short period
    console.log('\n🔄 Starting 30-second client monitoring...');
    console.log('   (This will show client connect/disconnect events)');
    
    let monitoringClients = await unifi.getClients();
    console.log(`   Initial client count: ${monitoringClients.length}`);
    
    // Check for changes every 5 seconds
    for (let i = 0; i < 6; i++) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const currentClients = await unifi.getClients();
      const currentMacs = new Set(currentClients.map(c => c.mac));
      const previousMacs = new Set(monitoringClients.map(c => c.mac));
      
      // Find newly connected clients
      const newClients = currentClients.filter(c => !previousMacs.has(c.mac));
      // Find disconnected clients
      const disconnectedClients = monitoringClients.filter(c => !currentMacs.has(c.mac));
      
      if (newClients.length > 0) {
        newClients.forEach(client => {
          console.log(`   ✅ Client connected: ${client.hostname || client.name || client.mac}`);
        });
      }
      
      if (disconnectedClients.length > 0) {
        disconnectedClients.forEach(client => {
          console.log(`   ❌ Client disconnected: ${client.hostname || client.name || client.mac}`);
        });
      }
      
      if (newClients.length === 0 && disconnectedClients.length === 0) {
        console.log(`   ⏱️  No changes (${currentClients.length} clients)`);
      }
      
      monitoringClients = currentClients;
    }

    await unifi.logout();
    console.log('\n✅ Client monitoring demo completed!');

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

function getSignalQuality(rssi) {
  if (rssi >= -50) return 'Excellent';
  if (rssi >= -60) return 'Good';
  if (rssi >= -70) return 'Fair';
  return 'Poor';
}

// Run the example
if (require.main === module) {
  clientMonitoring().catch(console.error);
}

module.exports = clientMonitoring;
