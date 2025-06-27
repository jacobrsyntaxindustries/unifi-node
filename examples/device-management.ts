import { UniFiAPI, UniFiConfig } from '../src/index';

// Configuration - Update these values for your environment
const config: UniFiConfig = {
  host: '192.168.1.1',
  port: 8443,
  username: 'admin',
  password: 'your-password',
  site: 'default',
  strictSSL: false
};

async function deviceManagement(): Promise<void> {
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
      console.log(`   Uptime: ${formatUptime(device.uptime || 0)}`);
      
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
          console.log(`   Device Stats: Available`);
        }
      } catch (error) {
        console.log(`   Device Stats: Error fetching`);
      }

      // Device health check
      if (device.state === 1) {
        console.log(`   Status: ✅ Online`);
      } else {
        console.log(`   Status: ❌ Offline`);
      }
    }

    // Network topology
    console.log('\n🌐 Network Topology');
    console.log('='.repeat(50));
    
    const topology = buildNetworkTopology(devices);
    displayTopology(topology);

    // Device adoption status
    console.log('\n🔧 Device Management Operations');
    console.log('='.repeat(50));
    
    const unadoptedDevices = devices.filter(device => !device.adopted);
    console.log(`Unadopted devices: ${unadoptedDevices.length}`);
    
    if (unadoptedDevices.length > 0) {
      console.log('\nUnadopted devices:');
      unadoptedDevices.forEach(device => {
        console.log(`  - ${device.model} (${device.mac})`);
      });
    }

    // Device upgrade status
    console.log('\n📦 Firmware Status');
    console.log('='.repeat(50));
    
    const upgradeableDevices = devices.filter(device => device.upgradable && device.upgrade_to_firmware);
    
    if (upgradeableDevices.length > 0) {
      console.log(`Devices with available firmware updates: ${upgradeableDevices.length}`);
      upgradeableDevices.forEach(device => {
        console.log(`  - ${device.name || device.model} (${device.version} → ${device.upgrade_to_firmware})`);
      });
    } else {
      console.log('All devices are up to date! ✅');
    }

    // Port status for switches
    console.log('\n🔌 Switch Port Status');
    console.log('='.repeat(50));
    
    const switches = devices.filter(device => device.type === 'usw');
    
    for (const switchDevice of switches) {
      console.log(`\n🔸 Switch: ${switchDevice.name || switchDevice.model}`);
      
      if (switchDevice.port_table) {
        const activePorts = switchDevice.port_table.filter((port: any) => port.up);
        const inactivePorts = switchDevice.port_table.filter((port: any) => !port.up);
        
        console.log(`   Total Ports: ${switchDevice.port_table.length}`);
        console.log(`   Active: ${activePorts.length}, Inactive: ${inactivePorts.length}`);
        
        activePorts.forEach((port: any) => {
          const speed = port.speed ? `${port.speed}Mbps` : 'Unknown';
          const poe = port.poe_enable ? '⚡ PoE' : '';
          console.log(`     Port ${port.port_idx}: ${port.name || 'Unnamed'} (${speed}) ${poe}`);
        });
      }
    }

    // Wireless access point status
    console.log('\n📡 Access Point Status');
    console.log('='.repeat(50));
    
    const accessPoints = devices.filter(device => device.type === 'uap');
    
    for (const ap of accessPoints) {
      console.log(`\n🔸 AP: ${ap.name || ap.model}`);
      console.log(`   Connected Clients: ${ap.num_sta || 0}`);
      console.log(`   Satisfaction: ${ap.satisfaction ? `${ap.satisfaction}%` : 'N/A'}`);
      
      if (ap.radio_table) {
        ap.radio_table.forEach((radio: any, index: number) => {
          console.log(`   Radio ${index + 1}: ${radio.name}`);
          console.log(`     Channel: ${radio.channel}`);
          console.log(`     TX Power: ${radio.tx_power}dBm`);
          console.log(`     Utilization: ${radio.cu_total || 0}%`);
        });
      }
    }

    // Performance monitoring
    console.log('\n📊 Performance Summary');
    console.log('='.repeat(50));
    
    const totalDevices = devices.length;
    const onlineDevices = devices.filter(device => device.state === 1).length;
    const offlineDevices = totalDevices - onlineDevices;
    
    console.log(`Total Devices: ${totalDevices}`);
    console.log(`Online: ${onlineDevices} (${((onlineDevices / totalDevices) * 100).toFixed(1)}%)`);
    console.log(`Offline: ${offlineDevices} (${((offlineDevices / totalDevices) * 100).toFixed(1)}%)`);
    
    const totalClients = devices.reduce((sum, device) => sum + (device.num_sta || 0), 0);
    console.log(`Total Connected Clients: ${totalClients}`);
    
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

interface NetworkNode {
  device: any;
  children: NetworkNode[];
}

function buildNetworkTopology(devices: any[]): NetworkNode[] {
  // Simple topology builder - in reality you'd use uplink information
  const gateways = devices.filter(device => device.type === 'ugw');
  const switches = devices.filter(device => device.type === 'usw');
  const accessPoints = devices.filter(device => device.type === 'uap');
  
  const topology: NetworkNode[] = [];
  
  gateways.forEach(gateway => {
    const gatewayNode: NetworkNode = {
      device: gateway,
      children: []
    };
    
    // Add switches as children of gateways
    switches.forEach(switchDevice => {
      gatewayNode.children.push({
        device: switchDevice,
        children: []
      });
    });
    
    // Add access points as children of gateways
    accessPoints.forEach(ap => {
      gatewayNode.children.push({
        device: ap,
        children: []
      });
    });
    
    topology.push(gatewayNode);
  });
  
  return topology;
}

function displayTopology(topology: NetworkNode[], depth: number = 0): void {
  const indent = '  '.repeat(depth);
  
  topology.forEach(node => {
    const deviceIcon = getDeviceIcon(node.device.type);
    console.log(`${indent}${deviceIcon} ${node.device.name || node.device.model} (${node.device.mac})`);
    
    if (node.children.length > 0) {
      displayTopology(node.children, depth + 1);
    }
  });
}

function getDeviceIcon(deviceType: string): string {
  switch (deviceType) {
    case 'ugw': return '🌐';
    case 'usw': return '🔀';
    case 'uap': return '📡';
    default: return '📱';
  }
}

// Run the demo
if (require.main === module) {
  deviceManagement().catch(console.error);
}
