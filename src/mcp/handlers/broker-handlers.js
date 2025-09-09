import { logger } from '../../utils/logger.js'

export class BrokerHandlers {
  constructor(connectionManager) {
    this.connectionManager = connectionManager
  }

  async handleBrokerInfo(args) {
    try {
      const info = await this.connectionManager.getBrokerInfo(args.connectionId)
      logger.info(`Retrieved broker info for connection '${args.connectionId}'`)
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              connectionId: args.connectionId,
              brokerInfo: info,
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ]
      }
    } catch (error) {
      logger.error(`Failed to get broker info: ${error.message}`)
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

  async handleBrokerStats() {
    try {
      const stats = await this.connectionManager.getBrokerStats()
      logger.info('Retrieved comprehensive broker statistics')
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              stats,
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ]
      }
    } catch (error) {
      logger.error(`Failed to get broker stats: ${error.message}`)
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

  async handleExportConnections() {
    try {
      const connections = this.connectionManager.exportConnections()
      logger.info(`Exported ${Object.keys(connections).length} connection configurations`)
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              connections,
              exportedAt: new Date().toISOString()
            }, null, 2)
          }
        ]
      }
    } catch (error) {
      logger.error(`Failed to export connections: ${error.message}`)
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

  async handleImportConnections(args) {
    try {
      const results = await this.connectionManager.importConnections(args.connections, args.overwrite)
      logger.info(`Import completed with ${results.filter(r => r.success).length} successful connections`)
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              importResults: results,
              importedAt: new Date().toISOString(),
              summary: {
                total: results.length,
                successful: results.filter(r => r.success).length,
                failed: results.filter(r => !r.success).length
              }
            }, null, 2)
          }
        ]
      }
    } catch (error) {
      logger.error(`Failed to import connections: ${error.message}`)
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

  async handleSystemStatus() {
    try {
      const status = await this.connectionManager.getSystemStatus()
      logger.info('Retrieved system status and performance metrics')
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              systemStatus: status,
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ]
      }
    } catch (error) {
      logger.error(`Failed to get system status: ${error.message}`)
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