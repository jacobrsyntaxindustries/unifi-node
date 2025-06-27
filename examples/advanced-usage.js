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

/**
 * Advanced UniFi Network Management Example
 * This example demonstrates advanced features like:
 * - Network configuration management
 * - Multi-site operations
 * - Alert management
 * - Comprehensive monitoring
 */
async function advancedNetworkManagement() {
  const unifi = new UniFiAPI(config);

  try {
    console.log('🔐 Connecting to UniFi Controller...');
    await unifi.login();

    console.log('\n🏢 Multi-Site Management');
    console.log('='.repeat(50));
    
    // Get all sites
    const sites = await unifi.getSites();
    console.log(`Available sites: ${sites.length}`);
    
    for (const site of sites) {
      console.log(`\n📍 Site: ${site.name} (${site.desc})`);
      console.log(`   Role: ${site.role}`);
      console.log(`   Attr: ${JSON.stringify(site.attr_hidden_id || 'default')}`);
      
      // You could create a new UniFi instance for each site:
      // const siteUnifi = new UniFiAPI({...config, site: site.name});
    }

    console.log('\n🌐 Network Configuration Management');
    console.log('='.repeat(50));
    
    // Get network configurations
    const networks = await unifi.getNetworks();
    console.log(`Total networks: ${networks.length}\n`);
    
    for (const network of networks) {
      console.log(`🔹 Network: ${network.name}`);
      console.log(`   Purpose: ${network.purpose}`);
      console.log(`   VLAN: ${network.vlan || 'None'}`);
      console.log(`   Subnet: ${network.ip_subnet || 'N/A'}`);
      console.log(`   DHCP: ${network.dhcpd_enabled ? 'Enabled' : 'Disabled'}`);
      
      if (network.dhcpd_enabled) {
        console.log(`   DHCP Range: ${network.dhcpd_start} - ${network.dhcpd_stop}`);
        console.log(`   Gateway: ${network.dhcpd_gateway || network.ip_subnet?.split('/')[0]}`);
        console.log(`   DNS: ${network.dhcpd_dns?.join(', ') || 'Auto'}`);
      }
      
      if (network.networkgroup) {
        console.log(`   Group: ${network.networkgroup}`);
      }
      
      console.log('');
    }

    // Example: Create a guest network (commented for safety)
    /*
    console.log('🏨 Creating Guest Network...');
    const guestNetworkConfig = {
      name: 'Guest Network',
      purpose: 'guest',
      vlan: 100,
      ip_subnet: '192.168.100.1/24',
      dhcpd_enabled: true,
      dhcpd_start: '192.168.100.10',
      dhcpd_stop: '192.168.100.200',
      dhcpd_gateway: '192.168.100.1',
      dhcpd_dns: ['8.8.8.8', '8.8.4.4'],
      networkgroup: 'LAN'
    };
    
    const newNetwork = await unifi.createNetwork(guestNetworkConfig);
    console.log(`✅ Created network: ${newNetwork.name} with ID: ${newNetwork._id}`);
    */

    console.log('\n🚨 Alert Management');
    console.log('='.repeat(50));
    
    // Get active alerts
    const alerts = await unifi.getAlerts();
    
    if (alerts.length === 0) {
      console.log('✅ No active alerts');
    } else {
      console.log(`Found ${alerts.length} active alerts:\n`);
      
      for (const alert of alerts) {
        const severity = getSeverityIcon(alert.key);
        const timeAgo = getTimeAgo(alert.time * 1000);
        
        console.log(`${severity} ${alert.msg}`);
        console.log(`   Key: ${alert.key}`);
        console.log(`   Time: ${timeAgo}`);
        console.log(`   Site: ${alert.site_name || 'default'}`);
        
        if (alert.subsystem) {
          console.log(`   Subsystem: ${alert.subsystem}`);
        }
        
        console.log('');
      }
      
      // Example: Archive old alerts (commented for safety)
      /*
      const oldAlerts = alerts.filter(alert => {
        const alertAge = Date.now() - (alert.time * 1000);
        return alertAge > 24 * 60 * 60 * 1000; // Older than 24 hours
      });
      
      console.log(`📦 Archiving ${oldAlerts.length} old alerts...`);
      for (const alert of oldAlerts) {
        await unifi.archiveAlert(alert._id);
        console.log(`   Archived: ${alert.msg}`);
      }
      */
    }

    console.log('\n📊 Comprehensive Network Statistics');
    console.log('='.repeat(50));
    
    // Get comprehensive statistics
    const [devices, clients, systemStats] = await Promise.all([
      unifi.getDevices(),
      unifi.getClients(),
      unifi.getSystemStats()
    ]);

    // Device statistics
    const deviceStats = analyzeDevices(devices);
    console.log('📱 Device Statistics:');
    Object.entries(deviceStats).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });

    // Client statistics  
    const clientStats = analyzeClients(clients);
    console.log('\n👥 Client Statistics:');
    Object.entries(clientStats).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });

    // Network usage
    const usage = calculateNetworkUsage(clients);
    console.log('\n📈 Network Usage:');
    console.log(`   Total Download: ${formatBytes(usage.totalRx)}`);
    console.log(`   Total Upload: ${formatBytes(usage.totalTx)}`);
    console.log(`   Average per Client: ${formatBytes(usage.avgPerClient)}`);
    console.log(`   Top User: ${usage.topUser.name} (${formatBytes(usage.topUser.total)})`);

    // System health
    if (systemStats && systemStats.length > 0) {
      const system = systemStats[0];
      console.log('\n🏥 System Health:');
      console.log(`   Uptime: ${formatUptime(system.uptime)}`);
      console.log(`   CPU Load: ${system.loadavg_1 || 'N/A'}`);
      console.log(`   Memory: ${Math.round((system.mem_used || 0) / 1024 / 1024)}MB used`);
      console.log(`   Temperature: ${system.general_temperature || 'N/A'}°C`);
    }

    // Network topology overview
    console.log('\n🕸️ Network Topology:');
    console.log('='.repeat(50));
    
    const topology = buildNetworkTopology(devices, clients);
    displayTopology(topology);

    console.log('\n📋 Configuration Backup Recommendation');
    console.log('='.repeat(50));
    console.log('ℹ️  Consider implementing regular configuration backups:');
    console.log('   1. Export site settings regularly');
    console.log('   2. Document network configurations');
    console.log('   3. Monitor for unauthorized changes');
    console.log('   4. Set up automated health checks');

    await unifi.logout();
    console.log('\n✅ Advanced network management demo completed!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Helper functions
function getSeverityIcon(key) {
  if (key.includes('disconnect') || key.includes('offline')) return '🔴';
  if (key.includes('connect') || key.includes('online')) return '🟢';
  if (key.includes('upgrade') || key.includes('update')) return '🟡';
  if (key.includes('security') || key.includes('intrusion')) return '🚨';
  return '🔵';
}

function getTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
}

function analyzeDevices(devices) {
  const stats = {
    'Total Devices': devices.length,
    'Online': devices.filter(d => d.state === 1).length,
    'Offline': devices.filter(d => d.state === 0).length,
    'Access Points': devices.filter(d => d.type === 'uap').length,
    'Switches': devices.filter(d => d.type === 'usw').length,
    'Gateways': devices.filter(d => d.type === 'ugw').length,
    'Adopted': devices.filter(d => d.adopted).length,
    'Pending Adoption': devices.filter(d => !d.adopted).length
  };
  
  // Calculate average uptime
  const uptimes = devices.filter(d => d.uptime).map(d => d.uptime);
  if (uptimes.length > 0) {
    const avgUptime = uptimes.reduce((a, b) => a + b, 0) / uptimes.length;
    stats['Average Uptime'] = formatUptime(avgUptime);
  }
  
  return stats;
}

function analyzeClients(clients) {
  const stats = {
    'Total Clients': clients.length,
    'Wireless': clients.filter(c => !c.is_wired).length,
    'Wired': clients.filter(c => c.is_wired).length,
    'Guests': clients.filter(c => c.is_guest).length,
    'Blocked': clients.filter(c => c.blocked).length
  };
  
  // Signal quality distribution for wireless clients
  const wireless = clients.filter(c => !c.is_wired && c.rssi);
  if (wireless.length > 0) {
    stats['Excellent Signal (>-50dBm)'] = wireless.filter(c => c.rssi >= -50).length;
    stats['Good Signal (-60 to -50dBm)'] = wireless.filter(c => c.rssi >= -60 && c.rssi < -50).length;
    stats['Fair Signal (-70 to -60dBm)'] = wireless.filter(c => c.rssi >= -70 && c.rssi < -60).length;
    stats['Poor Signal (<-70dBm)'] = wireless.filter(c => c.rssi < -70).length;
  }
  
  return stats;
}

function calculateNetworkUsage(clients) {
  const totalRx = clients.reduce((sum, c) => sum + (c.rx_bytes || 0), 0);
  const totalTx = clients.reduce((sum, c) => sum + (c.tx_bytes || 0), 0);
  const avgPerClient = clients.length > 0 ? (totalRx + totalTx) / clients.length : 0;
  
  // Find top user
  const topUser = clients.reduce((top, client) => {
    const clientTotal = (client.rx_bytes || 0) + (client.tx_bytes || 0);
    const topTotal = (top.rx_bytes || 0) + (top.tx_bytes || 0);
    return clientTotal > topTotal ? { ...client, total: clientTotal } : top;
  }, { name: 'None', total: 0 });
  
  return {
    totalRx,
    totalTx,
    avgPerClient,
    topUser: {
      name: topUser.hostname || topUser.name || topUser.mac || 'Unknown',
      total: topUser.total
    }
  };
}

function buildNetworkTopology(devices, clients) {
  const topology = {
    gateways: devices.filter(d => d.type === 'ugw'),
    switches: devices.filter(d => d.type === 'usw'),
    accessPoints: devices.filter(d => d.type === 'uap'),
    clients: clients
  };
  
  return topology;
}

function displayTopology(topology) {
  console.log('🌐 Gateway(s):');
  topology.gateways.forEach(gw => {
    console.log(`   └─ ${gw.name || gw.model} (${gw.mac}) - ${gw.ip}`);
  });
  
  console.log('\n📶 Switch(es):');
  topology.switches.forEach(sw => {
    console.log(`   └─ ${sw.name || sw.model} (${sw.mac}) - ${sw.ip}`);
    if (sw.port_table) {
      const activePorts = sw.port_table.filter(p => p.up).length;
      console.log(`      Active Ports: ${activePorts}/${sw.port_table.length}`);
    }
  });
  
  console.log('\n📡 Access Point(s):');
  topology.accessPoints.forEach(ap => {
    console.log(`   └─ ${ap.name || ap.model} (${ap.mac}) - ${ap.ip}`);
    if (ap.radio_table) {
      ap.radio_table.forEach(radio => {
        const clientCount = topology.clients.filter(c => c.ap_mac === ap.mac && c.radio === radio.name).length;
        console.log(`      ${radio.name}: Channel ${radio.channel} - ${clientCount} clients`);
      });
    }
  });
}

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
  advancedNetworkManagement().catch(console.error);
}

module.exports = advancedNetworkManagement;
