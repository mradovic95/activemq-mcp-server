import { logger } from '../utils/logger.js';

export class Connection {
  constructor(connectionId, activemqFacade, config) {
    this.connectionId = connectionId;
    this.activemqFacade = activemqFacade;
    this.config = config;
    this.createdAt = new Date();
    this.lastHealthCheck = new Date();
    this.healthy = true;
  }

  getConnectionInfo() {
    return {
      connectionId: this.connectionId,
      host: this.config.host,
      port: this.config.port,
      connected: this.activemqFacade.isConnected(),
      healthy: this.healthy,
      createdAt: this.createdAt,
      lastHealthCheck: this.lastHealthCheck,
      activemqFacadeType: 'REST API'
    };
  }

  isConnected() {
    return this.activemqFacade.isConnected();
  }

  isHealthy() {
    return this.healthy && this.isConnected();
  }

  async performHealthCheck() {
    try {
      const brokerInfo = await this.activemqFacade.getBrokerInfo();
      this.healthy = brokerInfo.connected;
      this.lastHealthCheck = new Date();

      logger.debug('Health check passed', {
        connectionId: this.connectionId,
        healthy: this.healthy
      });

      return { success: true, healthy: this.healthy };
    } catch (error) {
      this.healthy = false;
      this.lastHealthCheck = new Date();

      logger.warn('Health check failed', {
        connectionId: this.connectionId,
        error: error.message
      });

      return { success: false, error: error.message, healthy: false };
    }
  }

  async disconnect() {
    try {
      await this.activemqFacade.disconnect();
      logger.info('Connection disconnected successfully', {
        connectionId: this.connectionId
      });
      return { success: true };
    } catch (error) {
      logger.error('Failed to disconnect', {
        connectionId: this.connectionId,
        error: error.message
      });
      return { success: false, error: error.message };
    }
  }

  getHealthStatus() {
    return {
      connectionId: this.connectionId,
      healthy: this.isHealthy(),
      connected: this.isConnected(),
      lastHealthCheck: this.lastHealthCheck,
      host: this.config.host,
      port: this.config.port
    };
  }

  getFacade() {
    return this.activemqFacade;
  }

  getConfig() {
    return { ...this.config };
  }
}
