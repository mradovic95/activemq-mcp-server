import { ActiveMQFacade as ActiveMQFacade } from './service/activemq-facade.js';
import { Connection } from './connection.js';
import { logger } from '../utils/logger.js';

export class ConnectionManager {
  constructor() {
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

    let activemqFacade;
    try {
      activemqFacade = new ActiveMQFacade(config);
    } catch (error) {
      logger.error('Failed to create ActiveMQ activemqFacade', {
        connectionId,
        error: error.message
      });
      throw error;
    }

    // Connection created without event listeners

    try {
      await activemqFacade.connect();
      const connection = new Connection(connectionId, activemqFacade, config);
      this.connections.set(connectionId, connection);

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

    await connection.disconnect();

    this.connections.delete(connectionId);

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

    if (!connection.isConnected()) {
      logger.warn('Connection is not active', { connectionId });
      throw new Error(`Connection '${connectionId}' is not active`);
    }

    return connection.getFacade();
  }

  listConnections() {
    const connections = [];

    for (const [connectionId, connection] of this.connections) {
      connections.push(connection.getConnectionInfo());
    }

    return connections;
  }

  getConnectionInfo(connectionId) {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection '${connectionId}' not found`);
    }

    return connection.getConnectionInfo();
  }

  async sendMessage(connectionId, destination, message, headers = {}) {
    const activemqFacade = this.getConnection(connectionId);
    return await activemqFacade.sendMessage(destination, message, headers);
  }

  async consumeMessage(connectionId, destination, options = {}) {
    const activemqFacade = this.getConnection(connectionId);
    return await activemqFacade.consumeMessage(destination, options);
  }

  async getQueueInfo(connectionId, queueName) {
    const activemqFacade = this.getConnection(connectionId);
    return await activemqFacade.getQueueInfo(queueName);
  }

  async listQueues(connectionId) {
    const activemqFacade = this.getConnection(connectionId);
    return await activemqFacade.listQueues();
  }

  async listTopics(connectionId) {
    const activemqFacade = this.getConnection(connectionId);
    return await activemqFacade.listTopics();
  }

  async browseMessages(connectionId, queueName, limit = 10) {
    const activemqFacade = this.getConnection(connectionId);
    return await activemqFacade.browseMessages(queueName, limit);
  }

  async purgeQueue(connectionId, queueName) {
    const activemqFacade = this.getConnection(connectionId);
    return await activemqFacade.purgeQueue(queueName);
  }

  async getBrokerInfo(connectionId) {
    const activemqFacade = this.getConnection(connectionId);
    return await activemqFacade.getBrokerInfo();
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
      await connection.performHealthCheck();
    }
  }

  async disconnectAll() {
    const disconnectPromises = [];

    for (const [connectionId, connection] of this.connections) {
      disconnectPromises.push(connection.disconnect());
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
      const isHealthy = connection.isHealthy();

      if (isHealthy) {
        status.healthyConnections++;
      } else {
        status.unhealthyConnections++;
      }

      status.connections[connectionId] = connection.getHealthStatus();
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

    const testFacade = new ActiveMQFacade(config);

    try {
      await testFacade.connect();
      const brokerInfo = await testFacade.getBrokerInfo();
      await testFacade.disconnect();

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
      const config = connection.getConfig();
      exports[connectionId] = {
        host: config.host,
        port: config.port,
        username: config.username,
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
        const brokerInfo = await connection.getFacade().getBrokerInfo();
        stats.brokers[connectionId] = brokerInfo;

        if (connection.isHealthy()) {
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
