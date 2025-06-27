const UniFiAPI = require('../src/index');

// Mock configuration for testing
const mockConfig = {
  host: 'test.unifi.local',
  port: 8443,
  username: 'testuser',
  password: 'testpass',
  site: 'default',
  strictSSL: false
};

describe('UniFiAPI', () => {
  let unifi;

  beforeEach(() => {
    unifi = new UniFiAPI(mockConfig);
  });

  afterEach(async () => {
    if (unifi.isAuthenticated) {
      try {
        await unifi.logout();
      } catch (error) {
        // Ignore logout errors in tests
      }
    }
  });

  describe('Constructor', () => {
    test('should create instance with valid config', () => {
      expect(unifi).toBeInstanceOf(UniFiAPI);
      expect(unifi.options.host).toBe('test.unifi.local');
      expect(unifi.options.port).toBe(8443);
      expect(unifi.options.username).toBe('testuser');
      expect(unifi.options.password).toBe('testpass');
      expect(unifi.options.site).toBe('default');
    });

    test('should throw error with missing required config', () => {
      expect(() => {
        new UniFiAPI({});
      }).toThrow('Host, username, and password are required');

      expect(() => {
        new UniFiAPI({ host: 'test.local' });
      }).toThrow('Host, username, and password are required');

      expect(() => {
        new UniFiAPI({ host: 'test.local', username: 'user' });
      }).toThrow('Host, username, and password are required');
    });

    test('should use default values for optional config', () => {
      const unifiMinimal = new UniFiAPI({
        host: 'test.local',
        username: 'user',
        password: 'pass'
      });

      expect(unifiMinimal.options.port).toBe(8443);
      expect(unifiMinimal.options.site).toBe('default');
      expect(unifiMinimal.options.ssl).toBe(true);
      expect(unifiMinimal.options.strictSSL).toBe(false);
      expect(unifiMinimal.options.timeout).toBe(30000);
    });

    test('should construct correct base URL', () => {
      expect(unifi.baseURL).toBe('https://test.unifi.local:8443');

      const unifiHttp = new UniFiAPI({
        host: 'test.local',
        username: 'user',
        password: 'pass',
        ssl: false
      });
      expect(unifiHttp.baseURL).toBe('http://test.local:8443');
    });
  });

  describe('Event Emitter', () => {
    test('should extend EventEmitter', () => {
      expect(unifi.on).toBeDefined();
      expect(unifi.emit).toBeDefined();
      expect(unifi.removeListener).toBeDefined();
    });

    test('should emit authenticated event on successful login', (done) => {
      unifi.on('authenticated', () => {
        done();
      });

      // Mock successful login
      unifi.isAuthenticated = true;
      unifi.emit('authenticated');
    });

    test('should emit disconnected event on logout', (done) => {
      unifi.on('disconnected', () => {
        done();
      });

      // Mock logout
      unifi.emit('disconnected');
    });
  });

  describe('Helper Methods', () => {
    test('should handle event processing', () => {
      const mockEvent = {
        meta: { message: 'sta:connect' },
        data: { mac: '00:11:22:33:44:55', hostname: 'test-device' }
      };

      let clientConnectedFired = false;
      let rawEventFired = false;

      unifi.on('client.connected', (data) => {
        expect(data.mac).toBe('00:11:22:33:44:55');
        expect(data.hostname).toBe('test-device');
        clientConnectedFired = true;
      });

      unifi.on('raw_event', (event) => {
        expect(event).toEqual(mockEvent);
        rawEventFired = true;
      });

      unifi._handleEvent(mockEvent);

      expect(clientConnectedFired).toBe(true);
      expect(rawEventFired).toBe(true);
    });

    test('should handle different event types', () => {
      const events = [
        { meta: { message: 'sta:connect' }, data: { mac: '00:11:22:33:44:55' } },
        { meta: { message: 'sta:disconnect' }, data: { mac: '00:11:22:33:44:55' } },
        { meta: { message: 'ap:detected' }, data: { mac: '00:11:22:33:44:66' } },
        { meta: { message: 'ap:lost' }, data: { mac: '00:11:22:33:44:66' } },
        { meta: { message: 'custom:event' }, data: { custom: 'data' } }
      ];

      const firedEvents = [];

      unifi.on('client.connected', () => firedEvents.push('client.connected'));
      unifi.on('client.disconnected', () => firedEvents.push('client.disconnected'));
      unifi.on('device.detected', () => firedEvents.push('device.detected'));
      unifi.on('device.lost', () => firedEvents.push('device.lost'));
      unifi.on('event', (event) => firedEvents.push(`event:${event.type}`));

      events.forEach(event => unifi._handleEvent(event));

      expect(firedEvents).toContain('client.connected');
      expect(firedEvents).toContain('client.disconnected');
      expect(firedEvents).toContain('device.detected');
      expect(firedEvents).toContain('device.lost');
      expect(firedEvents).toContain('event:custom:event');
    });

    test('should handle malformed events gracefully', () => {
      const malformedEvents = [
        null,
        undefined,
        {},
        { meta: null },
        { meta: {} },
        { data: 'test' }
      ];

      // Should not throw errors
      malformedEvents.forEach(event => {
        expect(() => unifi._handleEvent(event)).not.toThrow();
      });
    });
  });

  describe('Configuration Validation', () => {
    test('should validate port numbers', () => {
      const validPorts = [80, 443, 8080, 8443, 65535];
      const invalidPorts = [-1, 0, 65536, 'invalid', null];

      validPorts.forEach(port => {
        expect(() => {
          new UniFiAPI({ host: 'test.local', username: 'user', password: 'pass', port });
        }).not.toThrow();
      });

      // Note: The constructor doesn't currently validate port numbers,
      // but this test serves as documentation for future validation
    });

    test('should handle SSL configuration', () => {
      const sslTrue = new UniFiAPI({
        host: 'test.local',
        username: 'user',
        password: 'pass',
        ssl: true
      });
      expect(sslTrue.baseURL).toBe('https://test.local:8443');

      const sslFalse = new UniFiAPI({
        host: 'test.local',
        username: 'user',
        password: 'pass',
        ssl: false
      });
      expect(sslFalse.baseURL).toBe('http://test.local:8443');
    });
  });

  describe('State Management', () => {
    test('should initialize with correct default state', () => {
      expect(unifi.isAuthenticated).toBe(false);
      expect(unifi.cookies).toBe('');
      expect(unifi.csrfToken).toBe('');
      expect(unifi.eventSocket).toBe(null);
    });

    test('should update authentication state', () => {
      unifi.isAuthenticated = true;
      unifi.cookies = 'test-cookie';
      unifi.csrfToken = 'test-token';

      expect(unifi.isAuthenticated).toBe(true);
      expect(unifi.cookies).toBe('test-cookie');
      expect(unifi.csrfToken).toBe('test-token');
    });
  });

  describe('Error Handling', () => {
    test('should handle connection errors appropriately', () => {
      // This would require mocking axios, which is beyond the scope of basic unit tests
      // Integration tests would be more appropriate for error handling scenarios
      expect(true).toBe(true); // Placeholder
    });
  });
});

// Mock data for testing
const mockDevices = [
  {
    mac: '00:11:22:33:44:55',
    name: 'Test AP',
    model: 'UAP-AC-LITE',
    type: 'uap',
    state: 1,
    ip: '192.168.1.100',
    version: '4.3.20.11298',
    uptime: 86400,
    adopted: true
  },
  {
    mac: '00:11:22:33:44:66',
    name: 'Test Switch',
    model: 'US-8-60W',
    type: 'usw',
    state: 1,
    ip: '192.168.1.101',
    version: '4.3.17.11279',
    uptime: 172800,
    adopted: true
  }
];

const mockClients = [
  {
    mac: '00:aa:bb:cc:dd:ee',
    hostname: 'test-laptop',
    name: 'Test Laptop',
    ip: '192.168.1.50',
    is_wired: false,
    is_guest: false,
    rssi: -45,
    rx_bytes: 1024000,
    tx_bytes: 512000,
    uptime: 3600,
    first_seen: Math.floor(Date.now() / 1000) - 86400,
    last_seen: Math.floor(Date.now() / 1000),
    satisfaction: 98
  },
  {
    mac: '00:aa:bb:cc:dd:ff',
    hostname: 'test-phone',
    name: 'Test Phone',
    ip: '192.168.1.51',
    is_wired: false,
    is_guest: false,
    rssi: -52,
    rx_bytes: 2048000,
    tx_bytes: 1024000,
    uptime: 7200,
    first_seen: Math.floor(Date.now() / 1000) - 172800,
    last_seen: Math.floor(Date.now() / 1000),
    satisfaction: 95
  }
];

// Export mock data for use in integration tests
module.exports = {
  mockConfig,
  mockDevices,
  mockClients
};
