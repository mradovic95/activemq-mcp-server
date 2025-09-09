# CLAUDE.md - ActiveMQ MCP Server

## Architecture Overview

This ActiveMQ MCP Server is designed as a Model Context Protocol (MCP) server that enables AI assistants like Claude to connect to and manage ActiveMQ message brokers during conversations. The architecture follows modern Node.js best practices with extensible, maintainable code for messaging queue and topic operations.

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Claude/AI     │────│   MCP Protocol  │────│   ActiveMQ MCP  │
│   Assistant     │    │   (JSON-RPC)    │    │     Server      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                                              ┌────────┴────────┐
                                              │   MCP Handler   │
                                              │   Coordinator   │
                                              └────────┬────────┘
                                                       │
                        ┌──────────────────────────────┼──────────────────────────────┐
                        │                              │                              │
                ┌───────┴────────┐            ┌────────┴────────┐            ┌────────┴────────┐
                │  Connection    │            │     Queue       │            │     Topic       │
                │   Handlers     │            │    Handlers     │            │    Handlers     │
                └───────┬────────┘            └────────┬────────┘            └────────┬────────┘
                        │                              │                              │
                ┌───────┴────────┐            ┌────────┴────────┐            ┌────────┴────────┐
                │    Broker      │            │   ActiveMQ      │            │   ActiveMQ      │
                │   Handlers     │            │    Queues       │            │    Topics       │
                └───────┬────────┘            └─────────────────┘            └─────────────────┘
                        │
                ┌───────┴────────┐
                │ Connection     │
                │ Manager        │
                └────────────────┘
```

## Core Components

### 1. CLI Entry Point (`bin/cli.js`)
- **Purpose**: Command-line interface and application bootstrap
- **Responsibilities**: 
  - Parse command-line options and configuration files
  - Setup graceful shutdown handlers
  - Initialize and configure MCP server instance
  - Handle process lifecycle and logging
  - Load and display configuration status (connections are not established automatically)

### 2. MCP Server (`src/server.js`)
- **Purpose**: Core MCP protocol handler
- **Responsibilities**:
  - Handle MCP JSON-RPC protocol communication
  - Process MCP requests (initialize, tools/list, tools/call)
  - Coordinate with tool handlers for business logic execution
  - Manage stdin/stdout communication with MCP clients
  - Handle error responses and notifications

### 3. Tool Definitions (`src/mcp/tools.js`)
- **Purpose**: Centralized tool schema definitions
- **Pattern**: Declarative configuration pattern
- **Responsibilities**:
  - Define tool names, descriptions, and input schemas
  - Specify required and optional parameters
  - Provide parameter validation rules and defaults

### 4. Handler System (`src/mcp/handlers/`)
- **Purpose**: Domain-specific business logic implementations
- **Pattern**: Separated handler pattern with functional grouping
- **Components**:
  - `index.js`: Main handler coordinator and router
  - `connection-handlers.js`: Connection management operations
  - `queue-handlers.js`: Queue operations (send, receive, browse, purge)
  - `topic-handlers.js`: Topic operations (publish, subscribe)
  - `broker-handlers.js`: Broker management and system monitoring

### 5. Connection Manager (`src/activemq/connection-manager.js`)
- **Purpose**: Manages all ActiveMQ broker connections
- **Pattern**: Singleton-like manager pattern with event emission
- **Responsibilities**:
  - Maintain named connection registry using STOMP protocol
  - Handle connection pooling and lifecycle management
  - Provide connection testing and health monitoring
  - Manage authentication and SSL/TLS connections
  - Emit events for connection status changes

### 6. ActiveMQ Client (`src/activemq/activemq-client.js`)
- **Purpose**: Low-level ActiveMQ STOMP client wrapper
- **Responsibilities**:
  - Abstract STOMP protocol complexities
  - Provide unified interface for queue and topic operations
  - Handle message serialization/deserialization
  - Manage connection state and reconnection logic
  - Support both persistent and temporary destinations

### 7. Utilities (`src/utils/logger.js`)
- **Logger**: Structured logging with configurable levels
- **Error Handling**: Consistent error formatting and context
- **Performance**: Request timing and performance metrics

## Design Patterns Used

### 1. Separated Handler Pattern (Business Logic)
Each handler class focuses on a specific domain with clean separation:
```javascript
class QueueHandlers {
  constructor(connectionManager) {
    this.connectionManager = connectionManager
  }
  
  async handleSendMessage(args) { /* Queue-specific logic */ }
  async handleConsumeMessage(args) { /* Queue-specific logic */ }
  async handleBrowseMessages(args) { /* Queue-specific logic */ }
}
```

### 2. Coordinator Pattern (Handler Management)
Main handler coordinator routes requests to appropriate domain handlers:
```javascript
class ToolHandlers {
  constructor() {
    this.connectionHandlers = new ConnectionHandlers(this.connectionManager)
    this.queueHandlers = new QueueHandlers(this.connectionManager)
    this.topicHandlers = new TopicHandlers(this.connectionManager)
    this.brokerHandlers = new BrokerHandlers(this.connectionManager)
  }
  
  async handleTool(name, args) {
    switch (name) {
      case 'send_message': return this.queueHandlers.handleSendMessage(args)
      case 'publish_message': return this.topicHandlers.handlePublishMessage(args)
      // ... route to appropriate handler
    }
  }
}
```

### 3. Declarative Configuration Pattern (Tool Definitions)
Tools are defined declaratively separate from implementation:
```javascript
export const TOOLS = [
  {
    name: "send_message",
    description: "Send a message to a queue or topic",
    inputSchema: {
      type: "object",
      properties: { /* schema definition */ },
      required: ["connectionId", "destination", "message"]
    }
  }
]
```

### 4. Registry Pattern (Connection Management)
```javascript
class ConnectionManager {
  constructor() {
    this.connections = new Map() // Registry of active connections
    this.clients = new Map()     // Registry of STOMP clients
  }
}
```

### 5. Event-Driven Pattern (Connection Events)
Connection manager emits events for status changes:
```javascript
class ConnectionManager extends EventEmitter {
  async addConnection(id, config) {
    // ... connection logic
    this.emit('connection_established', id)
  }
}
```

## Configuration System

### Configuration Loading Strategy
The ActiveMQ MCP Server follows a configuration-first, connect-on-demand approach similar to database-mcp-server:

- **No Auto-Connect**: Configuration is loaded at startup but connections are NOT established automatically
- **On-Demand Connection**: Use `connect_from_config` tool to establish connections from configuration
- **Multiple Sources**: Configuration loaded from multiple file paths and environment variables
- **Validation**: Configuration validation before connection attempts
- **Transparency**: `show_config` tool to inspect available configurations

### Configuration Flow
```
1. Server Startup
   ↓
2. Load Config Files (activemq-config.json, config.json, or ACTIVEMQ_CONFIG_PATH)
   ↓
3. Load Environment Variables (ACTIVEMQ_HOST, ACTIVEMQ_PORT, etc.)
   ↓
4. Display Configuration Status
   ↓
5. Server Ready (no connections established)
   ↓
6. AI Uses connect_from_config Tool
   ↓
7. Connection Established On-Demand
```

### New Configuration Tools

#### connect_from_config
```javascript
// Connect to broker using named configuration
{
  "configName": "production",     // Name from config file
  "connectionId": "prod-broker"   // Optional custom connection ID
}
```

#### show_config
```javascript
// Display all available configurations
{} // No parameters needed
```

This approach provides several benefits:
- **Security**: No automatic connections reduce attack surface
- **Flexibility**: Connect only to needed brokers
- **Visibility**: Clear view of available configurations
- **Control**: Explicit connection management

## Development Best Practices

### Code Organization
- **Domain-driven structure**: Group handlers by functional domain (connection, queue, topic, broker)
- **Clear separation of concerns**: Each handler class has a single responsibility
- **Layered architecture**: CLI → Server → Handlers → Connection Manager → ActiveMQ Client
- **Dependency injection**: Connection manager injected into handler constructors
- **Single responsibility**: Each handler method focuses on one specific operation

### Error Handling
- **Consistent error format**: All errors follow MCP protocol structure
- **Graceful degradation**: Server continues operating despite individual failures
- **Detailed logging**: Comprehensive error information for debugging
- **Resource cleanup**: Ensure STOMP connections are properly closed

### Security
- **No credential persistence**: Credentials only in memory during active connections
- **SSL/TLS support**: Secure connections to ActiveMQ brokers
- **Connection isolation**: Each connection is independent
- **Authentication management**: Support for username/password and certificates

### Performance
- **Connection pooling**: Reuse STOMP connections efficiently
- **Lazy loading**: Connect only when needed
- **Resource limits**: Configurable connection limits
- **Connection lifecycle**: Automatic cleanup of unused connections

## Extending the Server

### Adding New Handler Categories

1. **Create New Handler Class**:
```javascript
// src/mcp/handlers/admin-handlers.js
import { logger } from '../../utils/logger.js'

export class AdminHandlers {
  constructor(connectionManager) {
    this.connectionManager = connectionManager
  }
  
  async handleCreateUser(args) {
    try {
      logger.info(`Creating user '${args.username}' on connection '${args.connectionId}'`)
      
      const client = this.connectionManager.getClient(args.connectionId)
      const result = await client.createUser(args.username, args.password, args.roles)
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              connectionId: args.connectionId,
              username: args.username,
              result,
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ]
      }
    } catch (error) {
      logger.error(`Failed to create user: ${error.message}`)
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: error.message,
              connectionId: args.connectionId,
              username: args.username
            }, null, 2)
          }
        ],
        isError: true
      }
    }
  }
}
```

2. **Add Tool Definitions**:
```javascript
// src/mcp/tools.js - Add to TOOLS array
{
  name: "create_user",
  description: "Create a new ActiveMQ user",
  inputSchema: {
    type: "object",
    properties: {
      connectionId: { type: "string", description: "ID of the connection" },
      username: { type: "string", description: "Username to create" },
      password: { type: "string", description: "User password" },
      roles: { type: "array", items: { type: "string" }, description: "User roles" }
    },
    required: ["connectionId", "username", "password"]
  }
}
```

3. **Register in Handler Index**:
```javascript
// src/mcp/handlers/index.js
import { AdminHandlers } from './admin-handlers.js'

export class ToolHandlers {
  constructor() {
    // ... existing handlers
    this.adminHandlers = new AdminHandlers(this.connectionManager)
  }
  
  async handleTool(name, args) {
    switch (name) {
      // ... existing cases
      case 'create_user':
        return await this.adminHandlers.handleCreateUser(args)
      // ...
    }
  }
}
```

### Adding New Message Types

1. **Extend ActiveMQ Client**:
```javascript
// src/activemq/activemq-client.js
async sendBinaryMessage(destination, binaryData, options = {}) {
  const client = await this.getClient();
  const frame = client.send({
    destination,
    'content-type': 'application/octet-stream',
    ...options
  });
  frame.write(binaryData);
  frame.end();
}
```

2. **Add Handler Method**:
```javascript
// src/mcp/handlers/queue-handlers.js
async handleSendBinaryMessage(args) {
  try {
    logger.info(`Sending binary message to '${args.destination}' on connection '${args.connectionId}'`)
    
    const client = this.connectionManager.getClient(args.connectionId)
    const buffer = Buffer.from(args.data, 'base64')
    await client.sendBinaryMessage(args.destination, buffer)
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: true,
            connectionId: args.connectionId,
            destination: args.destination,
            dataSize: buffer.length,
            timestamp: new Date().toISOString()
          }, null, 2)
        }
      ]
    }
  } catch (error) {
    logger.error(`Failed to send binary message: ${error.message}`)
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
```

3. **Add Tool Definition and Route**:
```javascript
// src/mcp/tools.js - Add to TOOLS array
{
  name: "send_binary_message",
  description: "Send binary message to queue",
  inputSchema: {
    type: "object",
    properties: {
      connectionId: { type: "string" },
      destination: { type: "string" },
      data: { type: "string", description: "Base64 encoded binary data" }
    },
    required: ["connectionId", "destination", "data"]
  }
}

// src/mcp/handlers/index.js - Add to handleTool switch
case 'send_binary_message':
  return await this.queueHandlers.handleSendBinaryMessage(args)
```

## Testing Strategy

### Unit Tests
- **Handler testing**: Mock connection manager, test handler business logic
- **Client testing**: Mock STOMP connections, test message handling
- **Manager testing**: Test connection lifecycle, error handling
- **MCP Server testing**: Test protocol handling and request routing

### Integration Tests
- **ActiveMQ integration**: Test with real ActiveMQ broker instances
- **MCP protocol**: Test tool execution via MCP client
- **Error scenarios**: Network failures, invalid destinations, etc.
- **End-to-end**: Test full CLI → Server → Handler → ActiveMQ flow

### Example Test Structure:
```javascript
// test/handlers/queue-handlers.test.js
import { QueueHandlers } from '../../src/mcp/handlers/queue-handlers.js'

describe('QueueHandlers', () => {
  let mockConnectionManager;
  let queueHandlers;

  beforeEach(() => {
    mockConnectionManager = {
      getClient: jest.fn(),
      listQueues: jest.fn()
    };
    queueHandlers = new QueueHandlers(mockConnectionManager);
  });

  describe('handleSendMessage', () => {
    it('should send message successfully', async () => {
      const mockClient = {
        sendMessage: jest.fn().mockResolvedValue(true)
      };
      mockConnectionManager.getClient.mockResolvedValue(mockClient);

      const result = await queueHandlers.handleSendMessage({
        connectionId: 'test',
        destination: '/queue/test-queue',
        message: 'Hello World'
      });

      expect(result.content[0].text).toContain('"success": true');
      expect(mockClient.sendMessage).toHaveBeenCalledWith(
        '/queue/test-queue',
        'Hello World',
        {}
      );
    });

    it('should handle errors gracefully', async () => {
      mockConnectionManager.getClient.mockRejectedValue(new Error('Connection failed'));

      const result = await queueHandlers.handleSendMessage({
        connectionId: 'test',
        destination: '/queue/test-queue',
        message: 'Hello World'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('"success": false');
      expect(result.content[0].text).toContain('Connection failed');
    });
  });
});

// test/integration/mcp-server.test.js
import { ActiveMQMCPServer } from '../../src/server.js'

describe('ActiveMQ MCP Server Integration', () => {
  let server;

  beforeEach(() => {
    server = new ActiveMQMCPServer();
  });

  it('should handle tools/list request', async () => {
    const mockRequest = {
      id: 1,
      method: 'tools/list',
      params: {}
    };

    const response = await server.processRequest(mockRequest);
    expect(response.result.tools).toBeDefined();
    expect(response.result.tools.length).toBeGreaterThan(0);
  });
});
```

## Monitoring and Observability

### Logging Strategy
- **Structured logging**: JSON format for machine parsing
- **Log levels**: DEBUG, INFO, WARN, ERROR
- **Contextual information**: Include connection names, destination names, timing
- **Security**: Never log credentials or sensitive message content

### Metrics to Track
- Connection pool utilization
- Message send/receive rates
- Queue depth monitoring
- Topic subscription counts
- Error rates by operation type
- Tool usage patterns

### Health Checks
```javascript
// Example health check implementation
async healthCheck() {
  const connections = this.connectionManager.listConnections();
  const results = await Promise.allSettled(
    connections.map(conn => this.connectionManager.testConnection(conn.name))
  );
  
  return {
    status: results.every(r => r.status === 'fulfilled') ? 'healthy' : 'degraded',
    connections: results.length,
    brokers: results.filter(r => r.status === 'fulfilled').length,
    timestamp: new Date().toISOString()
  };
}
```

## Deployment Considerations

### NPX Distribution
- **Executable permissions**: Ensure CLI script has proper shebang
- **Cross-platform compatibility**: Use `#!/usr/bin/env node`
- **Package.json bin**: Proper binary configuration for NPX installation

### Environment Configuration
- **12-factor app**: Configuration via environment variables
- **Config file support**: JSON configuration for complex setups
- **Credential management**: Support for external credential stores

### Process Management
- **Graceful shutdown**: Handle SIGTERM/SIGINT signals properly
- **Resource cleanup**: Close all STOMP connections on exit
- **Error recovery**: Proper error handling and process exit codes

## Common Pitfalls and Solutions

### 1. STOMP Connection Leaks
**Problem**: Not properly closing STOMP connections
**Solution**: 
```javascript
// Always cleanup in finally blocks
try {
  const result = await client.sendMessage(destination, message);
  return result;
} finally {
  if (client && client.disconnect) {
    await client.disconnect();
  }
}
```

### 2. Message Delivery Guarantees
**Problem**: Not handling message acknowledgments properly
**Solution**: Implement proper ACK/NACK handling based on business requirements

### 3. Memory Leaks
**Problem**: Accumulating connections or cached messages
**Solution**: Implement proper cleanup and connection limits

### 4. Error Propagation
**Problem**: Swallowing STOMP errors or poor error context
**Solution**: 
```javascript
// Maintain error context through the stack
try {
  await operation();
} catch (error) {
  throw new Error(`ActiveMQ operation failed for connection '${name}': ${error.message}`);
}
```

## Handler Architecture Benefits

### Modular Organization
The separated handler structure provides significant advantages over monolithic approaches:

**🎯 Domain Separation**: Each handler class focuses on a specific functional domain:
- `ConnectionHandlers` - Connection lifecycle management
- `QueueHandlers` - Queue operations and message handling
- `TopicHandlers` - Publish/subscribe operations
- `BrokerHandlers` - System administration and monitoring

**🔍 Easy Navigation**: Developers can quickly locate functionality:
```bash
src/mcp/handlers/
├── connection-handlers.js  # All connection operations
├── queue-handlers.js      # All queue operations  
├── topic-handlers.js      # All topic operations
└── broker-handlers.js     # All broker operations
```

**🛠️ Independent Development**: Teams can work on different domains simultaneously without conflicts.

**🧪 Focused Testing**: Each handler class can be unit tested in isolation with focused mocks.

**📈 Scalable Growth**: New functionality can be added to appropriate handlers or new handler classes created.

### Maintainability Advantages

**Single Responsibility**: Each handler method has one clear purpose:
```javascript
// Clear, focused methods
async handleSendMessage(args) { /* Send message logic only */ }
async handleConsumeMessage(args) { /* Consume message logic only */ }
async handleBrowseMessages(args) { /* Browse messages logic only */ }
```

**Consistent Error Handling**: All handlers follow the same error response pattern:
```javascript
// Standardized error responses across all handlers
return {
  content: [{ type: "text", text: JSON.stringify({ success: false, error: error.message }, null, 2) }],
  isError: true
}
```

**Dependency Injection**: Clean dependency management through constructor injection:
```javascript
export class QueueHandlers {
  constructor(connectionManager) {
    this.connectionManager = connectionManager // Injected dependency
  }
}
```

## Future Enhancements

### Planned Features
1. **Message transformation** for format conversion
2. **Dead letter queue** management
3. **Message routing** with complex rules
4. **Transaction support** for multi-message operations
5. **JMS bridge** for Java integration
6. **Performance monitoring** with message flow analytics

### Scalability Considerations
- **Horizontal scaling**: Multiple server instances
- **Load balancing**: Distribute connections across brokers
- **Cluster support**: ActiveMQ cluster awareness
- **High availability**: Automatic failover support

This architecture provides a solid foundation for a production-ready ActiveMQ MCP server while maintaining simplicity and extensibility for messaging operations.