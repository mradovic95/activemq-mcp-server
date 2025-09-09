import { logger } from '../../utils/logger.js'
import { configManager } from '../../utils/config.js'

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

  async handleConnectBroker(args) {
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

  async handleConnectFromConfig(args) {
    try {
      const configName = args.configName || 'default'
      const connectionId = args.connectionId || configName
      
      logger.info(`Connecting to ActiveMQ broker using config '${configName}' as connection '${connectionId}'`)
      
      const config = configManager.getConnectionConfig(configName)
      if (!config) {
        throw new Error(`Configuration '${configName}' not found in config file`)
      }

      configManager.validateConnectionConfig(config)
      
      const connectionConfig = {
        host: config.host,
        port: config.port || 61613,
        username: config.username || '',
        password: config.password || '',
        ssl: config.ssl || false
      }
      
      await this.connectionManager.addConnection(connectionId, connectionConfig)
      logger.info(`Successfully connected to ActiveMQ broker using config '${configName}': ${connectionId}`)
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              connectionId: connectionId,
              configUsed: configName,
              config: { ...connectionConfig, password: connectionConfig.password ? '***' : '' },
              message: `Successfully connected to ActiveMQ broker as '${connectionId}' using config '${configName}'`
            }, null, 2)
          }
        ]
      }
    } catch (error) {
      logger.error(`Failed to connect using config: ${error.message}`)
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: error.message,
              configName: args.configName || 'default'
            }, null, 2)
          }
        ],
        isError: true
      }
    }
  }

  async handleShowConfig() {
    try {
      const configuredConnections = configManager.getConfiguredConnections()
      
      if (configuredConnections.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                configurations: [],
                message: "No ActiveMQ broker configurations found in config file. Add configurations to use connect_from_config."
              }, null, 2)
            }
          ]
        }
      }

      const configs = {}
      for (const name of configuredConnections) {
        const config = configManager.getConnectionConfig(name)
        configs[name] = {
          host: config.host,
          port: config.port || 61613,
          username: config.username || '',
          ssl: config.ssl || false,
          hasPassword: !!config.password
        }
      }

      logger.info(`Showing ${configuredConnections.length} ActiveMQ broker configuration(s)`)
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              configurations: configs,
              total: configuredConnections.length,
              message: `Found ${configuredConnections.length} ActiveMQ broker configuration${configuredConnections.length === 1 ? '' : 's'} available for use with connect_from_config`
            }, null, 2)
          }
        ]
      }
    } catch (error) {
      logger.error(`Failed to show configurations: ${error.message}`)
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