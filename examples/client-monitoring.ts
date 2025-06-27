import { UniFiAPI, UniFiConfig, UniFiClient } from '../src/index';

// Configuration - Update these values for your environment
const config: UniFiConfig = {
  host: '192.168.1.1',
  port: 8443,
  username: 'admin',
  password: 'your-password',
  site: 'default',
  strictSSL: false
};

async function clientMonitoring(): Promise<void> {
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
          console.log(`   Signal: ${client.rssi}dBm (${getSignalQuality(client.rssi || 0)})`);
          console.log(`   Channel: ${(client as any).channel || 'N/A'}`);
          console.log(`   Radio: ${(client as any).radio || 'N/A'}`);
        }
        
        console.log(`   Uptime: ${formatUptime(client.uptime)}`);
        console.log(`   Data Usage: ↓${formatBytes(client.rx_bytes)} ↑${formatBytes(client.tx_bytes)}`);
        console.log(`   OUI: ${client.oui || 'Unknown'}`);
        console.log(`   Guest: ${client.is_guest ? 'Yes' : 'No'}`);
        
        // Connection duration
        const connectionTime = Date.now() - (client.last_seen * 1000);
        console.log(`   Last seen: ${formatDuration(connectionTime)} ago`);
      }
    }

    // Network usage analytics
    console.log('\n📊 Network Usage Analytics');
    console.log('='.repeat(50));
    
    const totalRxBytes = clients.reduce((sum, client) => sum + client.rx_bytes, 0);
    const totalTxBytes = clients.reduce((sum, client) => sum + client.tx_bytes, 0);
    const totalBytes = totalRxBytes + totalTxBytes;
    
    console.log(`Total Download: ${formatBytes(totalRxBytes)}`);
    console.log(`Total Upload: ${formatBytes(totalTxBytes)}`);
    console.log(`Total Bandwidth: ${formatBytes(totalBytes)}`);

    // Top data consumers
    const topConsumers = clients
      .sort((a, b) => (b.rx_bytes + b.tx_bytes) - (a.rx_bytes + a.tx_bytes))
      .slice(0, 5);

    if (topConsumers.length > 0) {
      console.log('\n🔥 Top Data Consumers:');
      topConsumers.forEach((client, index) => {
        const totalUsage = client.rx_bytes + client.tx_bytes;
        const deviceName = client.hostname || client.name || `Device-${client.mac.slice(-6)}`;
        console.log(`   ${index + 1}. ${deviceName}: ${formatBytes(totalUsage)}`);
      });
    }

    // Signal quality analysis for wireless clients
    if (wirelessClients.length > 0) {
      console.log('\n📶 Wireless Signal Quality Analysis');
      console.log('='.repeat(50));
      
      const signalGroups = {
        excellent: wirelessClients.filter(c => (c.rssi || 0) >= -50),
        good: wirelessClients.filter(c => (c.rssi || 0) >= -60 && (c.rssi || 0) < -50),
        fair: wirelessClients.filter(c => (c.rssi || 0) >= -70 && (c.rssi || 0) < -60),
        poor: wirelessClients.filter(c => (c.rssi || 0) < -70)
      };
      
      console.log(`📶 Excellent (≥-50dBm): ${signalGroups.excellent.length} clients`);
      console.log(`📶 Good (-50 to -60dBm): ${signalGroups.good.length} clients`);
      console.log(`📶 Fair (-60 to -70dBm): ${signalGroups.fair.length} clients`);
      console.log(`📶 Poor (<-70dBm): ${signalGroups.poor.length} clients`);
      
      // Show poor signal clients
      if (signalGroups.poor.length > 0) {
        console.log('\n⚠️  Clients with poor signal:');
        signalGroups.poor.forEach(client => {
          const deviceName = client.hostname || client.name || `Device-${client.mac.slice(-6)}`;
          console.log(`   - ${deviceName}: ${client.rssi}dBm`);
        });
      }
    }

    // Device type analysis
    console.log('\n📱 Device Type Analysis');
    console.log('='.repeat(50));
    
    const deviceTypes = new Map<string, number>();
    clients.forEach(client => {
      if (client.oui) {
        const vendor = getVendorFromOUI(client.oui);
        deviceTypes.set(vendor, (deviceTypes.get(vendor) || 0) + 1);
      }
    });
    
    const sortedDeviceTypes = Array.from(deviceTypes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    sortedDeviceTypes.forEach(([vendor, count]) => {
      console.log(`   ${vendor}: ${count} device${count > 1 ? 's' : ''}`);
    });

    // Connection stability monitoring
    console.log('\n🔄 Connection Stability');
    console.log('='.repeat(50));
    
    const newClients = clients.filter(c => c.uptime < 300); // Less than 5 minutes
    const stableClients = clients.filter(c => c.uptime >= 3600); // More than 1 hour
    
    console.log(`🆕 Recently connected (< 5 min): ${newClients.length}`);
    console.log(`🔒 Stable connections (> 1 hour): ${stableClients.length}`);
    
    if (newClients.length > 0) {
      console.log('\nRecently connected devices:');
      newClients.forEach(client => {
        const deviceName = client.hostname || client.name || `Device-${client.mac.slice(-6)}`;
        console.log(`   - ${deviceName} (${formatUptime(client.uptime)} ago)`);
      });
    }

    // Guest network usage
    if (guestClients.length > 0) {
      console.log('\n🏨 Guest Network Activity');
      console.log('='.repeat(50));
      
      const guestTotalUsage = guestClients.reduce((sum, client) => 
        sum + client.rx_bytes + client.tx_bytes, 0);
      
      console.log(`Guest clients: ${guestClients.length}`);
      console.log(`Guest data usage: ${formatBytes(guestTotalUsage)}`);
      
      // Show guest client details
      guestClients.forEach(client => {
        const deviceName = client.hostname || client.name || `Guest-${client.mac.slice(-6)}`;
        const totalUsage = client.rx_bytes + client.tx_bytes;
        console.log(`   - ${deviceName}: ${formatBytes(totalUsage)}`);
      });
    }

    // Historical client statistics
    console.log('\n📈 Client Statistics Summary');
    console.log('='.repeat(50));
    
    const avgUptime = clients.reduce((sum, client) => sum + client.uptime, 0) / clients.length;
    const avgDataUsage = clients.reduce((sum, client) => 
      sum + client.rx_bytes + client.tx_bytes, 0) / clients.length;
    
    console.log(`Average connection time: ${formatUptime(avgUptime)}`);
    console.log(`Average data usage per client: ${formatBytes(avgDataUsage)}`);
    
    const clientsOnline24h = clients.filter(c => c.uptime >= 86400).length;
    console.log(`Clients online > 24h: ${clientsOnline24h}`);
    
    // Bandwidth efficiency
    const packetsToBytes = clients.reduce((sum, client) => {
      const totalPackets = client.rx_packets + client.tx_packets;
      const totalBytes = client.rx_bytes + client.tx_bytes;
      return totalPackets > 0 ? sum + (totalBytes / totalPackets) : sum;
    }, 0) / clients.length;
    
    console.log(`Average packet size: ${packetsToBytes.toFixed(0)} bytes`);

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  } finally {
    await unifi.logout();
    console.log('\n👋 Disconnected from UniFi Controller');
  }
}

function getSignalQuality(rssi: number): string {
  if (rssi >= -50) return 'Excellent';
  if (rssi >= -60) return 'Good';
  if (rssi >= -70) return 'Fair';
  return 'Poor';
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

function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  return formatUptime(seconds);
}

function getVendorFromOUI(oui: string): string {
  // Simplified OUI to vendor mapping - in a real implementation, 
  // you'd use a comprehensive OUI database
  const ouiMap: Record<string, string> = {
    '00:50:56': 'VMware',
    '00:0C:29': 'VMware',
    '00:05:69': 'VMware',
    '00:1C:42': 'Parallels',
    '08:00:27': 'VirtualBox',
    '00:15:5D': 'Microsoft',
    '00:16:3E': 'Xen',
    '52:54:00': 'QEMU',
    '00:E0:4C': 'Realtek',
    '00:90:4C': 'Epigram',
    '00:A0:C9': 'Intel',
    '00:13:10': 'Linksys',
    '00:18:39': 'Cisco',
    '00:1F:5B': 'Apple',
    '3C:07:54': 'Apple',
    '40:6C:8F': 'Apple',
    '58:55:CA': 'Apple',
    '70:56:81': 'Apple',
    '7C:6D:62': 'Apple',
    '8C:85:90': 'Apple',
    'AC:87:A3': 'Apple',
    'BC:52:B7': 'Apple',
    'D0:81:7A': 'Apple',
    'DC:2B:61': 'Apple'
  };
  
  return ouiMap[oui.toUpperCase()] || 'Unknown Vendor';
}

// Run the demo
if (require.main === module) {
  clientMonitoring().catch(console.error);
}
