# CLAUDE.md - ActiveMQ MCP Server

## Architecture Overview

This ActiveMQ MCP Server is designed as a Model Context Protocol (MCP) server that enables AI assistants like Claude to
connect to and manage ActiveMQ message brokers during conversations. The architecture follows clean layered architecture
principles with composition patterns, using ActiveMQ's REST API for reliable message broker operations.

### Clean Layered Architecture

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
                                              ┌────────┴────────┐
                                              │ Connection      │
                                              │ Manager         │
                                              └────────┬────────┘
                                                       │
                                              ┌────────┴────────┐
                                              │ ActiveMQFacade  │
                                              │ (Composition)   │
                                              └────────┬────────┘
                                                       │
                        ┌──────────────────────────────┼──────────────────────────────┐
                        │                              │                              │
                ┌───────┴────────┐            ┌────────┴────────┐            ┌────────┴────────┐
                │  Connection    │            │     Queue       │            │     Topic       │
                │   Service      │            │    Service      │            │    Service      │
                └───────┬────────┘            └────────┬────────┘            └────────┬────────┘
                        │                              │                              │
                        └──────────────────┬───────────┘                              │
                                          │                              ┌────────┴────────┐
                                          │                              │     Broker      │
                                          │                              │    Service      │
                                          │                              └────────┬────────┘
                                          │                                       │
                                          └────────┬──────────────────────────────┘
                                                   │
                                          ┌────────┴────────┐
                                          │   Core Client   │
                                          │ (HTTP + Utils)  │
                                          └─────────────────┘
```

## Clean Layered Architecture Components

### Infrastructure Layer

#### 1. CLI Entry Point (`bin/cli.js`)

- **Purpose**: Command-line interface and application bootstrap
- **Responsibilities**:
    - Parse command-line options and configuration files
    - Setup graceful shutdown handlers
    - Initialize and configure MCP server instance
    - Handle process lifecycle and logging
    - Load and display configuration status (connections are not established automatically)

#### 2. MCP Server (`src/server.js`)

- **Purpose**: Core MCP protocol handler
- **Responsibilities**:
    - Handle MCP JSON-RPC protocol communication
    - Process MCP requests (initialize, tools/list, tools/call)
    - Coordinate with tool handlers for business logic execution
    - Manage stdin/stdout communication with MCP clients
    - Handle error responses and notifications

#### 3. Core Client (`src/activemq/client/core-client.js`)

- **Purpose**: Infrastructure layer - HTTP client and utilities
- **Pattern**: Single shared instance
- **Responsibilities**:
    - HTTP client configuration and management (axios)
    - Connection lifecycle management
    - Broker name discovery and caching
    - Destination parsing utilities
    - Connection state management
    - No business logic - pure infrastructure

### Business Logic Layer

#### 4. Domain Services (`src/activemq/service/`)

- **Purpose**: Domain-specific business logic implementations
- **Pattern**: Composition - services operate on shared core client
- **Components**:
    - `connection-service.js`: Connection lifecycle operations
    - `queue-service.js`: Queue operations (send, receive, browse, purge)
    - `topic-service.js`: Topic operations (publish, subscribe)
    - `broker-service.js`: Broker management and system monitoring

#### 5. ActiveMQ Facade (`src/activemq/service/activemq-facade.js`)

- **Purpose**: Facade pattern - unified interface via pure delegation
- **Pattern**: Composition + Facade - composes core + services
- **Responsibilities**:
    - Provide unified interface for all ActiveMQ operations
    - Pure delegation to appropriate services (no direct core access)
    - Maintain single API surface for external consumers

### Coordination Layer

#### 6. Tool Definitions (`src/mcp/tools.js`)

- **Purpose**: Centralized tool schema definitions
- **Pattern**: Declarative configuration pattern
- **Responsibilities**:
    - Define tool names, descriptions, and input schemas
    - Specify required and optional parameters
    - Provide parameter validation rules and defaults

#### 7. Handler System (`src/mcp/handlers/`)

- **Purpose**: MCP tool implementations that coordinate business logic
- **Pattern**: Handler pattern with facade delegation
- **Components**:
    - `index.js`: Main handler coordinator and router
    - `connection-handlers.js`: Connection management tool implementations
    - `queue-handlers.js`: Queue operation tool implementations
    - `topic-handlers.js`: Topic operation tool implementations
    - `broker-handlers.js`: Broker management tool implementations

#### 8. Connection Manager (`src/activemq/connection-manager.js`)

- **Purpose**: Manages multiple ActiveMQ broker connections
- **Pattern**: Manager pattern without events (simplified)
- **Responsibilities**:
    - Maintain named connection registry using REST API
    - Handle connection pooling and lifecycle management
    - Provide connection testing and health monitoring
    - Manage authentication for web console access
    - No event emission - simplified direct method calls

### Utilities

#### 9. Logger (`src/utils/logger.js`)

- **Purpose**: Structured logging with configurable levels
- **Responsibilities**:
    - Consistent error formatting and context
    - Request timing and performance metrics
    - MCP mode detection for appropriate log formatting

## Clean Architecture Patterns

### 1. Layered Architecture

The system is organized into distinct layers with clear responsibilities:

```
┌─────────────────────────┐
│    Coordination Layer   │  ← MCP Handlers, Connection Manager
├─────────────────────────┤
│   Business Logic Layer  │  ← Services, Facade  
├─────────────────────────┤
│   Infrastructure Layer  │  ← Core Client, HTTP, Utilities
└─────────────────────────┘
```

### 2. Composition Over Inheritance

All components use composition instead of inheritance:

```javascript
// Services compose infrastructure
class QueueService {
	constructor(core) {
		this.core = core; // Composition, not inheritance
	}
}

// Facade composes services
class ActiveMQFacade {
	constructor(config) {
		this.core = new CoreClient(config);
		this.queueService = new QueueService(this.core);
		this.topicService = new TopicService(this.core);
	}
}
```

### 3. Facade Pattern

The facade provides a unified interface through pure delegation:

```javascript
class ActiveMQFacade {
	// Facade ONLY delegates - no direct core access
	isConnected() {
		return this.connectionService.isConnected(); // Delegate to service
	}

	async sendMessage(destination, message, headers) {
		return this.queueService.sendMessage(destination, message, headers); // Delegate to service
	}

	async getBrokerInfo() {
		return this.brokerService.getBrokerInfo(); // Delegate to service
	}
}
```

### 4. Declarative Configuration Pattern (Tool Definitions)

Tools are defined declaratively separate from implementation:

```javascript
export const TOOLS = [
	{
		name: "send_message",
		description: "Send a message to a queue or topic",
		inputSchema: {
			type: "object",
			properties: { /* schema definition */},
			required: ["connectionId", "destination", "message"]
		}
	}
]
```

### 5. Registry Pattern (Connection Management)

```javascript
class ConnectionManager {
	constructor() {
		this.connections = new Map() // Registry of facade instances
	}
}
```

### 6. No Events Pattern (Simplified)

The architecture avoids event complexity in favor of direct method calls:

```javascript
// No EventEmitter inheritance
class ConnectionManager {
	async addConnection(id, config) {
		const client = new ActiveMQFacade(config);
		await client.connect();
		this.connections.set(id, client); // Direct storage, no events
		return client;
	}
}
```

## Architectural Benefits

### Clean Separation of Concerns

- **Infrastructure Layer**: Handles HTTP, connection, utilities (CoreClient)
- **Business Logic Layer**: Handles domain operations (Services, Facade)
- **Coordination Layer**: Handles MCP protocol and routing (Handlers, Manager)

### No Event Complexity

- Removed EventEmitter inheritance and event-driven patterns
- Direct method calls and return values
- Simplified error handling and testing
- No event timing or ordering issues

### Perfect Composition

- Single shared CoreClient instance across all services
- Services operate ON infrastructure, not inherit FROM it
- Facade delegates TO services, not access infrastructure directly
- Clear dependency flow: Coordination → Business → Infrastructure

### Maintainability

- Each layer can evolve independently
- Business logic isolated from infrastructure concerns
- Easy to test each layer in isolation
- Clear boundaries and responsibilities

### Performance

- Single HTTP client instance (no duplication)
- Shared connection state across all services
- No event overhead or listener management
- Efficient resource utilization

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
	"configName"
:
	"production",     // Name from config file
		"connectionId"
:
	"prod-broker"   // Optional custom connection ID
}
```

#### show_config

```javascript
// Display all available configurations
{
} // No parameters needed
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
import {logger} from '../../utils/logger.js'

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
		description
:
	"Create a new ActiveMQ user",
		inputSchema
:
	{
		type: "object",
			properties
	:
		{
			connectionId: {
				type: "string", description
			:
				"ID of the connection"
			}
		,
			username: {
				type: "string", description
			:
				"Username to create"
			}
		,
			password: {
				type: "string", description
			:
				"User password"
			}
		,
			roles: {
				type: "array", items
			:
				{
					type: "string"
				}
			,
				description: "User roles"
			}
		}
	,
		required: ["connectionId", "username", "password"]
	}
}
```

3. **Register in Handler Index**:

```javascript
// src/mcp/handlers/index.js
import {AdminHandlers} from './admin-handlers.js'

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
async
sendBinaryMessage(destination, binaryData, options = {})
{
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
async
handleSendBinaryMessage(args)
{
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
		description
:
	"Send binary message to queue",
		inputSchema
:
	{
		type: "object",
			properties
	:
		{
			connectionId: {
				type: "string"
			}
		,
			destination: {
				type: "string"
			}
		,
			data: {
				type: "string", description
			:
				"Base64 encoded binary data"
			}
		}
	,
		required: ["connectionId", "destination", "data"]
	}
}

// src/mcp/handlers/index.js - Add to handleTool switch
case
'send_binary_message'
:
return await this.queueHandlers.handleSendBinaryMessage(args)
```

## Testing Strategy

This project prioritizes **integration testing with real ActiveMQ** using Docker Compose to validate actual broker
behavior rather than mocked interactions. This approach ensures tests catch real-world message broker edge cases and
timing issues.

### Testing Philosophy

**🎯 Integration-First Approach**:

- Test against real ActiveMQ broker instances using Docker Compose
- Validate actual message broker behavior, not assumptions
- Catch timing issues, persistence behaviors, and broker-specific quirks
- Ensure reliability in production environments

**📋 Test Categories**:

```
test/
├── integration/           # Primary focus - Real ActiveMQ testing
│   ├── setup/activemq-config.js  # Test configuration
│   └── service/          # Service layer with real broker
└── unit/                 # Future - Fast feedback for pure logic
    └── utils/            # Only for non-broker utilities
```

### Integration Testing Rules

#### **1. Real Broker Testing**

- **ALWAYS** use Docker Compose with actual ActiveMQ broker

#### **3. Test Data Isolation**

- Use **unique queue/topic names** per test to avoid cross-contamination:

```javascript
beforeEach(() => {
	testQueue = `/queue/test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
})
```

Each queue, message, or other object ID should always be unique, so tests cannot interfere with each other.

### Concrete Assertions

**Always use definite assertions in tests, never vague type checks or loose comparisons.** Tests should validate exact
expected values and concrete ranges rather than just checking types or using imprecise comparisons. For example, use
`expect(queueInfo.size).toBe(1)` instead of `expect(queueInfo.size).toBe('number')`, and
`expect(messages.length).toBe(0)` instead of `expect(messages.length).toBeLessThanOrEqual(3)`. When ranges are
necessary, use concrete bounds like `expect(duration).toBeGreaterThan(900)` and `expect(duration).toBeLessThan(1500)`.

This approach ensures tests provide clear pass/fail criteria and catch regressions definitively. Concrete assertions
also serve as living documentation, clearly communicating the expected system behavior to developers reading the tests.

**Benefits of concrete assertions:**

- Eliminate ambiguity in test results
- Make test failures more actionable by showing exact mismatches
- Prevent tests from accidentally passing when they should fail
- Provide precise specifications of expected system behavior
- Serve as executable documentation for the codebase

### Test Setup and Commands

**Complete Test Automation (Recommended):**

```bash
# Full automated test cycle - start ActiveMQ, run tests, cleanup
npm run test:full
```

**Manual Test Environment Setup:**

```bash
# Start ActiveMQ via Docker Compose
npm run test:setup

# Run integration tests (with ActiveMQ running)
npm run test:integration

# Stop ActiveMQ when done
npm run test:teardown
```

**Alternative - Manual Docker Compose:**

```bash
# Start ActiveMQ
docker-compose -f docker-compose.test.yml up -d

# Wait for ActiveMQ to be ready
./scripts/wait-for-activemq.sh

# Run tests
npm run test:integration

# Stop ActiveMQ
docker-compose -f docker-compose.test.yml down
```

**Development Testing:**

```bash
npm run test:unit  # Future - pure logic tests
npm test           # All tests (currently runs vitest)
```

### Test Writing Standards

#### **Test Organization and Naming**

**File Naming Convention**:

```
test/integration/service/[service-name].test.js
test/integration/handlers/[handler-name].test.js  # Future
test/unit/utils/[utility-name].test.js           # Future
```

#### **Test Suite Structure**

* GIVEN/WHEN/THEN Structure - Always structure tests using clear GIVEN/WHEN/THEN comments for readability
* sut - **System Under Test** - Name convention for variable which represents component being tested
* Tests for same method should always be groped together (happy path, unhappy path, edge cases, etc)

```javascript
describe('[ComponentName] Integration Tests', () => {
	// Setup variables
	let coreClient, sut, testQueue  // sut = System Under Test

	beforeEach(async () => {
		// Component initialization
		// Unique test data setup
	})

	afterEach(async () => {
		// Cleanup test data
		// Resource cleanup
	})

	describe('[methodName]', () => {
		// Happy path tests first
		it('should [expected behavior] when [conditions]', async () => {
			// GIVEN - Test setup and preconditions
			// WHEN - Action being tested
			// THEN - Assertions and verification
		})

		it('should [another expected behavior] when [other conditions]', async () => {
			// Additional happy path scenarios
		})

		// Unhappy path tests second
		it('should [error behavior] when [error conditions]', async () => {
			// Error scenario testing
		})

		it('should [edge case behavior] when [edge conditions]', async () => {
			// Edge case testing
		})
	})

	describe('[anotherMethodName]', () => {
		// Same pattern: happy paths first, then unhappy paths
	})
})
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
async
healthCheck()
{
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
async
handleSendMessage(args)
{ /* Send message logic only */
}
async
handleConsumeMessage(args)
{ /* Consume message logic only */
}
async
handleBrowseMessages(args)
{ /* Browse messages logic only */
}
```

**Consistent Error Handling**: All handlers follow the same error response pattern:

```javascript
// Standardized error responses across all handlers
return {
	content: [{type: "text", text: JSON.stringify({success: false, error: error.message}, null, 2)}],
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

This architecture provides a solid foundation for a production-ready ActiveMQ MCP server while maintaining simplicity
and extensibility for messaging operations.
