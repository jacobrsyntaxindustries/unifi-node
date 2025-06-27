import { UniFiAPI, UniFiConfig, UniFiSite, UniFiNetwork, UniFiClient, UniFiDevice } from '../src/index';

// Configuration - Update these values for your environment
const config: UniFiConfig = {
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
async function advancedNetworkManagement(): Promise<void> {
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
      console.log(`   Attr: ${JSON.stringify((site as any).attr_hidden_id || 'default')}`);
      
      // You could create a new UniFi instance for each site:
      // const siteUnifi = new UniFiAPI({...config, site: site.name});
    }

    console.log('\n🌐 Network Configuration Management');
    console.log('='.repeat(50));
    
    // Get network configurations
    const networks = await unifi.getNetworks();
    console.log(`Total networks: ${networks.length}\n`);
    
    for (const network of networks) {
      console.log(`🔸 Network: ${network.name}`);
      console.log(`   Purpose: ${network.purpose}`);
      console.log(`   VLAN: ${network.vlan || 'None'}`);
      console.log(`   Subnet: ${network.ip_subnet || 'N/A'}`);
      console.log(`   Gateway: ${network.dhcpd_gateway || 'N/A'}`);
      console.log(`   DHCP: ${network.dhcpd_enabled ? 'Enabled' : 'Disabled'}`);
      
      if (network.dhcpd_enabled) {
        console.log(`   DHCP Range: ${network.dhcpd_start} - ${network.dhcpd_stop}`);
        console.log(`   DNS: ${network.dhcpd_dns?.join(', ') || 'Default'}`);
      }
      
      console.log(`   Network Group: ${network.networkgroup || 'Default'}`);
      console.log('');
    }

    console.log('\n🔥 Firewall and Security Configuration');
    console.log('='.repeat(50));
    
    // Note: Firewall rules and port forwarding may require additional API endpoints
    // that are not implemented in this basic example
    console.log('Firewall and port forwarding configuration would be available');
    console.log('with additional API endpoints (not implemented in this example).');

    console.log('\n📊 Comprehensive Network Statistics');
    console.log('='.repeat(50));
    
    // Get detailed statistics
    const clients = await unifi.getClients();
    const devices = await unifi.getDevices();
    
    // Network health summary
    const totalDevices = devices.length;
    const onlineDevices = devices.filter(d => d.state === 1).length;
    const offlineDevices = totalDevices - onlineDevices;
    
    console.log(`Device Health:`);
    console.log(`   Total Devices: ${totalDevices}`);
    console.log(`   Online: ${onlineDevices} (${((onlineDevices / totalDevices) * 100).toFixed(1)}%)`);
    console.log(`   Offline: ${offlineDevices} (${((offlineDevices / totalDevices) * 100).toFixed(1)}%)`);
    
    // Client statistics
    const totalClients = clients.length;
    const wiredClients = clients.filter(c => c.is_wired).length;
    const wirelessClients = clients.filter(c => !c.is_wired).length;
    const guestClients = clients.filter(c => c.is_guest).length;
    
    console.log(`\nClient Statistics:`);
    console.log(`   Total Clients: ${totalClients}`);
    console.log(`   Wired: ${wiredClients} (${((wiredClients / totalClients) * 100).toFixed(1)}%)`);
    console.log(`   Wireless: ${wirelessClients} (${((wirelessClients / totalClients) * 100).toFixed(1)}%)`);
    console.log(`   Guest: ${guestClients} (${((guestClients / totalClients) * 100).toFixed(1)}%)`);
    
    // Bandwidth analysis
    const totalRxBytes = clients.reduce((sum, client) => sum + client.rx_bytes, 0);
    const totalTxBytes = clients.reduce((sum, client) => sum + client.tx_bytes, 0);
    
    console.log(`\nBandwidth Usage:`);
    console.log(`   Total Download: ${formatBytes(totalRxBytes)}`);
    console.log(`   Total Upload: ${formatBytes(totalTxBytes)}`);
    console.log(`   Total Transfer: ${formatBytes(totalRxBytes + totalTxBytes)}`);

    console.log('\n📡 Wireless Network Analysis');
    console.log('='.repeat(50));
    
    // Analyze wireless performance
    const accessPoints = devices.filter(device => device.type === 'uap');
    
    if (accessPoints.length > 0) {
      console.log(`Total Access Points: ${accessPoints.length}\n`);
      
      let totalWirelessClients = 0;
      
      for (const ap of accessPoints) {
        console.log(`🔸 AP: ${ap.name || ap.model}`);
        console.log(`   Status: ${ap.state === 1 ? '✅ Online' : '❌ Offline'}`);
        console.log(`   Connected Clients: ${ap.num_sta || 0}`);
        console.log(`   Satisfaction: ${ap.satisfaction ? `${ap.satisfaction}%` : 'N/A'}`);
        console.log(`   Uptime: ${formatUptime(ap.uptime || 0)}`);
        
        totalWirelessClients += ap.num_sta || 0;
        
        if (ap.radio_table) {
          console.log(`   Radios: ${ap.radio_table.length}`);
          ap.radio_table.forEach((radio, index) => {
            console.log(`     Radio ${index + 1}: ${radio.name}`);
            console.log(`       Channel: ${radio.channel}`);
            console.log(`       TX Power: ${(radio as any).tx_power || 'Auto'}dBm`);
            console.log(`       Utilization: ${(radio as any).cu_total || 0}%`);
          });
        }
        console.log('');
      }
      
      console.log(`Total Wireless Clients: ${totalWirelessClients}`);
      console.log(`Average Clients per AP: ${(totalWirelessClients / accessPoints.length).toFixed(1)}`);
    }

    console.log('\n🔄 Network Performance Monitoring');
    console.log('='.repeat(50));
    
    // Performance metrics
    const switches = devices.filter(device => device.type === 'usw');
    
    if (switches.length > 0) {
      console.log(`Total Switches: ${switches.length}\n`);
      
      for (const switchDevice of switches) {
        console.log(`🔸 Switch: ${switchDevice.name || switchDevice.model}`);
        console.log(`   Status: ${switchDevice.state === 1 ? '✅ Online' : '❌ Offline'}`);
        console.log(`   Uptime: ${formatUptime(switchDevice.uptime || 0)}`);
        
        if (switchDevice.system_stats) {
          console.log(`   CPU Usage: ${switchDevice.system_stats.cpu || 0}%`);
          console.log(`   Memory Usage: ${switchDevice.system_stats.mem || 0}%`);
        }
        
        if (switchDevice.general_temperature) {
          console.log(`   Temperature: ${switchDevice.general_temperature}°C`);
        }
        
        if (switchDevice.port_table) {
          const totalPorts = switchDevice.port_table.length;
          const activePorts = switchDevice.port_table.filter(port => port.up).length;
          const poePorts = switchDevice.port_table.filter(port => port.poe_enable).length;
          
          console.log(`   Ports: ${activePorts}/${totalPorts} active`);
          console.log(`   PoE Ports: ${poePorts}`);
          
          // Calculate total port usage
          const totalRx = switchDevice.port_table.reduce((sum, port) => sum + port.rx_bytes, 0);
          const totalTx = switchDevice.port_table.reduce((sum, port) => sum + port.tx_bytes, 0);
          
          console.log(`   Port Traffic: ⬇️ ${formatBytes(totalRx)} / ⬆️ ${formatBytes(totalTx)}`);
        }
        console.log('');
      }
    }

    console.log('\n🚨 Alert and Event Management');
    console.log('='.repeat(50));
    
    // Get recent alerts
    const alerts = await unifi.getAlerts();
    console.log(`Total alerts: ${alerts.length}`);
    
    if (alerts.length > 0) {
      const recentAlerts = alerts.slice(0, 10);
      console.log(`\nRecent alerts (last 10):`);
      
      recentAlerts.forEach((alert, index) => {
        const alertTime = new Date(alert.time * 1000);
        console.log(`${index + 1}. ${alert.msg || 'Unknown alert'}`);
        console.log(`   Severity: ${alert.key || 'N/A'}`);
        console.log(`   Time: ${alertTime.toLocaleString()}`);
        console.log('');
      });
    }

    console.log('\n🎛️ Advanced Configuration Examples');
    console.log('='.repeat(50));
    
    // Example: Create a guest network (commented out for safety)
    console.log('Example operations (not executed):');
    console.log('- Create guest network');
    console.log('- Configure firewall rules');
    console.log('- Set up port forwarding');
    console.log('- Configure VLANs');
    console.log('- Manage device settings');
    
    /*
    // Example: Create a guest network
    const guestNetwork = {
      name: 'Guest-Network',
      purpose: 'guest',
      vlan_enabled: true,
      vlan: 100,
      ip_subnet: '192.168.100.1/24',
      dhcp_enabled: true,
      dhcp_start: '192.168.100.100',
      dhcp_stop: '192.168.100.200',
      dhcp_lease_time: 86400,
      enabled: true
    };
    
    // await unifi.createNetwork(guestNetwork);
    */

    console.log('\n📈 Performance Summary');
    console.log('='.repeat(50));
    
    // Summary statistics
    const networkEfficiency = onlineDevices / totalDevices;
    const clientDistribution = wirelessClients / totalClients;
    const averageClientUptime = clients.reduce((sum, client) => sum + client.uptime, 0) / clients.length;
    
    console.log(`Network Efficiency: ${(networkEfficiency * 100).toFixed(1)}%`);
    console.log(`Wireless Distribution: ${(clientDistribution * 100).toFixed(1)}%`);
    console.log(`Average Client Session: ${formatUptime(averageClientUptime)}`);
    
    // Health score calculation
    let healthScore = 100;
    healthScore -= (offlineDevices / totalDevices) * 30; // Penalty for offline devices
    healthScore -= Math.max(0, (totalClients - 50) / 10); // Penalty for too many clients
    healthScore = Math.max(0, Math.min(100, healthScore));
    
    console.log(`\n🏆 Network Health Score: ${healthScore.toFixed(1)}/100`);
    
    if (healthScore >= 90) {
      console.log('✅ Excellent network health!');
    } else if (healthScore >= 70) {
      console.log('✅ Good network health');
    } else if (healthScore >= 50) {
      console.log('⚠️ Fair network health - consider optimization');
    } else {
      console.log('❌ Poor network health - immediate attention required');
    }

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  } finally {
    await unifi.logout();
    console.log('\n👋 Disconnected from UniFi Controller');
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
  advancedNetworkManagement().catch(console.error);
}
