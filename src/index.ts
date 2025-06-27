import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import * as https from 'https';
import WebSocket from 'ws';
import { EventEmitter } from 'events';

/**
 * Configuration options for the UniFi API client
 */
export interface UniFiConfig {
  /** UniFi Controller hostname or IP address */
  host: string;
  /** UniFi Controller port (default: 8443) */
  port?: number;
  /** Controller username */
  username: string;
  /** Controller password */
  password: string;
  /** Site name (default: 'default') */
  site?: string;
  /** Use HTTPS (default: true) */
  ssl?: boolean;
  /** Strict SSL certificate validation (default: false) */
  strictSSL?: boolean;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
}

/**
 * UniFi API response wrapper
 */
export interface UniFiResponse<T = any> {
  meta: {
    rc: string;
    msg?: string;
    csrf_token?: string;
  };
  data: T;
}

/**
 * Device information from UniFi Controller
 */
export interface UniFiDevice {
  _id: string;
  mac: string;
  name?: string;
  model: string;
  type: string;
  state: number;
  ip: string;
  version?: string;
  uptime?: number;
  adopted: boolean;
  site_id: string;
  cfgversion?: string;
  config_network?: any;
  radio_table?: UniFiRadio[];
  port_table?: UniFiPort[];
  stat_sw?: UniFiSwitchStats;
  system_stats?: UniFiSystemStats;
  general_temperature?: number;
  num_sta?: number;
  satisfaction?: number;
  upgradable?: boolean;
  upgrade_to_firmware?: string;
}

/**
 * Radio information for UniFi devices
 */
export interface UniFiRadio {
  name: string;
  radio: string;
  channel: number;
  ht: number;
  tx_power_mode: string;
  min_rssi_enabled: boolean;
  sens_level_enabled: boolean;
}

/**
 * Port information for UniFi switches
 */
export interface UniFiPort {
  port_idx: number;
  media: string;
  port_poe: boolean;
  poe_class: string;
  poe_enable: boolean;
  poe_mode: string;
  poe_power: number;
  poe_voltage: number;
  portconf_id: string;
  autoneg: boolean;
  enable: boolean;
  flowctrl_rx: boolean;
  flowctrl_tx: boolean;
  full_duplex: boolean;
  is_uplink: boolean;
  name: string;
  op_mode: string;
  poe_caps: number;
  speed: number;
  up: boolean;
  rx_bytes: number;
  rx_dropped: number;
  rx_errors: number;
  rx_packets: number;
  tx_bytes: number;
  tx_dropped: number;
  tx_errors: number;
  tx_packets: number;
}

/**
 * Switch statistics
 */
export interface UniFiSwitchStats {
  rx_bytes: number;
  rx_packets: number;
  tx_bytes: number;
  tx_packets: number;
}

/**
 * System statistics
 */
export interface UniFiSystemStats {
  cpu?: number;
  mem?: number;
  uptime?: number;
}

/**
 * Client information from UniFi Controller
 */
export interface UniFiClient {
  _id: string;
  mac: string;
  ip: string;
  hostname?: string;
  name?: string;
  oui?: string;
  is_wired: boolean;
  is_guest: boolean;
  first_seen: number;
  last_seen: number;
  uptime: number;
  rx_bytes: number;
  rx_packets: number;
  tx_bytes: number;
  tx_packets: number;
  rssi?: number;
  signal?: number;
  noise?: number;
  channel?: number;
  radio?: string;
  ap_mac?: string;
  authorized: boolean;
  blocked: boolean;
  satisfaction?: number;
  os_name?: string;
  device_name?: string;
}

/**
 * Network configuration
 */
export interface UniFiNetwork {
  _id: string;
  name: string;
  purpose: string;
  vlan?: number;
  ip_subnet?: string;
  dhcpd_enabled: boolean;
  dhcpd_start?: string;
  dhcpd_stop?: string;
  dhcpd_gateway?: string;
  dhcpd_dns?: string[];
  networkgroup?: string;
  site_id: string;
}

/**
 * Site information
 */
export interface UniFiSite {
  _id: string;
  name: string;
  desc: string;
  role: string;
  attr_hidden_id?: string;
  attr_no_delete?: boolean;
}

/**
 * System information
 */
export interface UniFiSystemInfo {
  uptime: number;
  loadavg_1: number;
  loadavg_5: number;
  loadavg_15: number;
  mem_used: number;
  mem_buffer: number;
  mem_total: number;
  general_temperature?: number;
}

/**
 * Alert information
 */
export interface UniFiAlert {
  _id: string;
  key: string;
  msg: string;
  time: number;
  datetime: string;
  site_id: string;
  site_name?: string;
  subsystem?: string;
  categ_id: number;
  is_admin: boolean;
  handled_admin_id?: string;
  handled_time?: number;
}

/**
 * Controller information
 */
export interface UniFiControllerInfo {
  build: string;
  version: string;
  uuid: string;
  update_available: boolean;
  update_downloaded: boolean;
}

/**
 * WebSocket event data
 */
export interface UniFiEvent {
  meta: {
    message: string;
    product_line?: string;
  };
  data: any;
}

/**
 * Custom error with error code
 */
export class UniFiError extends Error {
  public code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'UniFiError';
    this.code = code;
  }
}

/**
 * UniFi API Client for controlling Ubiquiti UniFi hardware
 */
export class UniFiAPI extends EventEmitter {
  private options: Required<UniFiConfig>;
  private baseURL: string;
  private cookies: string = '';
  private csrfToken: string = '';
  private client: AxiosInstance;
  private eventSocket: WebSocket | null = null;

  public isAuthenticated: boolean = false;

  /**
   * Create a UniFi API instance
   */
  constructor(options: UniFiConfig) {
    super();

    // Set defaults and merge with provided options
    this.options = {
      port: 8443,
      site: 'default',
      ssl: true,
      strictSSL: false,
      timeout: 30000,
      ...options
    };

    if (!this.options.host || !this.options.username || !this.options.password) {
      throw new UniFiError('Host, username, and password are required');
    }

    this.baseURL = `${this.options.ssl ? 'https' : 'http'}://${this.options.host}:${this.options.port}`;

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

    this.setupInterceptors();
  }

  /**
   * Setup axios interceptors for request/response handling
   */
  private setupInterceptors(): void {
    // Request interceptor to include cookies and CSRF token
    this.client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      if (this.cookies && config.headers) {
        config.headers.Cookie = this.cookies;
      }
      if (this.csrfToken && config.headers) {
        config.headers['X-Csrf-Token'] = this.csrfToken;
      }
      return config;
    });

    // Response interceptor to handle cookies and errors
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        // Extract cookies from response
        if (response.headers['set-cookie']) {
          this.cookies = response.headers['set-cookie']
            .map((cookie: string) => cookie.split(';')[0])
            .join('; ');
        }
        return response;
      },
      (error) => {
        if (error.response?.status === 401) {
          this.isAuthenticated = false;
          throw new UniFiError('Authentication failed', 'INVALID_CREDENTIALS');
        }
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          throw new UniFiError(`Cannot connect to UniFi Controller at ${this.baseURL}`, 'CONNECTION_ERROR');
        }
        throw error;
      }
    );
  }

  /**
   * Authenticate with the UniFi Controller
   */
  public async login(): Promise<boolean> {
    try {
      const response = await this.client.post<UniFiResponse>('/api/login', {
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
        throw new UniFiError('Authentication failed: Invalid response');
      }
    } catch (error) {
      this.isAuthenticated = false;
      throw error;
    }
  }

  /**
   * End the session with the UniFi Controller
   */
  public async logout(): Promise<boolean> {
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
   */
  private async ensureAuthenticated(): Promise<void> {
    if (!this.isAuthenticated) {
      await this.login();
    }
  }

  /**
   * Make an authenticated API request
   */
  private async request<T = any>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET',
    data?: any
  ): Promise<T> {
    await this.ensureAuthenticated();

    const config: any = {
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
      throw new UniFiError(`API Error: ${response.data?.meta?.msg || 'Unknown error'}`);
    }
  }

  /**
   * Get all devices in the site
   */
  public async getDevices(): Promise<UniFiDevice[]> {
    return this.request<UniFiDevice[]>(`/api/s/${this.options.site}/stat/device`);
  }

  /**
   * Get a specific device by MAC address
   */
  public async getDevice(mac: string): Promise<UniFiDevice> {
    const devices = await this.getDevices();
    const device = devices.find(d => d.mac.toLowerCase() === mac.toLowerCase());
    if (!device) {
      throw new UniFiError(`Device with MAC ${mac} not found`);
    }
    return device;
  }

  /**
   * Restart a device
   */
  public async restartDevice(mac: string): Promise<boolean> {
    await this.request(`/api/s/${this.options.site}/cmd/devmgr`, 'POST', {
      cmd: 'restart',
      mac
    });
    return true;
  }

  /**
   * Adopt a device
   */
  public async adoptDevice(mac: string): Promise<boolean> {
    await this.request(`/api/s/${this.options.site}/cmd/devmgr`, 'POST', {
      cmd: 'adopt',
      mac
    });
    return true;
  }

  /**
   * Forget/remove a device
   */
  public async forgetDevice(mac: string): Promise<boolean> {
    await this.request(`/api/s/${this.options.site}/cmd/devmgr`, 'POST', {
      cmd: 'forget',
      mac
    });
    return true;
  }

  /**
   * Get all connected clients
   */
  public async getClients(): Promise<UniFiClient[]> {
    return this.request<UniFiClient[]>(`/api/s/${this.options.site}/stat/sta`);
  }

  /**
   * Get a specific client by MAC address
   */
  public async getClient(mac: string): Promise<UniFiClient> {
    const clients = await this.getClients();
    const client = clients.find(c => c.mac.toLowerCase() === mac.toLowerCase());
    if (!client) {
      throw new UniFiError(`Client with MAC ${mac} not found`);
    }
    return client;
  }

  /**
   * Block a client
   */
  public async blockClient(mac: string): Promise<boolean> {
    await this.request(`/api/s/${this.options.site}/cmd/stamgr`, 'POST', {
      cmd: 'block-sta',
      mac
    });
    return true;
  }

  /**
   * Unblock a client
   */
  public async unblockClient(mac: string): Promise<boolean> {
    await this.request(`/api/s/${this.options.site}/cmd/stamgr`, 'POST', {
      cmd: 'unblock-sta',
      mac
    });
    return true;
  }

  /**
   * Force client reconnection
   */
  public async reconnectClient(mac: string): Promise<boolean> {
    await this.request(`/api/s/${this.options.site}/cmd/stamgr`, 'POST', {
      cmd: 'kick-sta',
      mac
    });
    return true;
  }

  /**
   * Get network configurations
   */
  public async getNetworks(): Promise<UniFiNetwork[]> {
    return this.request<UniFiNetwork[]>(`/api/s/${this.options.site}/rest/networkconf`);
  }

  /**
   * Create a new network
   */
  public async createNetwork(config: Partial<UniFiNetwork>): Promise<UniFiNetwork> {
    return this.request<UniFiNetwork>(`/api/s/${this.options.site}/rest/networkconf`, 'POST', config);
  }

  /**
   * Update network configuration
   */
  public async updateNetwork(id: string, config: Partial<UniFiNetwork>): Promise<UniFiNetwork> {
    return this.request<UniFiNetwork>(`/api/s/${this.options.site}/rest/networkconf/${id}`, 'PUT', config);
  }

  /**
   * Delete a network
   */
  public async deleteNetwork(id: string): Promise<boolean> {
    await this.request(`/api/s/${this.options.site}/rest/networkconf/${id}`, 'DELETE');
    return true;
  }

  /**
   * Get system statistics
   */
  public async getSystemStats(): Promise<UniFiSystemInfo[]> {
    return this.request<UniFiSystemInfo[]>(`/api/s/${this.options.site}/stat/sysinfo`);
  }

  /**
   * Get device-specific statistics
   */
  public async getDeviceStats(mac: string): Promise<UniFiDevice | null> {
    const devices = await this.request<UniFiDevice[]>(`/api/s/${this.options.site}/stat/device/${mac}`);
    return devices[0] || null;
  }

  /**
   * Get client-specific statistics
   */
  public async getClientStats(mac: string): Promise<UniFiClient | null> {
    const clients = await this.request<UniFiClient[]>(`/api/s/${this.options.site}/stat/user/${mac}`);
    return clients[0] || null;
  }

  /**
   * Enable real-time event streaming via WebSocket
   */
  public async enableEvents(): Promise<boolean> {
    await this.ensureAuthenticated();

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
      if (!this.eventSocket) {
        reject(new UniFiError('Failed to create WebSocket connection'));
        return;
      }

      this.eventSocket.on('open', () => {
        this.emit('events.connected');
        resolve(true);
      });

      this.eventSocket.on('message', (data: WebSocket.Data) => {
        try {
          const event: UniFiEvent = JSON.parse(data.toString());
          this.handleEvent(event);
        } catch (error) {
          this.emit('error', new UniFiError(`Failed to parse event data: ${(error as Error).message}`));
        }
      });

      this.eventSocket.on('error', (error: Error) => {
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
   */
  public async disableEvents(): Promise<boolean> {
    if (this.eventSocket) {
      this.eventSocket.close();
      this.eventSocket = null;
    }
    return true;
  }

  /**
   * Handle incoming WebSocket events
   */
  private handleEvent(event: UniFiEvent): void {
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
   */
  public async getControllerInfo(): Promise<UniFiControllerInfo> {
    return this.request<UniFiControllerInfo>('/api/self');
  }

  /**
   * Get site information
   */
  public async getSites(): Promise<UniFiSite[]> {
    return this.request<UniFiSite[]>('/api/self/sites');
  }

  /**
   * Get alerts
   */
  public async getAlerts(): Promise<UniFiAlert[]> {
    return this.request<UniFiAlert[]>(`/api/s/${this.options.site}/list/alarm`);
  }

  /**
   * Archive an alert
   */
  public async archiveAlert(id: string): Promise<boolean> {
    await this.request(`/api/s/${this.options.site}/cmd/evtmgr`, 'POST', {
      cmd: 'archive-alarm',
      _id: id
    });
    return true;
  }
}

// Export the main class as default
export default UniFiAPI;
