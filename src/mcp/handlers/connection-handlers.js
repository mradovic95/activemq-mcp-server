import { logger } from '../../utils/logger.js'

export class ConnectionHandlers {
  constructor(connectionManager) {
    this.connectionManager = connectionManager
  }

  async handleListConnections() {
    try {
      const connections = this.connectionManager.listConnections()
      logger.info(`Listed ${connections.length} active connections`)
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              connections,
              total: connections.length,
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ]
      }
    } catch (error) {
      logger.error(`Failed to list connections: ${error.message}`)
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: error.message
            }, null, 2)
          }
        ],
        isError: true
      }
    }
  }

  async handleAddConnection(args) {
    try {
      logger.info(`Adding connection '${args.connectionId}' to ${args.host}:${args.port || 61613}`)
      
      const config = {
        host: args.host || 'localhost',
        port: args.port || 61613,
        username: args.username || '',
        password: args.password || '',
        maxReconnectAttempts: args.maxReconnectAttempts || 5,
        reconnectDelay: args.reconnectDelay || 5000
      }

      await this.connectionManager.addConnection(args.connectionId, config)
      logger.info(`Successfully added connection: ${args.connectionId}`)
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              connectionId: args.connectionId,
              config: { ...config, password: config.password ? '***' : '' },
              message: `Connection '${args.connectionId}' added successfully`
            }, null, 2)
          }
        ]
      }
    } catch (error) {
      logger.error(`Failed to add connection: ${error.message}`)
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

  async handleRemoveConnection(args) {
    try {
      logger.info(`Removing connection '${args.connectionId}'`)
      await this.connectionManager.removeConnection(args.connectionId)
      logger.info(`Successfully removed connection '${args.connectionId}'`)
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              connectionId: args.connectionId,
              message: `Connection '${args.connectionId}' removed successfully`
            }, null, 2)
          }
        ]
      }
    } catch (error) {
      logger.error(`Failed to remove connection: ${error.message}`)
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

  async handleTestConnection(args) {
    try {
      logger.info(`Testing connection to ${args.host}:${args.port || 61613}`)
      
      const config = {
        host: args.host || 'localhost',
        port: args.port || 61613,
        username: args.username || '',
        password: args.password || ''
      }

      const result = await this.connectionManager.testConnection(config)
      logger.info(`Connection test result: ${result.success ? 'success' : 'failed'}`)
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      }
    } catch (error) {
      logger.error(`Connection test failed: ${error.message}`)
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: error.message
            }, null, 2)
          }
        ],
        isError: true
      }
    }
  }

  async handleConnectionInfo(args) {
    try {
      logger.info(`Getting info for connection '${args.connectionId}'`)
      const info = this.connectionManager.getConnectionInfo(args.connectionId)
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              connectionId: args.connectionId,
              info
            }, null, 2)
          }
        ]
      }
    } catch (error) {
      logger.error(`Failed to get connection info: ${error.message}`)
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

  async handleHealthStatus() {
    try {
      const status = await this.connectionManager.getHealthStatus()
      logger.info('Retrieved health status for all connections')
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              status,
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ]
      }
    } catch (error) {
      logger.error(`Failed to get health status: ${error.message}`)
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: error.message
            }, null, 2)
          }
        ],
        isError: true
      }
    }
  }
}