import { TOOLS } from './mcp/tools.js'
import { ToolHandlers } from './mcp/handlers/index.js'
import { logger } from './utils/logger.js'

class ActiveMQMCPServer {
  constructor() {
    this.toolHandlers = new ToolHandlers()
    this.setupHandlers()
    this.setupErrorHandlers()
    logger.info('ActiveMQ MCP Server initialized', { toolCount: TOOLS.length })
  }

  setupHandlers() {
    process.stdin.setEncoding('utf8')
    process.stdin.on('readable', () => {
      const chunk = process.stdin.read()
      if (chunk !== null) {
        this.handleInput(chunk)
      }
    })
  }

  handleInput(input) {
    try {
      const lines = input.trim().split('\n')
      
      for (const line of lines) {
        if (line.trim()) {
          logger.debug('Received MCP request', { line })
          const request = JSON.parse(line)
          this.processRequest(request)
        }
      }
    } catch (error) {
      logger.error('Failed to parse MCP request', { 
        input: input.substring(0, 200), 
        error: error.message 
      })
      this.sendError('invalid_request', 'Invalid JSON input', error.message)
    }
  }

  async processRequest(request) {
    const { id, method, params } = request

    logger.debug('Processing MCP request', { id, method, params })

    try {
      switch (method) {
        case 'initialize':
          logger.info('MCP client initializing')
          this.sendResponse(id, {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: 'activemq-mcp-server',
              version: '1.0.0'
            }
          })
          break

        case 'tools/list':
          logger.debug('Listing MCP tools')
          this.sendResponse(id, {
            tools: TOOLS.map(tool => ({
              name: tool.name,
              description: tool.description,
              inputSchema: tool.inputSchema
            }))
          })
          break

        case 'tools/call':
          const toolName = params?.name
          const toolArgs = params?.arguments || {}
          
          if (!toolName) {
            throw new Error('Tool name is required')
          }
          
          logger.info('Executing MCP tool', { tool: toolName, args: toolArgs })
          const result = await this.toolHandlers.handleTool(toolName, toolArgs)
          this.sendResponse(id, result)
          break

        case 'ping':
          logger.debug('MCP ping received')
          this.sendResponse(id, {})
          break

        default:
          logger.warn('Unknown MCP method', { method })
          this.sendError(id, 'method_not_found', `Method '${method}' not found`)
      }
    } catch (error) {
      logger.error('MCP request processing error', { 
        id, 
        method, 
        error: error.message,
        stack: error.stack 
      })
      this.sendError(id, 'internal_error', error.message)
    }
  }

  sendResponse(id, result) {
    const response = {
      jsonrpc: '2.0',
      id,
      result
    }
    process.stdout.write(JSON.stringify(response) + '\n')
  }

  sendError(id, code, message, data = null) {
    const response = {
      jsonrpc: '2.0',
      id,
      error: {
        code: this.getErrorCode(code),
        message,
        data
      }
    }
    process.stdout.write(JSON.stringify(response) + '\n')
  }

  sendNotification(method, params) {
    const notification = {
      jsonrpc: '2.0',
      method,
      params
    }
    process.stdout.write(JSON.stringify(notification) + '\n')
  }

  getErrorCode(code) {
    const codes = {
      'parse_error': -32700,
      'invalid_request': -32600,
      'method_not_found': -32601,
      'invalid_params': -32602,
      'internal_error': -32603
    }
    return codes[code] || -32603
  }

  setupErrorHandlers() {
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully...')
      await this.shutdown()
      process.exit(0)
    })

    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully...')
      await this.shutdown()
      process.exit(0)
    })

    process.on('uncaughtException', async (error) => {
      logger.error('Uncaught exception:', error)
      await this.shutdown()
      process.exit(1)
    })

    process.on('unhandledRejection', async (reason, promise) => {
      logger.error('Unhandled rejection at:', promise, 'reason:', reason)
      await this.shutdown()
      process.exit(1)
    })
  }

  async start() {
    logger.info('Starting ActiveMQ MCP Server...')
    
    // Setup connection manager event listeners for notifications
    this.toolHandlers.connectionManager.on('connection_established', (connectionId) => {
      this.sendNotification('connection_status', {
        connectionId,
        status: 'connected',
        timestamp: new Date().toISOString()
      })
    })

    this.toolHandlers.connectionManager.on('connection_error', (connectionId, error) => {
      this.sendNotification('connection_status', {
        connectionId,
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      })
    })

    this.toolHandlers.connectionManager.on('connection_lost', (connectionId) => {
      this.sendNotification('connection_status', {
        connectionId,
        status: 'disconnected',
        timestamp: new Date().toISOString()
      })
    })

    this.toolHandlers.connectionManager.on('health_check_failed', (connectionId, error) => {
      this.sendNotification('health_check', {
        connectionId,
        status: 'failed',
        error: error ? error.message : 'Health check failed',
        timestamp: new Date().toISOString()
      })
    })

    this.sendNotification('initialized', { 
      message: 'ActiveMQ MCP Server started',
      timestamp: new Date().toISOString()
    })
    
    logger.info('ActiveMQ MCP Server started and ready for connections')
  }

  async shutdown() {
    logger.info('Shutting down ActiveMQ MCP Server...')
    try {
      await this.toolHandlers.cleanup()
      this.sendNotification('shutdown', { 
        message: 'Server shutting down gracefully',
        timestamp: new Date().toISOString()
      })
      logger.info('ActiveMQ MCP Server shutdown complete')
    } catch (error) {
      logger.error('Error during shutdown:', error)
    }
  }
}

export { ActiveMQMCPServer }

export async function startServer() {
  const server = new ActiveMQMCPServer()
  await server.start()
  return server
}