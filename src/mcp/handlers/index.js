import { ConnectionManager } from '../../activemq/connection-manager.js'
import { logger } from '../../utils/logger.js'
import { ConnectionHandlers } from './connection-handlers.js'
import { QueueHandlers } from './queue-handlers.js'
import { TopicHandlers } from './topic-handlers.js'
import { BrokerHandlers } from './broker-handlers.js'

export class ToolHandlers {
  constructor() {
    this.connectionManager = new ConnectionManager()
    
    // Initialize all handler classes
    this.connectionHandlers = new ConnectionHandlers(this.connectionManager)
    this.queueHandlers = new QueueHandlers(this.connectionManager)
    this.topicHandlers = new TopicHandlers(this.connectionManager)
    this.brokerHandlers = new BrokerHandlers(this.connectionManager)
  }

  async handleTool(name, args) {
    try {
      switch (name) {
        // Connection Management Tools
        case 'list_connections':
          return await this.connectionHandlers.handleListConnections(args)
        case 'connect_broker':
          return await this.connectionHandlers.handleConnectBroker(args)
        case 'connect_from_config':
          return await this.connectionHandlers.handleConnectFromConfig(args)
        case 'show_config':
          return await this.connectionHandlers.handleShowConfig(args)
        case 'remove_connection':
          return await this.connectionHandlers.handleRemoveConnection(args)
        case 'test_connection':
          return await this.connectionHandlers.handleTestConnection(args)
        case 'connection_info':
          return await this.connectionHandlers.handleConnectionInfo(args)
        case 'health_status':
          return await this.connectionHandlers.handleHealthStatus(args)

        // Queue Management Tools
        case 'list_queues':
          return await this.queueHandlers.handleListQueues(args)
        case 'queue_info':
          return await this.queueHandlers.handleQueueInfo(args)
        case 'send_message':
          return await this.queueHandlers.handleSendMessage(args)
        case 'consume_message':
          return await this.queueHandlers.handleConsumeMessage(args)
        case 'browse_messages':
          return await this.queueHandlers.handleBrowseMessages(args)
        case 'purge_queue':
          return await this.queueHandlers.handlePurgeQueue(args)

        // Topic Management Tools
        case 'list_topics':
          return await this.topicHandlers.handleListTopics(args)
        case 'publish_message':
          return await this.topicHandlers.handlePublishMessage(args)
        case 'subscribe_topic':
          return await this.topicHandlers.handleSubscribeTopic(args)

        // Broker Management Tools
        case 'broker_info':
          return await this.brokerHandlers.handleBrokerInfo(args)
        case 'broker_stats':
          return await this.brokerHandlers.handleBrokerStats(args)
        case 'export_connections':
          return await this.brokerHandlers.handleExportConnections(args)
        case 'import_connections':
          return await this.brokerHandlers.handleImportConnections(args)
        case 'system_status':
          return await this.brokerHandlers.handleSystemStatus(args)

        default:
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  success: false,
                  error: `Unknown tool: ${name}`
                }, null, 2)
              }
            ],
            isError: true
          }
      }
    } catch (error) {
      logger.error(`Tool handler error for ${name}:`, error)
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: `Tool execution failed: ${error.message}`,
              tool: name
            }, null, 2)
          }
        ],
        isError: true
      }
    }
  }

  async cleanup() {
    logger.info('Cleaning up ActiveMQ connections...')
    await this.connectionManager.disconnectAll()
    logger.info('Cleanup completed')
  }
}