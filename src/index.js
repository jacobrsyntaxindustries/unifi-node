const axios = require('axios');
const https = require('https');
const WebSocket = require('ws');
const EventEmitter = require('events');

/**
 * UniFi API Client for controlling Ubiquiti UniFi hardware
 * @class UniFiAPI
 * @extends EventEmitter
 */
class UniFiAPI extends EventEmitter {
  /**
   * Create a UniFi API instance
   * @param {Object} options - Configuration options
   * @param {string} options.host - UniFi Controller hostname or IP
   * @param {number} [options.port=8443] - UniFi Controller port
   * @param {string} options.username - Controller username
   * @param {string} options.password - Controller password
   * @param {string} [options.site='default'] - Site name
   * @param {boolean} [options.ssl=true] - Use HTTPS
   * @param {boolean} [options.strictSSL=false] - Strict SSL certificate validation
   * @param {number} [options.timeout=30000] - Request timeout in milliseconds
   */
  constructor(options) {
    super();

    this.options = {
      port: 8443,
      site: 'default',
      ssl: true,
      strictSSL: false,
      timeout: 30000,
      ...options
    };

    if (!this.options.host || !this.options.username || !this.options.password) {
      throw new Error('Host, username, and password are required');
    }

    this.baseURL = `${this.options.ssl ? 'https' : 'http'}://${this.options.host}:${this.options.port}`;
    this.cookies = '';
    this.csrfToken = '';
    this.isAuthenticated = false;
    this.eventSocket = null;

    // Configure axios instance
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.options.timeout,
      httpsAgent: new https.Agent({
        rejectUnauthorized: this.options.strictSSL
      }),
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'unifi-node/1.0.0'
      }
    });

    // Add request interceptor to include cookies
    this.client.interceptors.request.use((config) => {
      if (this.cookies) {
        config.headers.Cookie = this.cookies;
      }
      if (this.csrfToken) {
        config.headers['X-Csrf-Token'] = this.csrfToken;
      }
      return config;
    });

    // Add response interceptor to handle cookies and errors
    this.client.interceptors.response.use(
      (response) => {
        // Extract cookies from response
        if (response.headers['set-cookie']) {
          this.cookies = response.headers['set-cookie']
            .map(cookie => cookie.split(';')[0])
            .join('; ');
        }
        return response;
      },
      (error) => {
        if (error.response?.status === 401) {
          this.isAuthenticated = false;
          const authError = new Error('Authentication failed');
          authError.code = 'INVALID_CREDENTIALS';
          throw authError;
        }
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          const connError = new Error(`Cannot connect to UniFi Controller at ${this.baseURL}`);
          connError.code = 'CONNECTION_ERROR';
          throw connError;
        }
        throw error;
      }
    );
  }

  /**
   * Authenticate with the UniFi Controller
   * @returns {Promise<boolean>} Success status
   */
  async login() {
    try {
      const response = await this.client.post('/api/login', {
        username: this.options.username,
        password: this.options.password,
        remember: false
      });

      if (response.data && response.data.meta && response.data.meta.rc === 'ok') {
        this.isAuthenticated = true;

        // Extract CSRF token if available
        if (response.data.meta.csrf_token) {
          this.csrfToken = response.data.meta.csrf_token;
        }

        this.emit('authenticated');
        return true;
      } else {
        throw new Error('Authentication failed: Invalid response');
      }
    } catch (error) {
      this.isAuthenticated = false;
      throw error;
    }
  }

  /**
   * End the session with the UniFi Controller
   * @returns {Promise<boolean>} Success status
   */
  async logout() {
    try {
      await this.client.post('/api/logout');
      this.isAuthenticated = false;
      this.cookies = '';
      this.csrfToken = '';

      if (this.eventSocket) {
        this.eventSocket.close();
        this.eventSocket = null;
      }

      this.emit('disconnected');
      return true;
    } catch (error) {
      // Logout might fail if already disconnected, which is okay
      this.isAuthenticated = false;
      return true;
    }
  }

  /**
   * Ensure authentication before making API calls
   * @private
   */
  async _ensureAuthenticated() {
    if (!this.isAuthenticated) {
      await this.login();
    }
  }

  /**
   * Make an authenticated API request
   * @private
   * @param {string} endpoint - API endpoint
   * @param {string} [method='GET'] - HTTP method
   * @param {Object} [data] - Request data
   * @returns {Promise<Object>} Response data
   */
  async _request(endpoint, method = 'GET', data = null) {
    await this._ensureAuthenticated();

    const config = {
      method: method.toLowerCase(),
      url: endpoint
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.data = data;
    }

    const response = await this.client(config);

    if (response.data && response.data.meta && response.data.meta.rc === 'ok') {
      return response.data.data || response.data;
    } else {
      throw new Error(`API Error: ${response.data?.meta?.msg || 'Unknown error'}`);
    }
  }

  /**
   * Get all devices in the site
   * @returns {Promise<Array>} Array of device objects
   */
  async getDevices() {
    return this._request(`/api/s/${this.options.site}/stat/device`);
  }

  /**
   * Get a specific device by MAC address
   * @param {string} mac - Device MAC address
   * @returns {Promise<Object>} Device object
   */
  async getDevice(mac) {
    const devices = await this.getDevices();
    const device = devices.find(d => d.mac.toLowerCase() === mac.toLowerCase());
    if (!device) {
      throw new Error(`Device with MAC ${mac} not found`);
    }
    return device;
  }

  /**
   * Restart a device
   * @param {string} mac - Device MAC address
   * @returns {Promise<boolean>} Success status
   */
  async restartDevice(mac) {
    await this._request(`/api/s/${this.options.site}/cmd/devmgr`, 'POST', {
      cmd: 'restart',
      mac
    });
    return true;
  }

  /**
   * Adopt a device
   * @param {string} mac - Device MAC address
   * @returns {Promise<boolean>} Success status
   */
  async adoptDevice(mac) {
    await this._request(`/api/s/${this.options.site}/cmd/devmgr`, 'POST', {
      cmd: 'adopt',
      mac
    });
    return true;
  }

  /**
   * Forget/remove a device
   * @param {string} mac - Device MAC address
   * @returns {Promise<boolean>} Success status
   */
  async forgetDevice(mac) {
    await this._request(`/api/s/${this.options.site}/cmd/devmgr`, 'POST', {
      cmd: 'forget',
      mac
    });
    return true;
  }

  /**
   * Get all connected clients
   * @returns {Promise<Array>} Array of client objects
   */
  async getClients() {
    return this._request(`/api/s/${this.options.site}/stat/sta`);
  }

  /**
   * Get a specific client by MAC address
   * @param {string} mac - Client MAC address
   * @returns {Promise<Object>} Client object
   */
  async getClient(mac) {
    const clients = await this.getClients();
    const client = clients.find(c => c.mac.toLowerCase() === mac.toLowerCase());
    if (!client) {
      throw new Error(`Client with MAC ${mac} not found`);
    }
    return client;
  }

  /**
   * Block a client
   * @param {string} mac - Client MAC address
   * @returns {Promise<boolean>} Success status
   */
  async blockClient(mac) {
    await this._request(`/api/s/${this.options.site}/cmd/stamgr`, 'POST', {
      cmd: 'block-sta',
      mac
    });
    return true;
  }

  /**
   * Unblock a client
   * @param {string} mac - Client MAC address
   * @returns {Promise<boolean>} Success status
   */
  async unblockClient(mac) {
    await this._request(`/api/s/${this.options.site}/cmd/stamgr`, 'POST', {
      cmd: 'unblock-sta',
      mac
    });
    return true;
  }

  /**
   * Force client reconnection
   * @param {string} mac - Client MAC address
   * @returns {Promise<boolean>} Success status
   */
  async reconnectClient(mac) {
    await this._request(`/api/s/${this.options.site}/cmd/stamgr`, 'POST', {
      cmd: 'kick-sta',
      mac
    });
    return true;
  }

  /**
   * Get network configurations
   * @returns {Promise<Array>} Array of network objects
   */
  async getNetworks() {
    return this._request(`/api/s/${this.options.site}/rest/networkconf`);
  }

  /**
   * Create a new network
   * @param {Object} config - Network configuration
   * @returns {Promise<Object>} Created network object
   */
  async createNetwork(config) {
    return this._request(`/api/s/${this.options.site}/rest/networkconf`, 'POST', config);
  }

  /**
   * Update network configuration
   * @param {string} id - Network ID
   * @param {Object} config - Updated configuration
   * @returns {Promise<Object>} Updated network object
   */
  async updateNetwork(id, config) {
    return this._request(`/api/s/${this.options.site}/rest/networkconf/${id}`, 'PUT', config);
  }

  /**
   * Delete a network
   * @param {string} id - Network ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteNetwork(id) {
    await this._request(`/api/s/${this.options.site}/rest/networkconf/${id}`, 'DELETE');
    return true;
  }

  /**
   * Get system statistics
   * @returns {Promise<Object>} System statistics
   */
  async getSystemStats() {
    return this._request(`/api/s/${this.options.site}/stat/sysinfo`);
  }

  /**
   * Get device-specific statistics
   * @param {string} mac - Device MAC address
   * @returns {Promise<Object>} Device statistics
   */
  async getDeviceStats(mac) {
    const devices = await this._request(`/api/s/${this.options.site}/stat/device/${mac}`);
    return devices[0] || null;
  }

  /**
   * Get client-specific statistics
   * @param {string} mac - Client MAC address
   * @returns {Promise<Object>} Client statistics
   */
  async getClientStats(mac) {
    const clients = await this._request(`/api/s/${this.options.site}/stat/user/${mac}`);
    return clients[0] || null;
  }

  /**
   * Enable real-time event streaming via WebSocket
   * @returns {Promise<boolean>} Success status
   */
  async enableEvents() {
    await this._ensureAuthenticated();

    if (this.eventSocket) {
      return true; // Already connected
    }

    const wsUrl = `${this.baseURL.replace('http', 'ws')}/wss/s/${this.options.site}/events`;

    this.eventSocket = new WebSocket(wsUrl, {
      headers: {
        Cookie: this.cookies
      },
      rejectUnauthorized: this.options.strictSSL
    });

    return new Promise((resolve, reject) => {
      this.eventSocket.on('open', () => {
        this.emit('events.connected');
        resolve(true);
      });

      this.eventSocket.on('message', (data) => {
        try {
          const event = JSON.parse(data);
          this._handleEvent(event);
        } catch (error) {
          this.emit('error', new Error(`Failed to parse event data: ${error.message}`));
        }
      });

      this.eventSocket.on('error', (error) => {
        this.emit('error', error);
        reject(error);
      });

      this.eventSocket.on('close', () => {
        this.eventSocket = null;
        this.emit('events.disconnected');
      });
    });
  }

  /**
   * Disable event streaming
   * @returns {Promise<boolean>} Success status
   */
  async disableEvents() {
    if (this.eventSocket) {
      this.eventSocket.close();
      this.eventSocket = null;
    }
    return true;
  }

  /**
   * Handle incoming WebSocket events
   * @private
   * @param {Object} event - Event data
   */
  _handleEvent(event) {
    if (!event || !event.meta) return;

    const eventType = event.meta.message;
    const eventData = event.data || {};

    // Emit specific event types
    switch (eventType) {
    case 'sta:connect':
      this.emit('client.connected', eventData);
      break;
    case 'sta:disconnect':
      this.emit('client.disconnected', eventData);
      break;
    case 'ap:detected':
      this.emit('device.detected', eventData);
      break;
    case 'ap:lost':
      this.emit('device.lost', eventData);
      break;
    default:
      this.emit('event', { type: eventType, data: eventData });
    }

    // Always emit the raw event
    this.emit('raw_event', event);
  }

  /**
   * Get controller information
   * @returns {Promise<Object>} Controller info
   */
  async getControllerInfo() {
    return this._request('/api/self');
  }

  /**
   * Get site information
   * @returns {Promise<Array>} Array of site objects
   */
  async getSites() {
    return this._request('/api/self/sites');
  }

  /**
   * Get alerts
   * @returns {Promise<Array>} Array of alert objects
   */
  async getAlerts() {
    return this._request(`/api/s/${this.options.site}/list/alarm`);
  }

  /**
   * Archive an alert
   * @param {string} id - Alert ID
   * @returns {Promise<boolean>} Success status
   */
  async archiveAlert(id) {
    await this._request(`/api/s/${this.options.site}/cmd/evtmgr`, 'POST', {
      cmd: 'archive-alarm',
      _id: id
    });
    return true;
  }
}

module.exports = UniFiAPI;
