// Jest setup file for global test configuration

// Extend Jest matchers if needed
// require('jest-extended');

// Global test timeout (30 seconds)
jest.setTimeout(30000);

// Mock console methods for cleaner test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

beforeAll(() => {
  // Suppress console output during tests unless explicitly needed
  console.error = jest.fn();
  console.warn = jest.fn();
  console.log = jest.fn();
});

afterAll(() => {
  // Restore original console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  console.log = originalConsoleLog;
});

// Global test utilities
global.delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Mock UniFi Controller responses for testing
global.mockUniFiResponses = {
  login: {
    meta: { rc: 'ok' },
    data: []
  },
  logout: {
    meta: { rc: 'ok' },
    data: []
  },
  devices: {
    meta: { rc: 'ok' },
    data: [
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
      }
    ]
  },
  clients: {
    meta: { rc: 'ok' },
    data: [
      {
        mac: '00:aa:bb:cc:dd:ee',
        hostname: 'test-laptop',
        ip: '192.168.1.50',
        is_wired: false,
        rssi: -45,
        rx_bytes: 1024000,
        tx_bytes: 512000,
        uptime: 3600
      }
    ]
  }
};
