import { logger } from '../../utils/logger.js'

export class TopicHandlers {
  constructor(connectionManager) {
    this.connectionManager = connectionManager
  }

  async handleListTopics(args) {
    try {
      const topics = await this.connectionManager.listTopics(args.connectionId)
      logger.info(`Listed ${topics.length} topics for connection '${args.connectionId}'`)
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              connectionId: args.connectionId,
              topics,
              count: topics.length,
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ]
      }
    } catch (error) {
      logger.error(`Failed to list topics: ${error.message}`)
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

  async handlePublishMessage(args) {
    try {
      logger.info(`Publishing message to topic '${args.topicName}' on connection '${args.connectionId}'`)
      
      const client = this.connectionManager.getConnection(args.connectionId)
      await client.publishMessage(args.topicName, args.message, args.headers || {})
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              connectionId: args.connectionId,
              topicName: args.topicName,
              message: typeof args.message === 'string' ? args.message.substring(0, 100) + (args.message.length > 100 ? '...' : '') : args.message,
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ]
      }
    } catch (error) {
      logger.error(`Failed to publish message: ${error.message}`)
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: error.message,
              connectionId: args.connectionId,
              topicName: args.topicName
            }, null, 2)
          }
        ],
        isError: true
      }
    }
  }

  async handleSubscribeTopic(args) {
    try {
      logger.info(`Subscribing to topic '${args.topicName}' on connection '${args.connectionId}'`)
      
      const client = this.connectionManager.getConnection(args.connectionId)
      const messages = await client.subscribeToTopic(
        args.topicName,
        {
          timeout: args.timeout || 10000,
          maxMessages: args.maxMessages || 1
        }
      )
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              connectionId: args.connectionId,
              topicName: args.topicName,
              messages,
              count: messages.length,
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ]
      }
    } catch (error) {
      logger.error(`Failed to subscribe to topic: ${error.message}`)
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: error.message,
              connectionId: args.connectionId,
              topicName: args.topicName
            }, null, 2)
          }
        ],
        isError: true
      }
    }
  }
}