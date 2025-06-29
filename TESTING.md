# Testing with Real UniFi Networks

This guide explains how to test the unifi-node library against your actual UniFi Controller and network.

## ⚠️ Important Safety Notes

**Before running tests on a real network:**

1. **Use a test/development environment** - Don't run tests on production networks
2. **Read-only operations** - Most tests only read data, but some may modify settings
3. **Backup your configuration** - Always backup your UniFi Controller before testing
4. **Limited access** - Create a dedicated test user with minimal permissions
5. **Monitor the results** - Watch for any unexpected behavior during testing

## 🚀 Quick Start

### 1. Environment Setup

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your UniFi Controller details:

```bash
# Enable integration tests
RUN_INTEGRATION_TESTS=true

# Your UniFi Controller details
UNIFI_HOST=192.168.1.1
UNIFI_PORT=8443
UNIFI_USERNAME=admin
UNIFI_PASSWORD=your-password
UNIFI_SITE=default
UNIFI_STRICT_SSL=false
```

### 2. Quick Network Scan

Run a quick scan to verify connectivity:

```bash
npm run scan
```

This will:
- Connect to your UniFi Controller
- Display basic network information
- Show device and client counts
- Verify API functionality

### 3. Run Integration Tests

Execute the full integration test suite:

```bash
npm run test:integration
```

## 📋 Test Types

### Unit Tests (Safe)
```bash
npm run test:unit
```
- Mock all network calls
- No real network interaction
- Safe to run anywhere

### Integration Tests (Real Network)
```bash
npm run test:integration
```
- Connect to real UniFi Controller
- Read network data
- Test all API endpoints
- **Requires actual network**

### All Tests
```bash
npm run test:all
```
- Runs both unit and integration tests
- Comprehensive coverage

## 🔧 Configuration Examples

### Home Network
```bash
UNIFI_HOST=192.168.1.1
UNIFI_PORT=8443
UNIFI_USERNAME=admin
UNIFI_PASSWORD=your-admin-password
UNIFI_SITE=default
UNIFI_STRICT_SSL=false
```

### Cloud Key
```bash
UNIFI_HOST=unifi.yourdomain.com
UNIFI_PORT=443
UNIFI_USERNAME=admin
UNIFI_PASSWORD=your-password
UNIFI_SITE=default
UNIFI_STRICT_SSL=true
```

### Dream Machine
```bash
UNIFI_HOST=192.168.1.1
UNIFI_PORT=443
UNIFI_USERNAME=admin
UNIFI_PASSWORD=your-password
UNIFI_SITE=default
UNIFI_STRICT_SSL=false
```

### Local Development VM
```bash
UNIFI_HOST=10.0.0.100
UNIFI_PORT=8443
UNIFI_USERNAME=testadmin
UNIFI_PASSWORD=testpassword
UNIFI_SITE=default
UNIFI_STRICT_SSL=false
```

## 🛡️ Security Best Practices

### 1. Create a Test User

Instead of using your main admin account:

1. Log into UniFi Controller
2. Go to Settings → Admins
3. Create a new admin with limited permissions:
   - **Role**: Limited Admin or Super Admin (for full testing)
   - **Sites**: Only your test site
   - **Permissions**: Read-only where possible

### 2. Use Environment Variables

Never hardcode credentials in your test files:

```typescript
// ❌ Bad - hardcoded credentials
const config = {
  host: '192.168.1.1',
  username: 'admin',
  password: 'secret123'
};

// ✅ Good - use environment variables
const config = {
  host: process.env.UNIFI_HOST,
  username: process.env.UNIFI_USERNAME,
  password: process.env.UNIFI_PASSWORD
};
```

### 3. Network Isolation

- Use a separate VLAN for testing
- Isolate test devices
- Monitor network traffic during tests

## 📊 What the Tests Cover

### Authentication
- Login/logout functionality
- Session management
- Error handling

### Device Management
- Device discovery
- Device statistics
- Device status monitoring

### Client Management
- Connected client enumeration
- Client statistics
- Client tracking

### Network Configuration
- Network listing
- Configuration reading
- Multi-site support

### Real-time Events
- WebSocket connection
- Event streaming
- Event handling

### System Information
- Controller info
- System statistics
- Alert retrieval

## 🐛 Troubleshooting

### Connection Issues

**SSL Certificate Errors:**
```bash
# Disable strict SSL for self-signed certificates
UNIFI_STRICT_SSL=false
```

**Port Issues:**
```bash
# Try different ports
UNIFI_PORT=8443  # Default
UNIFI_PORT=443   # Cloud Key/Dream Machine
UNIFI_PORT=80    # HTTP (not recommended)
```

**Hostname Resolution:**
```bash
# Use IP address instead of hostname
UNIFI_HOST=192.168.1.1
```

### Authentication Issues

**Invalid Credentials:**
- Verify username/password in UniFi Controller
- Check if account is enabled
- Ensure account has admin privileges

**Two-Factor Authentication:**
- Disable 2FA for test account
- Or use application-specific password

### Network Issues

**Firewall:**
- Ensure UniFi Controller ports are open
- Check local firewall settings
- Verify network connectivity

**VPN/Remote Access:**
- Test from same network first
- Configure VPN if testing remotely
- Check latency and timeouts

## 📝 Writing Custom Tests

### Basic Test Structure

```typescript
import { UniFiAPI, UniFiConfig } from '../src/index';

const config: UniFiConfig = {
  host: process.env.UNIFI_HOST!,
  username: process.env.UNIFI_USERNAME!,
  password: process.env.UNIFI_PASSWORD!,
  // ... other config
};

describe('My Custom Tests', () => {
  let unifi: UniFiAPI;
  
  beforeAll(async () => {
    unifi = new UniFiAPI(config);
    await unifi.login();
  });
  
  afterAll(async () => {
    await unifi.logout();
  });
  
  test('should do something', async () => {
    const result = await unifi.getDevices();
    expect(result).toBeDefined();
  });
});
```

### Testing Specific Scenarios

```typescript
// Test device adoption
test('should handle device adoption', async () => {
  const devices = await unifi.getDevices();
  const unadoptedDevices = devices.filter(d => !d.adopted);
  
  // Only test if unadopted devices exist
  if (unadoptedDevices.length > 0) {
    // Test adoption logic here
  }
});

// Test client blocking (be careful!)
test('should block and unblock client', async () => {
  const clients = await unifi.getClients();
  
  if (clients.length > 0) {
    const testClient = clients.find(c => c.hostname?.includes('test'));
    
    if (testClient) {
      // Temporarily block client
      await unifi.blockClient(testClient.mac);
      
      // Verify blocked
      // ...
      
      // Unblock client
      await unifi.unblockClient(testClient.mac);
    }
  }
});
```

## 🚨 Emergency Procedures

If tests cause network issues:

1. **Stop all tests immediately**
2. **Log into UniFi Controller web interface**
3. **Check Recent Activities for changes**
4. **Restore from backup if needed**
5. **Reboot devices if necessary**

Emergency contact info:
- Keep your network admin contact handy
- Have backup access method ready
- Know how to factory reset devices

## 📈 Monitoring Test Results

### Real-time Monitoring

```typescript
// Monitor events during tests
unifi.on('client.connected', (client) => {
  console.log(`Client connected: ${client.hostname}`);
});

unifi.on('client.disconnected', (client) => {
  console.log(`Client disconnected: ${client.hostname}`);
});

unifi.on('device.updated', (device) => {
  console.log(`Device updated: ${device.name}`);
});
```

### Performance Metrics

```typescript
// Track API response times
const startTime = Date.now();
const devices = await unifi.getDevices();
const endTime = Date.now();

console.log(`API call took ${endTime - startTime}ms`);
console.log(`Retrieved ${devices.length} devices`);
```

## 🎯 Best Practices

1. **Start small** - Run quick scan first
2. **Monitor actively** - Watch your network during tests
3. **Test incrementally** - Run one test suite at a time
4. **Document issues** - Keep notes of any problems
5. **Have rollback plan** - Know how to undo changes
6. **Use test environment** - Never test on production

Remember: **The goal is to verify the library works with your network, not to test your network itself.**
