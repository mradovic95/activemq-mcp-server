import axios from 'axios';
import { logger } from '../../utils/logger.js';

export class CoreClient {
  constructor(config) {
    if (!config) {
      throw new Error('Configuration is required');
    }

    if (!config.host) {
      throw new Error('Host is required in configuration');
    }

    if (!config.port || typeof config.port !== 'number' || config.port <= 0) {
      throw new Error('Valid port number is required in configuration');
    }

    this.config = {
      host: config.host,
      port: config.port,
      username: config.username || '',
      password: config.password || '',
      baseURL: `http://${config.host}:${config.port}`,
      timeout: config.timeout || 30000
    };

    // Create axios instance with base configuration
    this.httpClient = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      auth: this.config.username ? {
        username: this.config.username,
        password: this.config.password
      } : undefined,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    this.connected = false;
    this._brokerName = null; // Cache broker name
  }

  async getBrokerName() {
    if (this._brokerName) {
      return this._brokerName;
    }

    try {
      const response = await this.httpClient.get('/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=*');
      const brokerData = response.data?.value || {};

      // Extract broker name from response
      for (const key of Object.keys(brokerData)) {
        if (key.includes('brokerName=')) {
          this._brokerName = key.split('brokerName=')[1].split(',')[0];
          logger.debug('Discovered broker name', { brokerName: this._brokerName });
          return this._brokerName;
        }
      }

      // Fallback to localhost if not found
      this._brokerName = 'localhost';
      return this._brokerName;
    } catch (error) {
      logger.warn('Failed to get broker name, using localhost', { error: error.message });
      this._brokerName = 'localhost';
      return this._brokerName;
    }
  }

  parseDestination(destination) {
    let destinationName;
    let destinationType;

    if (destination.startsWith('/queue/')) {
      destinationName = destination.replace('/queue/', '');
      destinationType = 'queue';
    } else if (destination.startsWith('/topic/')) {
      destinationName = destination.replace('/topic/', '');
      destinationType = 'topic';
    } else if (destination.startsWith('queue/')) {
      destinationName = destination.replace('queue/', '');
      destinationType = 'queue';
    } else if (destination.startsWith('topic/')) {
      destinationName = destination.replace('topic/', '');
      destinationType = 'topic';
    } else {
      // Default to queue if no prefix
      destinationName = destination;
      destinationType = 'queue';
    }

    return { destinationName, destinationType };
  }

  cleanDestinationName(destination) {
    return destination.replace('/queue/', '').replace('queue/', '')
                    .replace('/topic/', '').replace('topic/', '');
  }

  async connect() {
    if (this.connected) {
      logger.warn('Already connected to ActiveMQ broker');
      return;
    }

    logger.info('Testing connection to ActiveMQ web console', {
      host: this.config.host,
      port: this.config.port,
      baseURL: this.config.baseURL
    });

    try {
      // Test connection by getting broker info
      await this.httpClient.get('/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=*');

      this.connected = true;
      logger.info('Successfully connected to ActiveMQ web console', {
        host: this.config.host,
        port: this.config.port
      });

      return { success: true, connected: true };
    } catch (error) {
      logger.error('Failed to connect to ActiveMQ web console', {
        host: this.config.host,
        port: this.config.port,
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText
      });

      throw new Error(`Failed to connect to ActiveMQ: ${error.message}`);
    }
  }

  async disconnect() {
    if (this.connected) {
      this.connected = false;
      logger.info('Disconnected from ActiveMQ', {
        host: this.config.host,
        port: this.config.port
      });
    }
    return { success: true, connected: false };
  }

  async testConnection() {
    try {
      await this.httpClient.get('/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=*');
      return { success: true, connected: true };
    } catch (error) {
      logger.error('Connection test failed', {
        host: this.config.host,
        port: this.config.port,
        error: error.message
      });
      return { success: false, connected: false, error: error.message };
    }
  }

  isConnected() {
    return this.connected;
  }

  getConnectionInfo() {
    return {
      host: this.config.host,
      port: this.config.port,
      baseURL: this.config.baseURL,
      connected: this.connected,
      username: this.config.username ? '***' : 'none'
    };
  }
}
