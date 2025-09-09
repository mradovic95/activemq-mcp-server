import { ActiveMQClient } from './activemq-client.js';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';

export class ConnectionManager extends EventEmitter {
  constructor() {
    super();
    this.connections = new Map();
    this.healthCheckInterval = 30000; // 30 seconds
    this.healthCheckTimer = null;
    this.startHealthCheck();
  }

  async addConnection(connectionId, config) {
    if (!connectionId || typeof connectionId !== 'string') {
      throw new Error('Connection ID must be a non-empty string');
    }

    if (this.connections.has(connectionId)) {
      throw new Error(`Connection '${connectionId}' already exists`);
    }

    logger.info('Adding new connection', { 
      connectionId, 
      host: config?.host, 
      port: config?.port 
    });

    let client;
    try {
      client = new ActiveMQClient(config);
    } catch (error) {
      logger.error('Failed to create ActiveMQ client', { 
        connectionId, 
        error: error.message 
      });
      throw error;
    }
    
    client.on('connected', () => {
      this.emit('connection_established', connectionId);
    });

    client.on('error', (error) => {
      this.emit('connection_error', connectionId, error);
    });

    client.on('disconnect', () => {
      this.emit('connection_lost', connectionId);
    });

    client.on('reconnect_failed', (error) => {
      this.emit('reconnect_failed', connectionId, error);
    });

    client.on('reconnect_exhausted', () => {
      this.emit('reconnect_exhausted', connectionId);
    });

    try {
      await client.connect();
      this.connections.set(connectionId, {
        client: client,
        config: config,
        createdAt: new Date(),
        lastHealthCheck: new Date(),
        healthy: true
      });

      logger.info('Connection added successfully', { 
        connectionId, 
        host: config.host, 
        port: config.port 
      });

      return {
        connectionId,
        status: 'connected',
        host: config.host,
        port: config.port
      };
    } catch (error) {
      logger.error('Failed to establish connection', { 
        connectionId, 
        host: config.host, 
        port: config.port,
        error: error.message 
      });
      throw new Error(`Failed to connect to '${connectionId}': ${error.message}`);
    }
  }

  async removeConnection(connectionId) {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection '${connectionId}' not found`);
    }

    try {
      await connection.client.disconnect();
    } catch (error) {
      // Continue with removal even if disconnect fails
    }

    this.connections.delete(connectionId);
    this.emit('connection_removed', connectionId);

    return {
      connectionId,
      status: 'removed'
    };
  }

  getConnection(connectionId) {
    if (!connectionId || typeof connectionId !== 'string') {
      throw new Error('Connection ID must be a non-empty string');
    }

    const connection = this.connections.get(connectionId);
    if (!connection) {
      const available = Array.from(this.connections.keys());
      const message = available.length > 0 
        ? `Connection '${connectionId}' not found. Available connections: ${available.join(', ')}`
        : `Connection '${connectionId}' not found. No connections available.`;
      throw new Error(message);
    }

    if (!connection.client.isConnected()) {
      logger.warn('Connection is not active', { connectionId });
      throw new Error(`Connection '${connectionId}' is not active`);
    }

    return connection.client;
  }

  listConnections() {
    const connections = [];
    
    for (const [connectionId, connection] of this.connections) {
      connections.push({
        connectionId,
        host: connection.config.host,
        port: connection.config.port,
        connected: connection.client.isConnected(),
        healthy: connection.healthy,
        createdAt: connection.createdAt,
        lastHealthCheck: connection.lastHealthCheck
      });
    }

    return connections;
  }

  getConnectionInfo(connectionId) {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection '${connectionId}' not found`);
    }

    return {
      connectionId,
      host: connection.config.host,
      port: connection.config.port,
      connected: connection.client.isConnected(),
      healthy: connection.healthy,
      createdAt: connection.createdAt,
      lastHealthCheck: connection.lastHealthCheck,
      clientType: 'REST API'
    };
  }

  async sendMessage(connectionId, destination, message, headers = {}) {
    const client = this.getConnection(connectionId);
    return await client.sendMessage(destination, message, headers);
  }

  async consumeMessage(connectionId, destination, options = {}) {
    const client = this.getConnection(connectionId);
    return await client.consumeMessage(destination, options);
  }

  async getQueueInfo(connectionId, queueName) {
    const client = this.getConnection(connectionId);
    return await client.getQueueInfo(queueName);
  }

  async listQueues(connectionId) {
    const client = this.getConnection(connectionId);
    return await client.listQueues();
  }

  async listTopics(connectionId) {
    const client = this.getConnection(connectionId);
    return await client.listTopics();
  }

  async browseMessages(connectionId, queueName, limit = 10) {
    const client = this.getConnection(connectionId);
    return await client.browseMessages(queueName, limit);
  }

  async purgeQueue(connectionId, queueName) {
    const client = this.getConnection(connectionId);
    return await client.purgeQueue(queueName);
  }

  async getBrokerInfo(connectionId) {
    const client = this.getConnection(connectionId);
    return await client.getBrokerInfo();
  }

  startHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthCheck();
    }, this.healthCheckInterval);
  }

  stopHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  async performHealthCheck() {
    for (const [connectionId, connection] of this.connections) {
      try {
        const brokerInfo = await connection.client.getBrokerInfo();
        connection.healthy = brokerInfo.connected;
        connection.lastHealthCheck = new Date();
        
        if (!connection.healthy) {
          this.emit('health_check_failed', connectionId);
        }
      } catch (error) {
        connection.healthy = false;
        connection.lastHealthCheck = new Date();
        this.emit('health_check_failed', connectionId, error);
      }
    }
  }

  async disconnectAll() {
    const disconnectPromises = [];
    
    for (const [connectionId, connection] of this.connections) {
      disconnectPromises.push(
        connection.client.disconnect().catch(error => {
          // Log error but don't fail the disconnect all operation
          console.error(`Error disconnecting '${connectionId}':`, error);
        })
      );
    }

    await Promise.allSettled(disconnectPromises);
    this.connections.clear();
    this.stopHealthCheck();
  }

  getHealthStatus() {
    const status = {
      totalConnections: this.connections.size,
      healthyConnections: 0,
      unhealthyConnections: 0,
      connections: {}
    };

    for (const [connectionId, connection] of this.connections) {
      const isHealthy = connection.healthy && connection.client.isConnected();
      
      if (isHealthy) {
        status.healthyConnections++;
      } else {
        status.unhealthyConnections++;
      }

      status.connections[connectionId] = {
        healthy: isHealthy,
        connected: connection.client.isConnected(),
        lastHealthCheck: connection.lastHealthCheck
      };
    }

    return status;
  }

  validateConnectionConfig(config) {
    const errors = [];

    if (!config.host) {
      errors.push('host is required');
    }

    if (!config.port) {
      errors.push('port is required');
    } else if (typeof config.port !== 'number' || config.port <= 0) {
      errors.push('port must be a positive number');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  async testConnection(config) {
    const validation = this.validateConnectionConfig(config);
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }

    const testClient = new ActiveMQClient(config);
    
    try {
      await testClient.connect();
      const brokerInfo = await testClient.getBrokerInfo();
      await testClient.disconnect();
      
      return {
        success: true,
        brokerInfo
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  exportConnections() {
    const exports = {};
    
    for (const [connectionId, connection] of this.connections) {
      exports[connectionId] = {
        host: connection.config.host,
        port: connection.config.port,
        username: connection.config.username,
        // Don't export password for security
        createdAt: connection.createdAt
      };
    }

    return exports;
  }

  async importConnections(connectionsConfig) {
    const results = [];
    
    for (const [connectionId, config] of Object.entries(connectionsConfig)) {
      try {
        await this.addConnection(connectionId, config);
        results.push({
          connectionId,
          status: 'imported',
          success: true
        });
      } catch (error) {
        results.push({
          connectionId,
          status: 'failed',
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  async getBrokerStats() {
    const stats = {
      totalConnections: this.connections.size,
      healthyConnections: 0,
      brokers: {}
    };

    for (const [connectionId, connection] of this.connections) {
      try {
        const brokerInfo = await connection.client.getBrokerInfo();
        stats.brokers[connectionId] = brokerInfo;
        
        if (connection.healthy) {
          stats.healthyConnections++;
        }
      } catch (error) {
        stats.brokers[connectionId] = {
          error: error.message,
          connected: false
        };
      }
    }

    return stats;
  }

  async getSystemStatus() {
    const healthStatus = this.getHealthStatus();
    const brokerStats = await this.getBrokerStats();
    
    return {
      ...healthStatus,
      brokerStats,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
  }
}