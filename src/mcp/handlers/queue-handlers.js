import { logger } from '../../utils/logger.js'

export class QueueHandlers {
  constructor(connectionManager) {
    this.connectionManager = connectionManager
  }

  async handleListQueues(args) {
    try {
      const queues = await this.connectionManager.listQueues(args.connectionId)
      logger.info(`Listed ${queues.length} queues for connection '${args.connectionId}'`)
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              connectionId: args.connectionId,
              queues,
              count: queues.length,
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ]
      }
    } catch (error) {
      logger.error(`Failed to list queues: ${error.message}`)
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: error.message,
              connectionId: args.connectionId
            }, null, 2)
          }
        ],
        isError: true
      }
    }
  }

  async handleQueueInfo(args) {
    try {
      const info = await this.connectionManager.getQueueInfo(args.connectionId, args.queueName)
      logger.info(`Retrieved info for queue '${args.queueName}' on connection '${args.connectionId}'`)
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              connectionId: args.connectionId,
              queueName: args.queueName,
              info,
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ]
      }
    } catch (error) {
      logger.error(`Failed to get queue info: ${error.message}`)
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: error.message,
              connectionId: args.connectionId,
              queueName: args.queueName
            }, null, 2)
          }
        ],
        isError: true
      }
    }
  }

  async handleSendMessage(args) {
    try {
      logger.info(`Sending message to '${args.destination}' on connection '${args.connectionId}'`)
      
      const client = this.connectionManager.getConnection(args.connectionId)
      await client.sendMessage(args.destination, args.message, args.headers || {})
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              connectionId: args.connectionId,
              destination: args.destination,
              message: typeof args.message === 'string' ? args.message.substring(0, 100) + (args.message.length > 100 ? '...' : '') : args.message,
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ]
      }
    } catch (error) {
      logger.error(`Failed to send message: ${error.message}`)
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: error.message,
              connectionId: args.connectionId,
              destination: args.destination
            }, null, 2)
          }
        ],
        isError: true
      }
    }
  }

  async handleConsumeMessage(args) {
    try {
      logger.info(`Consuming message from queue '${args.queueName}' on connection '${args.connectionId}'`)
      
      const client = this.connectionManager.getConnection(args.connectionId)
      const message = await client.receiveMessage(
        `/queue/${args.queueName}`, 
        args.timeout || 5000,
        args.autoAck !== false
      )
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              connectionId: args.connectionId,
              queueName: args.queueName,
              message,
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ]
      }
    } catch (error) {
      logger.error(`Failed to consume message: ${error.message}`)
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: error.message,
              connectionId: args.connectionId,
              queueName: args.queueName
            }, null, 2)
          }
        ],
        isError: true
      }
    }
  }

  async handleBrowseMessages(args) {
    try {
      logger.info(`Browsing messages in queue '${args.queueName}' on connection '${args.connectionId}'`)
      
      const client = this.connectionManager.getConnection(args.connectionId)
      const messages = await client.browseMessages(`/queue/${args.queueName}`, args.limit || 10)
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              connectionId: args.connectionId,
              queueName: args.queueName,
              messages,
              count: messages.length,
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ]
      }
    } catch (error) {
      logger.error(`Failed to browse messages: ${error.message}`)
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: error.message,
              connectionId: args.connectionId,
              queueName: args.queueName
            }, null, 2)
          }
        ],
        isError: true
      }
    }
  }

  async handlePurgeQueue(args) {
    try {
      if (!args.confirm) {
        throw new Error('Confirmation required - set confirm to true to proceed with queue purge')
      }
      
      logger.info(`Purging queue '${args.queueName}' on connection '${args.connectionId}'`)
      
      const client = this.connectionManager.getConnection(args.connectionId)
      const result = await client.purgeQueue(args.queueName)
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              connectionId: args.connectionId,
              queueName: args.queueName,
              result,
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ]
      }
    } catch (error) {
      logger.error(`Failed to purge queue: ${error.message}`)
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: error.message,
              connectionId: args.connectionId,
              queueName: args.queueName
            }, null, 2)
          }
        ],
        isError: true
      }
    }
  }
}