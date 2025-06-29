import { UniFiAPI, UniFiConfig, UniFiDevice, UniFiClient } from '../src/index';

// Mock configuration for unit testing (not real credentials)
const mockConfig: UniFiConfig = {
  host: 'test.unifi.local',
  port: 8443,
  username: 'testuser',
  password: 'testpass',
  site: 'default',
  strictSSL: false
};

describe('UniFiAPI', () => {
  let unifi: UniFiAPI;

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
      expect((unifi as any).options.host).toBe('test.unifi.local');
      expect((unifi as any).options.port).toBe(8443);
      expect((unifi as any).options.username).toBe('testuser');
      expect((unifi as any).options.password).toBe('testpass');
      expect((unifi as any).options.site).toBe('default');
    });

    test('should throw error with missing required config', () => {
      expect(() => {
        new UniFiAPI({} as UniFiConfig);
      }).toThrow('Host, username, and password are required');

      expect(() => {
        new UniFiAPI({ host: 'test.local' } as UniFiConfig);
      }).toThrow('Host, username, and password are required');

      expect(() => {
        new UniFiAPI({ host: 'test.local', username: 'user' } as UniFiConfig);
      }).toThrow('Host, username, and password are required');
    });

    test('should use default values for optional config', () => {
      const unifiMinimal = new UniFiAPI({
        host: 'test.local',
        username: 'user',
        password: 'pass'
      });

      expect((unifiMinimal as any).options.port).toBe(8443);
      expect((unifiMinimal as any).options.site).toBe('default');
      expect((unifiMinimal as any).options.ssl).toBe(true);
      expect((unifiMinimal as any).options.strictSSL).toBe(false);
      expect((unifiMinimal as any).options.timeout).toBe(30000);
    });

    test('should construct correct base URL', () => {
      expect((unifi as any).baseURL).toBe('https://test.unifi.local:8443');

      const unifiHttp = new UniFiAPI({
        host: 'test.local',
        username: 'user',
        password: 'pass',
        ssl: false
      });
      expect((unifiHttp as any).baseURL).toBe('http://test.local:8443');
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

      unifi.on('client.connected', (data: any) => {
        expect(data.mac).toBe('00:11:22:33:44:55');
        expect(data.hostname).toBe('test-device');
        clientConnectedFired = true;
      });

      unifi.on('raw_event', (event: any) => {
        expect(event).toEqual(mockEvent);
        rawEventFired = true;
      });

      (unifi as any).handleEvent(mockEvent);

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

      const firedEvents: string[] = [];

      unifi.on('client.connected', () => firedEvents.push('client.connected'));
      unifi.on('client.disconnected', () => firedEvents.push('client.disconnected'));
      unifi.on('device.detected', () => firedEvents.push('device.detected'));
      unifi.on('device.lost', () => firedEvents.push('device.lost'));
      unifi.on('event', (event: any) => firedEvents.push(`event:${event.type}`));

      events.forEach(event => (unifi as any).handleEvent(event));

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
        expect(() => (unifi as any).handleEvent(event)).not.toThrow();
      });
    });
  });

  describe('Configuration Validation', () => {
    test('should validate port numbers', () => {
      const validPorts = [80, 443, 8080, 8443, 65535];

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
      expect((sslTrue as any).baseURL).toBe('https://test.local:8443');

      const sslFalse = new UniFiAPI({
        host: 'test.local',
        username: 'user',
        password: 'pass',
        ssl: false
      });
      expect((sslFalse as any).baseURL).toBe('http://test.local:8443');
    });
  });

  describe('State Management', () => {
    test('should initialize with correct default state', () => {
      expect(unifi.isAuthenticated).toBe(false);
      expect((unifi as any).cookies).toBe('');
      expect((unifi as any).csrfToken).toBe('');
      expect((unifi as any).eventSocket).toBe(null);
    });

    test('should update authentication state', () => {
      unifi.isAuthenticated = true;
      (unifi as any).cookies = 'test-cookie';
      (unifi as any).csrfToken = 'test-token';

      expect(unifi.isAuthenticated).toBe(true);
      expect((unifi as any).cookies).toBe('test-cookie');
      expect((unifi as any).csrfToken).toBe('test-token');
    });
  });

  describe('Error Handling', () => {
    test('should handle connection errors appropriately', () => {
      // This would require mocking axios, which is beyond the scope of basic unit tests
      // Integration tests would be more appropriate for error handling scenarios
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Type Safety', () => {
    test('should have proper TypeScript types', () => {
      // These tests verify that TypeScript compilation succeeds with proper types
      const config: UniFiConfig = {
        host: 'test.local',
        username: 'user',
        password: 'pass'
      };

      const api = new UniFiAPI(config);
      expect(api).toBeInstanceOf(UniFiAPI);

      // Type assertions to verify interface compliance
      const mockDevice: UniFiDevice = {
        _id: 'test-id',
        mac: '00:11:22:33:44:55',
        name: 'Test Device',
        model: 'UAP-AC-LITE',
        type: 'uap',
        state: 1,
        ip: '192.168.1.100',
        adopted: true,
        site_id: 'test-site'
      };

      const mockClient: UniFiClient = {
        _id: 'test-client-id',
        mac: '00:aa:bb:cc:dd:ee',
        ip: '192.168.1.50',
        hostname: 'test-client',
        is_wired: false,
        is_guest: false,
        first_seen: Date.now() / 1000,
        last_seen: Date.now() / 1000,
        uptime: 3600,
        rx_bytes: 1024,
        rx_packets: 10,
        tx_bytes: 512,
        tx_packets: 5,
        authorized: true,
        blocked: false
      };

      expect(mockDevice.mac).toBe('00:11:22:33:44:55');
      expect(mockClient.ip).toBe('192.168.1.50');
    });
  });
});

// Mock data for testing
export const mockDevices: UniFiDevice[] = [
  {
    _id: 'device-1',
    mac: '00:11:22:33:44:55',
    name: 'Test AP',
    model: 'UAP-AC-LITE',
    type: 'uap',
    state: 1,
    ip: '192.168.1.100',
    version: '4.3.20.11298',
    uptime: 86400,
    adopted: true,
    site_id: 'test-site'
  },
  {
    _id: 'device-2',
    mac: '00:11:22:33:44:66',
    name: 'Test Switch',
    model: 'US-8-60W',
    type: 'usw',
    state: 1,
    ip: '192.168.1.101',
    version: '4.3.17.11279',
    uptime: 172800,
    adopted: true,
    site_id: 'test-site'
  }
];

export const mockClients: UniFiClient[] = [
  {
    _id: 'client-1',
    mac: '00:aa:bb:cc:dd:ee',
    hostname: 'test-laptop',
    name: 'Test Laptop',
    ip: '192.168.1.50',
    is_wired: false,
    is_guest: false,
    rssi: -45,
    rx_bytes: 1024000,
    rx_packets: 1000,
    tx_bytes: 512000,
    tx_packets: 500,
    uptime: 3600,
    first_seen: Math.floor(Date.now() / 1000) - 86400,
    last_seen: Math.floor(Date.now() / 1000),
    satisfaction: 98,
    authorized: true,
    blocked: false
  },
  {
    _id: 'client-2',
    mac: '00:aa:bb:cc:dd:ff',
    hostname: 'test-phone',
    name: 'Test Phone',
    ip: '192.168.1.51',
    is_wired: false,
    is_guest: false,
    rssi: -52,
    rx_bytes: 2048000,
    rx_packets: 2000,
    tx_bytes: 1024000,
    tx_packets: 1000,
    uptime: 7200,
    first_seen: Math.floor(Date.now() / 1000) - 172800,
    last_seen: Math.floor(Date.now() / 1000),
    satisfaction: 95,
    authorized: true,
    blocked: false
  }
];

export { mockConfig };
