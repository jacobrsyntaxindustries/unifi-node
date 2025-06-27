# UniFi Node

A comprehensive Node.js module for communicating and controlling Ubiquiti UniFi hardware through the UniFi Controller API.

## Features

- 🔐 Secure authentication with UniFi Controller
- 📡 Device management (Access Points, Switches, Gateways)
- 👥 Client management and monitoring
- 📊 Real-time statistics and monitoring
- 🔧 Network configuration management
- 🌐 Multi-site support
- 📱 WebSocket support for real-time events
- 🛡️ SSL/TLS support with certificate validation options

## Installation

```bash
npm install unifi-node
```

## Quick Start

```javascript
const UniFiAPI = require('unifi-node');

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

```javascript
unifi.on('client.connected', (client) => {
  console.log('Client connected:', client.mac);
});

unifi.on('client.disconnected', (client) => {
  console.log('Client disconnected:', client.mac);
});

unifi.on('device.state_change', (device) => {
  console.log('Device state changed:', device.mac, device.state);
});

await unifi.enableEvents();
```

## Examples

See the `examples/` directory for more detailed usage examples:

- `basic-usage.js` - Basic API usage and authentication
- `device-management.js` - Device control and monitoring
- `client-monitoring.js` - Client tracking and management
- `real-time-events.js` - WebSocket event streaming with polling fallback
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
