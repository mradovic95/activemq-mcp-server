import { CoreClient } from '../client/index.js';
import { ConnectionService } from './connection-service.js';
import { QueueService } from './queue-service.js';
import { TopicService } from './topic-service.js';
import { BrokerService } from './broker-service.js';
import { logger } from '../../utils/logger.js';

export class ActiveMQFacade {
  constructor(config) {
    if (!config) {
      throw new Error('Configuration is required');
    }

    // Create the shared core client
    this.core = new CoreClient(config);

    // Create domain services that operate on the shared core
    this.connectionService = new ConnectionService(this.core);
    this.queueService = new QueueService(this.core);
    this.topicService = new TopicService(this.core);
    this.brokerService = new BrokerService(this.core);

    logger.debug('ActiveMQFacade created with core + services architecture', {
      host: config.host,
      port: config.port
    });
  }

  // Connection methods - delegate to connection service
  async connect() {
    return await this.connectionService.connect();
  }

  async disconnect() {
    return await this.connectionService.disconnect();
  }

  async testConnection() {
    return await this.connectionService.testConnection();
  }

  isConnected() {
    return this.connectionService.isConnected();
  }

  getConnectionInfo() {
    return this.connectionService.getConnectionInfo();
  }

  // Queue methods - delegate to queue service
  async sendMessage(destination, message, headers = {}) {
    return await this.queueService.sendMessage(destination, message, headers);
  }

  async consumeMessage(destination, options = {}) {
    return await this.queueService.consumeMessage(destination, options);
  }

  async browseMessages(queueName, limit = 10) {
    return await this.queueService.browseMessages(queueName, limit);
  }

  async purgeQueue(queueName) {
    return await this.queueService.purgeQueue(queueName);
  }

  async getQueueInfo(queueName) {
    return await this.queueService.getQueueInfo(queueName);
  }

  async listQueues() {
    return await this.queueService.listQueues();
  }

  // Topic methods - delegate to topic service
  async publishMessage(topicName, message, headers = {}) {
    return await this.topicService.publishMessage(topicName, message, headers);
  }

  async subscribeToTopic(topicName, options = {}) {
    return await this.topicService.subscribeToTopic(topicName, options);
  }

  async listTopics() {
    return await this.topicService.listTopics();
  }

  // Broker methods - delegate to broker service
  async getBrokerInfo() {
    return await this.brokerService.getBrokerInfo();
  }

  async getBrokerHealth() {
    return await this.brokerService.getBrokerHealth();
  }

  async getBrokerStats() {
    return await this.brokerService.getBrokerStats();
  }

  // Utility methods - delegate to connection service
  async getBrokerName() {
    return await this.connectionService.getBrokerName();
  }

  parseDestination(destination) {
    return this.connectionService.parseDestination(destination);
  }

  cleanDestinationName(destination) {
    return this.connectionService.cleanDestinationName(destination);
  }
}
