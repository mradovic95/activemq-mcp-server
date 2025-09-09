# ActiveMQ MCP Server

A Model Context Protocol (MCP) server that provides AI systems with seamless integration to ActiveMQ Classic message brokers using STOMP protocol. This server exposes ActiveMQ operations as MCP tools, enabling AI assistants to interact with message queues and topics programmatically.

## Features

- **Multiple Broker Connections**: Manage connections to multiple ActiveMQ brokers simultaneously
- **Dynamic Connection Management**: Add and remove broker connections at runtime
- **Comprehensive Queue Operations**: Send, receive, browse, and purge messages
- **Topic Support**: Publish and subscribe to topics
- **Health Monitoring**: Automatic connection health checks and reconnection
- **MCP Protocol Compliance**: Full compatibility with MCP-enabled AI systems
- **CLI Interface**: Easy command-line management and testing

## Installation

### Global Installation (Recommended)

```bash
npm install -g activemq-mcp-server
```

### Local Installation

```bash
npm install activemq-mcp-server
```

### From Source

```bash
git clone https://github.com/your-username/activemq-mcp-server.git
cd activemq-mcp-server
npm install
npm link
```

## Quick Start

### Basic Usage

Start the MCP server (no connections are made automatically):

```bash
npx activemq-mcp-server
```

### View Configuration Status

```bash
npx activemq-mcp-server config
```

### Using Configuration File

Create a `config.json` file:

```json
{
  "local": {
    "host": "localhost",
    "port": 61613,
    "username": "admin",
    "password": "admin"
  },
  "production": {
    "host": "prod-activemq.example.com",
    "port": 61613,
    "username": "prod_user",
    "password": "prod_pass"
  }
}
```

Start server (configuration is loaded but connections are not established automatically):

```bash
npx activemq-mcp-server
```

Use `connect_from_config` tool to establish connections from configuration.

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ACTIVEMQ_HOST` | Default ActiveMQ broker hostname | `localhost` |
| `ACTIVEMQ_PORT` | Default ActiveMQ STOMP port | `61613` |
| `ACTIVEMQ_USERNAME` | Default username for authentication | `""` |
| `ACTIVEMQ_PASSWORD` | Default password for authentication | `""` |
| `ACTIVEMQ_SSL` | Enable SSL for default connection | `false` |
| `ACTIVEMQ_CONFIG_PATH` | Path to configuration file | Auto-detected |

### Configuration File Format

The configuration file supports multiple broker connections:

```json
{
  "connection_name": {
    "host": "broker-host",
    "port": 61613,
    "username": "optional-username",
    "password": "optional-password",
    "ssl": false
  }
}
```

Configuration is loaded automatically from:
1. `./activemq-config.json`
2. `./config.json`
3. Path specified in `ACTIVEMQ_CONFIG_PATH` environment variable

### Connection Parameters

- `host` (required): ActiveMQ broker hostname or IP address
- `port` (optional): STOMP port (default: 61613)
- `username` (optional): Authentication username
- `password` (optional): Authentication password
- `ssl` (optional): Enable SSL/TLS connection (default: false)

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
    "port": 61613,
    "username": "user",
    "password": "pass"
  }
}
```

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
    "port": 61613,
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
    "autoAck": true
  }
}
```

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
npx activemq-mcp-server test --host broker.example.com --port 61613 --username user --password pass
```

### List Available Tools

```bash
npx activemq-mcp-server tools
```

## ActiveMQ Setup

### Quick ActiveMQ Setup with Docker

```bash
# Run ActiveMQ Classic with STOMP enabled
docker run -d \
  --name activemq \
  -p 61616:61616 \
  -p 61613:61613 \
  -p 8161:8161 \
  apache/activemq-classic:latest

# STOMP protocol available at localhost:61613
# Web console at http://localhost:8161 (admin/admin)
```

### ActiveMQ Configuration

Ensure STOMP transport connector is enabled in ActiveMQ configuration. The STOMP connector should be accessible at port 61613 (default configuration).

Example ActiveMQ configuration (`activemq.xml`):
```xml
<transportConnectors>
  <transportConnector name="stomp" uri="stomp://0.0.0.0:61613"/>
</transportConnectors>
```

## Integration with AI Systems

### Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "activemq": {
      "command": "npx",
      "args": ["activemq-mcp-server"]
    }
  }
}
```

### Other MCP Clients

The server implements the MCP protocol specification and should work with any compliant MCP client. It communicates via JSON-RPC over stdio.

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
    "port": 61613,
    "username": "prod_user",
    "password": "prod_pass"
  },
  "staging": {
    "host": "stage-mq.example.com",
    "port": 61613,
    "username": "stage_user",
    "password": "stage_pass"
  }
}
EOF

# Start server
npx activemq-mcp-server

# Use connect_from_config tool to connect to specific brokers
```

## Monitoring and Health Checks

The server provides built-in health monitoring:

- Automatic connection health checks every 30 seconds
- Reconnection attempts with configurable backoff
- Health status reporting through MCP notifications
- System performance metrics

## Security Considerations

- Passwords in configuration files should be properly secured
- Use environment variables for sensitive credentials
- Consider network security when connecting to remote brokers
- Implement proper authentication and authorization on ActiveMQ brokers

## Troubleshooting

### Common Issues

1. **Connection Failed**
   ```bash
   # Test connectivity
   npx activemq-mcp-server test --host your-broker --port 61613
   ```

2. **STOMP Not Accessible**
   - Ensure STOMP transport connector is enabled in ActiveMQ configuration
   - Check that port 61613 is open and accessible
   - Verify ActiveMQ is running with STOMP transport connector enabled

3. **Authentication Issues**
   - Verify username/password are correct
   - Check ActiveMQ security configuration

4. **Tool Not Found**
   ```bash
   # List available tools
   npx activemq-mcp-server tools
   ```

### Debug Mode

Enable debug logging for detailed troubleshooting:

```bash
npx activemq-mcp-server --log-level debug
```

## Development

### Build from Source

```bash
git clone https://github.com/your-username/activemq-mcp-server.git
cd activemq-mcp-server
npm install
```

### Run Tests

```bash
npm test
```

### Project Structure

```
src/
├── server.js              # Main entry point and CLI
├── mcp-server.js          # MCP protocol implementation
├── activemq-client.js     # ActiveMQ REST API client
├── connection-manager.js  # Multi-broker connection management
└── tools/                 # MCP tool implementations
    ├── index.js           # Tool registry
    ├── connection-tools.js # Connection management tools
    ├── queue-tools.js     # Queue operation tools
    ├── topic-tools.js     # Topic operation tools
    └── broker-tools.js    # Broker information tools
```

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
