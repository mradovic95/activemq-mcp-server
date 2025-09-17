#!/usr/bin/env node

import { Command } from 'commander';
import { startServer } from '../src/server.js';
import { logger } from '../src/utils/logger.js';
import { configManager } from '../src/utils/config.js';

const program = new Command();



function logConfigurationStatus() {
  const configuredConnections = configManager.getConfiguredConnections();

  if (configuredConnections.length > 0) {
    logger.info(`Found ${configuredConnections.length} connection configuration(s)`, {
      connectionNames: configuredConnections,
      note: 'Use connect_from_config tool to establish connections'
    });
  } else {
    logger.info('No connections configured - use connect_broker or add config file');
  }
}

program
  .name('activemq-mcp-server')
  .description('ActiveMQ MCP Server for AI integration')
  .version('1.0.0')
  .option('--log-level <level>', 'Log level (error, warn, info, debug)', 'info')
  .action(async (options) => {
    try {
      // Setup logging level
      const logLevel = options.logLevel || 'info';
      logger.level = logLevel;

      logger.info('Starting ActiveMQ MCP Server', { logLevel });

      // Create and start MCP server
      const server = await startServer();

      // Log configuration status
      logConfigurationStatus();

      logger.info('ActiveMQ MCP Server is ready and listening on stdio');

      // Log available tools in debug mode
      if (logLevel === 'debug') {
        const connections = server.toolHandlers.connectionManager.listConnections();
        logger.debug('Server status', {
          connections: connections.map(c => ({ id: c.connectionId, host: c.host, port: c.port, connected: c.connected }))
        });
      }

    } catch (error) {
      console.error('Failed to start server:', error.message);
      process.exit(1);
    }
  });

// Add command to test connection without starting server
program
  .command('test')
  .description('Test connection to ActiveMQ broker')
  .option('-h, --host <host>', 'ActiveMQ broker host', 'localhost')
  .option('-p, --port <port>', 'ActiveMQ STOMP port', '61613')
  .option('-u, --username <username>', 'ActiveMQ username', '')
  .option('-w, --password <password>', 'ActiveMQ password', '')
  .action(async (options) => {
    try {
      const { ConnectionManager } = await import('../src/core/connection-manager.js');
      const manager = new ConnectionManager();

      const config = {
        host: options.host,
        port: parseInt(options.port),
        username: options.username,
        password: options.password
      };

      console.log(`Testing connection to ${config.host}:${config.port}...`);

      const result = await manager.testConnection(config);

      if (result.success) {
        console.log('✓ Connection successful');
        console.log('Broker info:', JSON.stringify(result.brokerInfo, null, 2));
      } else {
        console.error('✗ Connection failed:', result.error);
        process.exit(1);
      }

      await manager.disconnectAll();
    } catch (error) {
      console.error('Test failed:', error.message);
      process.exit(1);
    }
  });

// Add command to show current configuration
program
  .command('config')
  .description('Show current configuration')
  .action(async () => {
    try {
      const configuredConnections = configManager.getConfiguredConnections();

      console.log('ActiveMQ MCP Server Configuration:');
      console.log('==================================');

      if (configuredConnections.length === 0) {
        console.log('No connections configured.');
        console.log('\nConfiguration can be provided via:');
        console.log('1. Environment variables: ACTIVEMQ_HOST, ACTIVEMQ_PORT, ACTIVEMQ_USERNAME, ACTIVEMQ_PASSWORD');
        console.log('2. Config files: ./activemq-config.json, ./config.json');
        console.log('3. Custom config file: set ACTIVEMQ_CONFIG_PATH environment variable');
      } else {
        console.log(`Found ${configuredConnections.length} connection configuration(s):\n`);

        for (const name of configuredConnections) {
          const config = configManager.getConnectionConfig(name);
          console.log(`${name}:`);
          console.log(`  Host: ${config.host}`);
          console.log(`  Port: ${config.port || 61613}`);
          console.log(`  Username: ${config.username || '(none)'}`);
          console.log(`  SSL: ${config.ssl ? 'enabled' : 'disabled'}`);
          console.log('');
        }

        console.log('Use "connect_from_config" tool to establish connections from these configurations.');
      }

    } catch (error) {
      console.error('Failed to load configuration:', error.message);
      process.exit(1);
    }
  });

// Add command to list tools
program
  .command('tools')
  .description('List available MCP tools')
  .action(async () => {
    try {
      const { TOOLS } = await import('../src/mcp/tools.js');

      console.log('Available ActiveMQ MCP Tools:');
      console.log('=============================');

      for (const tool of TOOLS) {
        console.log(`\n${tool.name}:`);
        console.log(`  Description: ${tool.description}`);
        console.log('  Parameters:');

        if (tool.inputSchema.properties) {
          for (const [param, schema] of Object.entries(tool.inputSchema.properties)) {
            const required = tool.inputSchema.required && tool.inputSchema.required.includes(param) ? ' (required)' : '';
            const defaultVal = schema.default ? ` [default: ${schema.default}]` : '';
            console.log(`    - ${param}: ${schema.type}${required}${defaultVal}`);
            if (schema.description) {
              console.log(`      ${schema.description}`);
            }
          }
        } else {
          console.log('    - No parameters');
        }
      }

      console.log(`\nTotal tools: ${TOOLS.length}`);

    } catch (error) {
      console.error('Failed to list tools:', error.message);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();

// If no command was provided and no options were given, show help
const parsedOptions = program.opts();
const hasOptions = Object.keys(parsedOptions).length > 0;
const hasCommand = program.args.length > 0;

if (!hasOptions && !hasCommand && process.argv.length <= 2) {
  program.help();
}
