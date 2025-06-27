# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-06-27

### 💥 Breaking Changes
- **Complete TypeScript rewrite**: Project is now TypeScript-first with full type safety
- **Modern ES2020+ features**: Updated target and module system
- **Enhanced type definitions**: All UniFi data structures now have comprehensive interfaces

### Added
- **Full TypeScript support** with comprehensive type definitions
- **Type-safe interfaces** for all UniFi data structures (devices, clients, networks, alerts)
- **Modern TypeScript toolchain** with ts-jest, typedoc, and TypeScript ESLint
- **Enhanced IntelliSense support** with complete autocomplete and error checking
- **Improved build system** with TypeScript compilation and declaration files
- **TypeScript examples** for all major functionality
- **Better error handling** with typed error objects

### Changed
- **All source code migrated to TypeScript** (`src/index.ts`)
- **All example files converted to TypeScript** (`.ts` extensions)
- **Test suite updated** for TypeScript compatibility
- **Documentation updated** to emphasize TypeScript-first approach
- **Build process modernized** with TypeScript compiler

### Technical Improvements
- **Strict TypeScript configuration** with comprehensive compiler options
- **Enhanced type safety** with strict null checks and function types
- **Modern module system** with ES2020 target
- **Improved developer experience** with full IntelliSense support

## [1.0.0] - 2025-06-26

### Added
- Initial release of unifi-node
- Core UniFi Controller API client with authentication support
- Device management functions (get, restart, adopt, forget)
- Client management functions (get, block, unblock, reconnect)
- Network configuration management
- Real-time WebSocket event streaming
- System and device statistics retrieval
- Multi-site support
- SSL/TLS support with certificate validation options
- Comprehensive error handling with specific error codes
- EventEmitter-based architecture for real-time notifications
- Complete API documentation with JSDoc
- Example scripts demonstrating various use cases
- Unit tests with Jest framework
- ESLint configuration for code quality
- Support for both WebSocket and polling-based monitoring

### Features
- 🔐 Secure authentication with UniFi Controller
- 📡 Device management (Access Points, Switches, Gateways)
- 👥 Client management and monitoring
- 📊 Real-time statistics and monitoring
- 🔧 Network configuration management
- 🌐 Multi-site support
- 📱 WebSocket support for real-time events
- 🛡️ SSL/TLS support with certificate validation options

### API Methods
- Authentication: `login()`, `logout()`
- Device Management: `getDevices()`, `getDevice()`, `restartDevice()`, `adoptDevice()`, `forgetDevice()`
- Client Management: `getClients()`, `getClient()`, `blockClient()`, `unblockClient()`, `reconnectClient()`
- Network Management: `getNetworks()`, `createNetwork()`, `updateNetwork()`, `deleteNetwork()`
- Statistics: `getSystemStats()`, `getDeviceStats()`, `getClientStats()`
- Events: `enableEvents()`, `disableEvents()`
- Utilities: `getControllerInfo()`, `getSites()`, `getAlerts()`, `archiveAlert()`

### Examples
- `basic-usage.js` - Basic API usage and authentication
- `device-management.js` - Device control and monitoring
- `client-monitoring.js` - Client tracking and management
- `real-time-events.js` - WebSocket event streaming with polling fallback

### Development Tools
- Jest test framework with coverage reporting
- ESLint for code quality and consistency
- JSDoc for API documentation generation
- Comprehensive example scripts
- GitHub Actions ready (CI/CD pipeline can be added)

### Dependencies
- `axios` ^1.6.0 - HTTP client for API requests
- `ws` ^8.14.0 - WebSocket client for real-time events
- Built-in Node.js modules: `https`, `events`

### Requirements
- Node.js >= 14.0.0
- UniFi Controller (tested with v6.x and v7.x)
- Network access to UniFi Controller

### Known Limitations
- WebSocket support depends on UniFi Controller version and configuration
- Some advanced features may require specific UniFi Controller versions
- SSL certificate validation is optional (disabled by default for self-signed certificates)

### License
MIT License - see LICENSE file for details.
