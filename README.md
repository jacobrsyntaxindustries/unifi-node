# UniFi Node

A comprehensive TypeScript/Node.js module for communicating and controlling Ubiquiti UniFi hardware through the UniFi Controller API. Built with full type safety and modern TypeScript features.

## Features

- 🔐 Secure authentication with UniFi Controller
- 📡 Device management (Access Points, Switches, Gateways)
- 👥 Client management and monitoring
- 📊 Real-time statistics and monitoring
- 🔧 Network configuration management
- 🌐 Multi-site support
- 📱 WebSocket support for real-time events
- 🛡️ SSL/TLS support with certificate validation options
- 🏷️ **Full TypeScript support with comprehensive type definitions**
- 🔒 **Type-safe API with interfaces for all UniFi data structures**
- ⚡ **Modern ES2020+ features with full IntelliSense support**

## Installation

```bash
npm install unifi-node
```

## Quick Start

### TypeScript (Recommended)
```typescript
import { UniFiAPI, UniFiConfig } from 'unifi-node';

const config: UniFiConfig = {
  host: '192.168.1.1',
  port: 8443,
  username: 'admin',
  password: 'your-password',
  site: 'default'
};

async function main(): Promise<void> {
  const unifi = new UniFiAPI(config);
  
  try {
    await unifi.login();
    
    // Get all devices with full type safety
    const devices = await unifi.getDevices();
    console.log('Devices:', devices);
    
    // Get all clients with type information
    const clients = await unifi.getClients();
    console.log('Clients:', clients);
    
    await unifi.logout();
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
```

### JavaScript
```javascript
const { UniFiAPI } = require('unifi-node');

const unifi = new UniFiAPI({
  host: '192.168.1.1',
  port: 8443,
  username: 'admin',
  password: 'your-password',
  site: 'default'
});

async function main() {
  try {
    await unifi.login();
    
    // Get all devices
    const devices = await unifi.getDevices();
    console.log('Devices:', devices);
    
    // Get all clients
    const clients = await unifi.getClients();
    console.log('Clients:', clients);
    
    await unifi.logout();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
```

### TypeScript
```typescript
import { UniFiAPI, UniFiConfig, UniFiDevice, UniFiClient } from 'unifi-node';

const config: UniFiConfig = {
  host: '192.168.1.1',
  port: 8443,
  username: 'admin',
  password: 'your-password',
  site: 'default'
};

async function main(): Promise<void> {
  const unifi = new UniFiAPI(config);
  
  try {
    await unifi.login();
    
    // Type-safe device operations
    const devices: UniFiDevice[] = await unifi.getDevices();
    const accessPoints = devices.filter(device => device.type === 'uap');
    
    // Type-safe client operations
    const clients: UniFiClient[] = await unifi.getClients();
    const wirelessClients = clients.filter(client => !client.is_wired);
    
    await unifi.logout();
  } catch (error) {
    console.error('Error:', (error as Error).message);
  }
}

main();
```

## API Documentation

### Constructor Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `host` | string | required | UniFi Controller hostname or IP |
| `port` | number | 8443 | UniFi Controller port |
| `username` | string | required | Controller username |
| `password` | string | required | Controller password |
| `site` | string | 'default' | Site name |
| `ssl` | boolean | true | Use HTTPS |
| `strictSSL` | boolean | false | Strict SSL certificate validation |
| `timeout` | number | 30000 | Request timeout in milliseconds |

### Methods

#### Authentication
- `login()` - Authenticate with the controller
- `logout()` - End the session

#### Device Management
- `getDevices()` - Get all devices
- `getDevice(mac)` - Get specific device by MAC address
- `restartDevice(mac)` - Restart a device
- `adoptDevice(mac)` - Adopt a device
- `forgetDevice(mac)` - Forget/remove a device

#### Client Management
- `getClients()` - Get all connected clients
- `getClient(mac)` - Get specific client by MAC address
- `blockClient(mac)` - Block a client
- `unblockClient(mac)` - Unblock a client
- `reconnectClient(mac)` - Force client reconnection

#### Network Management
- `getNetworks()` - Get network configurations
- `createNetwork(config)` - Create a new network
- `updateNetwork(id, config)` - Update network configuration
- `deleteNetwork(id)` - Delete a network

#### Statistics
- `getSystemStats()` - Get system statistics
- `getDeviceStats(mac)` - Get device-specific statistics
- `getClientStats(mac)` - Get client-specific statistics

#### Events
- `enableEvents()` - Enable WebSocket event streaming
- `disableEvents()` - Disable event streaming
- `on(event, callback)` - Subscribe to events

### Events

The module supports real-time events via WebSocket:

```typescript
import { UniFiAPI, UniFiClient } from 'unifi-node';

unifi.on('client.connected', (client: UniFiClient) => {
  console.log('Client connected:', client.mac);
});

unifi.on('client.disconnected', (client: UniFiClient) => {
  console.log('Client disconnected:', client.mac);
});

unifi.on('device.state_change', (device: any) => {
  console.log('Device state changed:', device.mac, device.state);
});

await unifi.enableEvents();
```

## TypeScript Support

This module is written in TypeScript and provides comprehensive type definitions for all UniFi data structures:

### Core Types

```typescript
import { 
  UniFiConfig,
  UniFiDevice, 
  UniFiClient, 
  UniFiNetwork,
  UniFiSite,
  UniFiAlert,
  UniFiSystemInfo 
} from 'unifi-node';

// Type-safe configuration
const config: UniFiConfig = {
  host: 'controller.local',
  username: 'admin',
  password: 'password'
};

// Type-safe device handling
const handleDevices = (devices: UniFiDevice[]) => {
  devices.forEach(device => {
    console.log(`${device.name}: ${device.state === 1 ? 'Online' : 'Offline'}`);
    
    // TypeScript knows about optional properties
    if (device.general_temperature) {
      console.log(`Temperature: ${device.general_temperature}°C`);
    }
  });
};

// Type-safe client filtering
const getWirelessClients = (clients: UniFiClient[]): UniFiClient[] => {
  return clients.filter(client => !client.is_wired);
};

// Custom type extensions
interface NetworkStats {
  deviceCount: number;
  clientCount: number;
  averageSignal?: number;
}

const calculateStats = async (unifi: UniFiAPI): Promise<NetworkStats> => {
  const [devices, clients] = await Promise.all([
    unifi.getDevices(),
    unifi.getClients()
  ]);
  
  const wirelessClients = clients.filter(c => !c.is_wired && c.rssi);
  const averageSignal = wirelessClients.length > 0
    ? wirelessClients.reduce((sum, c) => sum + (c.rssi || 0), 0) / wirelessClients.length
    : undefined;
  
  return {
    deviceCount: devices.length,
    clientCount: clients.length,
    averageSignal
  };
};
```

### Available Interfaces

- `UniFiConfig` - Configuration options
- `UniFiDevice` - Device information and statistics
- `UniFiClient` - Client connection details
- `UniFiNetwork` - Network configuration
- `UniFiSite` - Site information
- `UniFiAlert` - System alerts
- `UniFiSystemInfo` - System statistics
- `UniFiError` - Custom error type with error codes

## Examples

See the `examples/` directory for comprehensive TypeScript examples:

- `basic-usage.ts` - Basic API usage and authentication
- `device-management.ts` - Device control and monitoring with type safety
- `client-monitoring.ts` - Client tracking and network analysis
- `real-time-events.ts` - WebSocket event streaming with full typing
- `advanced-usage.ts` - Advanced network management and monitoring
- `basic-usage-typescript.ts` - Alternative TypeScript example

All examples are written in TypeScript with full type safety and comprehensive error handling.
- `advanced-usage.js` - Advanced network management and multi-site operations

## Error Handling

The module throws descriptive errors for various scenarios:

```javascript
try {
  await unifi.login();
} catch (error) {
  if (error.code === 'INVALID_CREDENTIALS') {
    console.error('Invalid username or password');
  } else if (error.code === 'CONNECTION_ERROR') {
    console.error('Cannot connect to controller');
  } else {
    console.error('Unexpected error:', error.message);
  }
}
```

## Testing

This project includes both unit tests and integration tests.

### Unit Tests (Safe - No Network Required)
```bash
npm test              # Run unit tests only
npm run test:unit     # Same as above
npm run test:watch    # Watch mode for development
```

### Integration Tests (Real Network Required)
```bash
# 1. Set up environment
cp .env.example .env
# Edit .env with your UniFi Controller details

# 2. Enable and run integration tests
RUN_INTEGRATION_TESTS=true npm run test:integration
```

### Quick Network Scan
```bash
# Test connectivity without full test suite
npm run scan
```

**⚠️ Important**: Integration tests connect to real UniFi Controllers. Use only in test/development environments!

See [TESTING.md](./TESTING.md) for detailed testing instructions and safety guidelines.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Disclaimer

This is an unofficial module for UniFi hardware. It is not affiliated with or endorsed by Ubiquiti Inc.
