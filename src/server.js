import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { TOOLS } from './mcp/tools.js'
import { ToolHandlers } from './mcp/handlers/index.js'
import { logger } from './utils/logger.js'

class ActiveMQMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'activemq-mcp-server',
        version: '1.0.0',
        description: 'MCP server for ActiveMQ connections and messaging'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    )

    this.toolHandlers = new ToolHandlers()
    this.setupHandlers()
    this.setupErrorHandlers()
    logger.info('ActiveMQ MCP Server initialized', { toolCount: TOOLS.length })
  }

  setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      logger.debug('Listing available tools')
      return {
        tools: TOOLS.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema
        }))
      }
    })

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params
      logger.debug(`Tool called: ${name}`)
      
      try {
        const result = await this.toolHandlers.handleTool(name, args || {})
        return result
      } catch (error) {
        logger.error(`Tool execution error for ${name}:`, error)
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
    })
  }

  setupErrorHandlers() {
    this.server.onerror = (error) => {
      logger.error('[MCP Server] Error occurred:', error)
    }

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
    const transport = new StdioServerTransport()
    logger.info('Starting ActiveMQ MCP Server...')
    
    await this.server.connect(transport)
    logger.info('ActiveMQ MCP Server started and ready for connections')
  }

  async shutdown() {
    logger.info('Shutting down ActiveMQ MCP Server...')
    try {
      await this.toolHandlers.cleanup()
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