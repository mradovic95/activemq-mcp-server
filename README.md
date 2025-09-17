# ActiveMQ MCP Server

A Model Context Protocol (MCP) server that provides AI systems with seamless integration to ActiveMQ Classic message
brokers using REST API. This server exposes ActiveMQ operations as MCP tools, enabling AI assistants to interact with
message queues and topics programmatically.

## Features

- **Multiple Broker Connections**: Manage connections to multiple ActiveMQ brokers simultaneously
- **Dynamic Connection Management**: Add and remove broker connections at runtime
- **Comprehensive Queue Operations**: Send, receive, browse, and purge messages
- **Topic Support**: Publish, subscribe, and list topics with detailed information
- **Message Browsing**: Browse messages in queues without consuming them for debugging and monitoring
- **Destination Discovery**: List all queues and topics with their current statistics
- **Health Monitoring**: Automatic connection health checks and broker status monitoring
- **Configuration Management**: Load connections from config files with on-demand connection
- **Backup and Migration**: Export/import connection configurations for environment migration
- **MCP Protocol Compliance**: Full compatibility with MCP-enabled AI systems
- **CLI Interface**: Easy command-line management and testing

### AI-Powered ActiveMQ Management

With this MCP server, you can ask your AI assistant natural language questions and get instant results:

**📊 Monitoring & Discovery**

- *"Show me all queues and their message counts"* → Get comprehensive queue statistics
- *"Are there any messages stuck in the error queue?"* → Browse messages without consuming them
- *"What's the health status of my production broker?"* → Real-time broker health check

**📨 Message Operations**

- *"Send a test message to the user.notifications queue"* → Message sent with confirmation
- *"Check the last 5 messages in the payment.failed queue"* → Browse recent messages safely
- *"Clear all messages from the staging.test queue"* → Purge queue with confirmation
- *"Get a message template for the orders.processing queue, then change the body to 'Order #12345 processed' and send
  it"* → Browse existing message format and send customized message

**🔗 Connection Management**

- *"Connect to my production ActiveMQ broker"* → Establish connection from config
- *"Show me all my configured broker connections"* → Display available configurations
- *"Test if my development broker is responding"* → Connection health verification

**📢 Topic Operations**

- *"Publish an alert to the system.monitoring topic"* → Broadcast message to subscribers
- *"List all available topics on my broker"* → Discover topic destinations
- *"Subscribe to user.events and show me new messages"* → Real-time topic monitoring
- *"Which virtual topics do I have? List all of them and all queues associated with them"* → Discover virtual topic
  patterns and their consumer queues

**💾 Backup & Migration**

- *"Export all my broker connections for backup"* → Save connection configurations to file
- *"Import connections from my staging environment to production setup"* → Migrate broker configurations
- *"Backup my current ActiveMQ setup before making changes"* → Create configuration snapshot
- *"Copy connection settings from development to my local environment"* → Clone environment configurations

## Architecture & Project Structure

### Clean Layered Architecture

The ActiveMQ MCP Server follows clean layered architecture principles with composition patterns:

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
                                          │                                  ┌────────┴────────┐
                                          │                                  │     Broker      │
                                          │                                  │    Service      │
                                          │                                  └────────┬────────┘
                                          │                                           │
                                          └────────┬──────────────────────────────----┘
                                                   │
                                          ┌────────┴────────┐
                                          │   Core Client   │
                                          │ (HTTP + Utils)  │
                                          └─────────────────┘
```

### Project Structure

```
activemq-mcp-server/
├── 📁 bin/
│   └── cli.js                     # Command-line interface entry point
├── 📁 src/
│   ├── 📁 core/                   # Core business logic layer
│   │   ├── 📁 client/             # HTTP client and infrastructure
│   │   │   ├── core-client.js     # ActiveMQ REST API client
│   │   │   └── index.js           # Client exports
│   │   ├── 📁 service/            # Domain services
│   │   │   ├── activemq-facade.js # Unified facade interface
│   │   │   ├── broker-service.js  # Broker management operations
│   │   │   ├── connection-service.js # Connection lifecycle
│   │   │   ├── queue-service.js   # Queue operations
│   │   │   ├── topic-service.js   # Topic operations
│   │   │   └── index.js           # Service exports
│   │   ├── connection-manager.js  # Multi-broker connection registry
│   │   └── connection.js          # Individual connection wrapper
│   ├── 📁 mcp/                    # MCP protocol layer
│   │   ├── 📁 handlers/           # Tool implementation handlers
│   │   │   ├── broker-handlers.js # Broker management tools
│   │   │   ├── connection-handlers.js # Connection management tools
│   │   │   ├── queue-handlers.js  # Queue operation tools
│   │   │   ├── topic-handlers.js  # Topic operation tools
│   │   │   └── index.js           # Handler coordination
│   │   └── tools.js               # MCP tool definitions
│   ├── 📁 utils/                  # Shared utilities
│   │   ├── config.js              # Configuration management
│   │   └── logger.js              # Structured logging
│   └── server.js                  # MCP server entry point
├── 📁 test/
│   └── 📁 integration/            # Integration tests with real ActiveMQ
│       ├── 📁 service/            # Service layer tests
│       │   ├── broker-service.test.js
│       │   ├── connection-service.test.js
│       │   ├── queue-service.test.js
│       │   └── topic-service.test.js
│       └── 📁 setup/              # Test configuration
│           └── activemq-config.js
├── 📁 scripts/                    # Development scripts
│   └── wait-for-activemq.sh       # Test environment setup
├── 📁 .github/workflows/          # CI/CD automation
│   ├── ci.yml                     # Continuous integration
│   └── publish.yml                # NPM publishing
├── 📁 config files/               # Configuration examples
│   ├── activemq-config.json.example
│   └── config.example.json
├── docker-compose.test.yml        # Test environment setup
├── package.json                   # Project metadata and dependencies
├── CLAUDE.md                      # Development documentation
└── README.md                      # User documentation
```

### Architecture Benefits

- **🏗️ Clean Separation**: Infrastructure, business logic, and coordination layers
- **🔄 Composition Pattern**: Services compose shared infrastructure, no inheritance
- **🎯 Single Responsibility**: Each component has a focused, well-defined purpose
- **🧪 Testable Design**: Integration tests with real ActiveMQ brokers
- **📈 Scalable**: Easy to extend with new tools and services
- **🛡️ Reliable**: REST API communication with connection pooling and health checks

## Configuration

### Environment Variables

| Variable               | Description                         | Default       |
|------------------------|-------------------------------------|---------------|
| `ACTIVEMQ_HOST`        | Default ActiveMQ broker hostname    | `localhost`   |
| `ACTIVEMQ_PORT`        | Default ActiveMQ web console port   | `8161`        |
| `ACTIVEMQ_USERNAME`    | Default username for authentication | `""`          |
| `ACTIVEMQ_PASSWORD`    | Default password for authentication | `""`          |
| `ACTIVEMQ_SSL`         | Enable SSL for default connection   | `false`       |
| `ACTIVEMQ_CONFIG_PATH` | Path to configuration file          | Auto-detected |

### Configuration File Format

The configuration file supports multiple broker connections:

```json
{
	"connection_name": {
		"host": "broker-host",
		"port": 8161,
		"username": "optional-username",
		"password": "optional-password",
		"ssl": false
	}
}
```

### Configuration Loading Behavior

Configuration is loaded automatically in **priority order** - the system uses the **first existing file** and stops looking:

1. `./activemq-config.json` (highest priority)
2. `./config.json`
3. Path specified in `ACTIVEMQ_CONFIG_PATH` environment variable (lowest priority)

**Important:** Only **one configuration file** is loaded - there's no merging between files.

### Environment Variables vs Configuration Files

Environment variables work differently from configuration files:

- **Configuration files**: Define named connections (e.g., "production", "staging")
- **Environment variables**: Always create a "default" connection that supplements any file-based config

### Configuration Examples

#### Example 1: File Priority
```bash
# If both files exist:
./activemq-config.json  ← This file is loaded
./config.json           ← This file is ignored
```

#### Example 2: Environment Variables + File
**File: `activemq-config.json`**
```json
{
  "production": {
    "host": "prod-broker.com",
    "port": 8161,
    "username": "prod_user",
    "password": "prod_pass"
  }
}
```

**Environment Variables:**
```bash
export ACTIVEMQ_HOST=localhost
export ACTIVEMQ_USERNAME=admin
export ACTIVEMQ_PASSWORD=admin
```

**Result:** Two connections available:
- `production` (from file)
- `default` (from environment variables)

#### Example 3: Custom Config Path
```bash
export ACTIVEMQ_CONFIG_PATH=/etc/activemq/my-config.json
# Only loads if ./activemq-config.json and ./config.json don't exist
```

### Connection Parameters

- `host` (required): ActiveMQ broker hostname or IP address
- `port` (optional): Web console port (default: 8161)
- `username` (optional): Authentication username
- `password` (optional): Authentication password
- `ssl` (optional): Enable SSL/TLS connection (default: false)

## Claude Integration

### Claude Desktop Configuration

Add the ActiveMQ MCP server to your Claude Desktop by editing the MCP configuration file:

**macOS/Linux:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

#### Option 1: Environment Variables (Simple)
```json
{
  "mcpServers": {
    "activemq": {
      "command": "npx",
      "args": ["activemq-mcp-server"],
      "env": {
        "ACTIVEMQ_HOST": "localhost",
        "ACTIVEMQ_PORT": "8161",
        "ACTIVEMQ_USERNAME": "admin",
        "ACTIVEMQ_PASSWORD": "admin"
      }
    }
  }
}
```

#### Option 2: Configuration File (Multiple Brokers)
```json
{
  "mcpServers": {
    "activemq": {
      "command": "npx",
      "args": ["activemq-mcp-server"],
      "env": {
        "ACTIVEMQ_CONFIG_PATH": "/path/to/your/activemq-config.json"
      }
    }
  }
}
```

### Claude Code Configuration

Add to your `.mcp.json` file in your project root:

#### Option 1: Environment Variables (Simple)
```json
{
  "mcpServers": {
    "activemq": {
      "command": "npx",
      "args": ["activemq-mcp-server"],
      "env": {
        "ACTIVEMQ_HOST": "localhost",
        "ACTIVEMQ_PORT": "8161",
        "ACTIVEMQ_USERNAME": "admin",
        "ACTIVEMQ_PASSWORD": "admin"
      }
    }
  }
}
```

#### Option 2: Configuration File (Multiple Brokers)
```json
{
  "mcpServers": {
    "activemq": {
      "command": "npx",
      "args": ["activemq-mcp-server"],
      "env": {
        "ACTIVEMQ_CONFIG_PATH": "./activemq-config.json"
      }
    }
  }
}
```

**For both options above, when using a configuration file, create an `activemq-config.json` file:**

```json
{
  "development": {
    "host": "localhost",
    "port": 8161,
    "username": "admin",
    "password": "admin"
  },
  "staging": {
    "host": "staging-activemq.company.com",
    "port": 8161,
    "username": "stage_user",
    "password": "stage_pass"
  }
}
```

After configuration, restart Claude Desktop or reload Claude Code to enable ActiveMQ management capabilities.

## MCP Tools

The server exposes the following tools for AI interaction:

### Connection Management

#### `list_connections`

List all configured broker connections.

```json
{
	"name": "list_connections"
}
```

#### `connect_broker`

Connect to an ActiveMQ broker with manual configuration.

```json
{
	"name": "connect_broker",
	"arguments": {
		"connectionId": "mybroker",
		"host": "broker.example.com",
		"port": 8161,
		"username": "user",
		"password": "pass",
		"maxReconnectAttempts": 5,
		"reconnectDelay": 5000
	}
}
```

**Parameters:**
- `connectionId` (required): Unique identifier for the connection
- `host` (optional): ActiveMQ broker hostname or IP address (default: "localhost")
- `port` (optional): ActiveMQ web console port (default: 8161)
- `username` (optional): Username for authentication
- `password` (optional): Password for authentication
- `maxReconnectAttempts` (optional): Maximum number of reconnection attempts (default: 5)
- `reconnectDelay` (optional): Delay between reconnection attempts in milliseconds (default: 5000)

#### `connect_from_config`

Connect to an ActiveMQ broker using a named configuration from config file.

```json
{
	"name": "connect_from_config",
	"arguments": {
		"configName": "production",
		"connectionId": "prod-broker"
	}
}
```

#### `show_config`

Show all ActiveMQ broker configurations available in the config file.

```json
{
	"name": "show_config"
}
```

#### `remove_connection`

Remove a broker connection.

```json
{
	"name": "remove_connection",
	"arguments": {
		"connectionId": "mybroker"
	}
}
```

#### `test_connection`

Test connectivity to a broker without adding it.

```json
{
	"name": "test_connection",
	"arguments": {
		"host": "broker.example.com",
		"port": 8161,
		"username": "user",
		"password": "pass"
	}
}
```

#### `connection_info`

Get detailed information about a specific connection.

```json
{
	"name": "connection_info",
	"arguments": {
		"connectionId": "mybroker"
	}
}
```

#### `health_status`

Get health status of all connections.

```json
{
	"name": "health_status"
}
```

### Queue Operations

#### `list_queues`

List all queues for a connection.

```json
{
	"name": "list_queues",
	"arguments": {
		"connectionId": "mybroker"
	}
}
```

#### `queue_info`

Get queue statistics and information.

```json
{
	"name": "queue_info",
	"arguments": {
		"connectionId": "mybroker",
		"queueName": "my.queue"
	}
}
```

#### `send_message`

Send a message to a queue or topic.

```json
{
	"name": "send_message",
	"arguments": {
		"connectionId": "mybroker",
		"destination": "/queue/my.queue",
		"message": "Hello, World!",
		"headers": {
			"priority": "5",
			"custom-header": "value"
		}
	}
}
```

#### `consume_message`

Consume a message from a queue.

```json
{
	"name": "consume_message",
	"arguments": {
		"connectionId": "mybroker",
		"queueName": "my.queue",
		"timeout": 5000,
		"autoAck": true,
		"clientId": "consumer-123",
		"selector": "priority > 5"
	}
}
```

**Parameters:**
- `connectionId` (required): ID of the connection
- `queueName` (required): Name of the queue to consume from
- `timeout` (optional): Timeout in milliseconds to wait for a message (default: 5000)
- `autoAck` (optional): Automatically acknowledge the message (default: true)
- `clientId` (optional): Client ID for persistent consumer sessions
- `selector` (optional): JMS message selector for filtering messages

#### `browse_messages`

Browse messages in a queue without consuming them.

```json
{
	"name": "browse_messages",
	"arguments": {
		"connectionId": "mybroker",
		"queueName": "my.queue",
		"limit": 10
	}
}
```

#### `purge_queue`

Remove all messages from a queue.

```json
{
	"name": "purge_queue",
	"arguments": {
		"connectionId": "mybroker",
		"queueName": "my.queue",
		"confirm": true
	}
}
```

### Topic Operations

#### `list_topics`

List all topics for a connection.

```json
{
	"name": "list_topics",
	"arguments": {
		"connectionId": "mybroker"
	}
}
```

#### `publish_message`

Publish a message to a topic.

```json
{
	"name": "publish_message",
	"arguments": {
		"connectionId": "mybroker",
		"topicName": "my.topic",
		"message": "Hello, Subscribers!",
		"headers": {
			"type": "notification"
		}
	}
}
```

#### `subscribe_topic`

Subscribe to a topic and receive messages.

```json
{
	"name": "subscribe_topic",
	"arguments": {
		"connectionId": "mybroker",
		"topicName": "my.topic",
		"timeout": 10000,
		"maxMessages": 5
	}
}
```

### Broker Information

#### `broker_info`

Get broker statistics and health information.

```json
{
	"name": "broker_info",
	"arguments": {
		"connectionId": "mybroker"
	}
}
```

#### `broker_stats`

Get comprehensive broker statistics for all connections.

```json
{
	"name": "broker_stats"
}
```

#### `system_status`

Get overall system status and performance metrics.

```json
{
	"name": "system_status"
}
```

### Backup and Migration

#### `export_connections`

Export connection configurations for backup.

```json
{
	"name": "export_connections"
}
```

#### `import_connections`

Import connection configurations from backup.

```json
{
	"name": "import_connections",
	"arguments": {
		"connections": {
			"imported_broker": {
				"host": "new-broker.example.com",
				"port": 8161
			}
		},
		"overwrite": false
	}
}
```

## Command Line Interface

### Start Server

```bash
# Basic start
npx activemq-mcp-server

# With custom log level
npx activemq-mcp-server --log-level debug

# Show configuration status
npx activemq-mcp-server config

# List available tools
npx activemq-mcp-server tools
```

### Test Connection

```bash
# Test specific connection
npx activemq-mcp-server test --host broker.example.com --port 8161 --username user --password pass
```

### List Available Tools

```bash
npx activemq-mcp-server tools
```

## ActiveMQ Setup

### Quick ActiveMQ Setup with Docker

```bash
# Run ActiveMQ Classic with web console enabled
docker run -d \
  --name activemq \
  -p 61616:61616 \
  -p 8161:8161 \
  apache/activemq-classic:latest

# Web console available at http://localhost:8161 (admin/admin)
# REST API available at http://localhost:8161/api/
```

### ActiveMQ Configuration

The server uses ActiveMQ's REST API via the web console. Ensure the web console is enabled and accessible at port 8161 (
default configuration).

The REST API endpoints used:

- `/api/message/` - Send and consume messages
- `/api/jolokia/` - Broker management and statistics

## Integration with AI Systems

### Claude Desktop

Add to your Claude Desktop configuration:

```json
{
	"mcpServers": {
		"activemq": {
			"command": "npx",
			"args": [
				"activemq-mcp-server"
			]
		}
	}
}
```

### Other MCP Clients

The server implements the MCP protocol specification and should work with any compliant MCP client. It communicates via
JSON-RPC over stdio.

## Examples

### Basic Message Operations

```bash
# Start server
npx activemq-mcp-server

# In your MCP client (AI assistant):
# "Send a message to the orders queue"
# "Check how many messages are in the notifications queue"
# "Consume the next message from the processing queue"
# "Browse the first 5 messages in the errors queue"
```

### Multi-Broker Setup

```bash
# Create config.json with multiple brokers
cat > config.json << EOF
{
  "production": {
    "host": "prod-mq.example.com",
    "port": 8161,
    "username": "prod_user",
    "password": "prod_pass"
  },
  "staging": {
    "host": "stage-mq.example.com",
    "port": 8161,
    "username": "stage_user",
    "password": "stage_pass"
  }
}
EOF

# Start server
npx activemq-mcp-server

# Use connect_from_config tool to connect to specific brokers
```

## Security Considerations

- Passwords in configuration files should be properly secured
- Use environment variables for sensitive credentials
- Consider network security when connecting to remote brokers
- Implement proper authentication and authorization on ActiveMQ brokers

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- Report issues on [GitHub Issues](https://github.com/your-username/activemq-mcp-server/issues)
- Check the [ActiveMQ documentation](https://activemq.apache.org/components/classic/documentation)
- Review [MCP specification](https://modelcontextprotocol.io/introduction)

## Changelog

### v1.0.0

- Initial release
- Full MCP protocol support
- Multiple broker connection management
- Comprehensive queue and topic operations
- Health monitoring and reconnection
- CLI interface and configuration system
