import { readFileSync, existsSync } from 'fs'
import { logger } from './logger.js'

export class ConfigManager {
  constructor() {
    this.config = {}
    this.loadConfig()
  }

  loadConfig() {
    const configPaths = [
      './activemq-config.json',
      './config.json',
      process.env.ACTIVEMQ_CONFIG_PATH
    ].filter(Boolean)

    for (const path of configPaths) {
      if (existsSync(path)) {
        try {
          const fileContent = readFileSync(path, 'utf8')
          this.config = JSON.parse(fileContent)
          logger.info(`Configuration loaded from ${path}`)
          break
        } catch (error) {
          logger.warn(`Failed to load config from ${path}:`, error.message)
        }
      }
    }

    this.loadEnvironmentVariables()
  }

  loadEnvironmentVariables() {
    // Load default/single broker environment variables
    const envConfig = {}

    if (process.env.ACTIVEMQ_HOST) {
      envConfig.host = process.env.ACTIVEMQ_HOST
    }
    if (process.env.ACTIVEMQ_PORT) {
      envConfig.port = parseInt(process.env.ACTIVEMQ_PORT, 10)
    }
    if (process.env.ACTIVEMQ_USERNAME) {
      envConfig.username = process.env.ACTIVEMQ_USERNAME
    }
    if (process.env.ACTIVEMQ_PASSWORD) {
      envConfig.password = process.env.ACTIVEMQ_PASSWORD
    }
    if (process.env.ACTIVEMQ_SSL) {
      envConfig.ssl = process.env.ACTIVEMQ_SSL === 'true'
    }

    if (Object.keys(envConfig).length > 0) {
      this.config.default = { ...this.config.default, ...envConfig }
      logger.info('Default environment variables loaded into configuration')
    }

    // Load multiple broker environment variables using {CONNECTION_NAME}_ACTIVEMQ_{PARAMETER} pattern
    this.loadMultipleEnvironmentBrokers()
  }

  loadMultipleEnvironmentBrokers() {
    const envVars = process.env
    const brokerConnections = {}

    // Find all environment variables matching the pattern {CONNECTION_NAME}_ACTIVEMQ_{PARAMETER}
    const activemqEnvPattern = /^([A-Z][A-Z0-9_]*)_ACTIVEMQ_([A-Z_]+)$/

    for (const [envVar, value] of Object.entries(envVars)) {
      const match = envVar.match(activemqEnvPattern)
      if (match) {
        const [, connectionName, parameter] = match
        const normalizedConnectionName = connectionName.toLowerCase()

        if (!brokerConnections[normalizedConnectionName]) {
          brokerConnections[normalizedConnectionName] = {}
        }

        // Map environment variable parameters to config parameters
        switch (parameter) {
          case 'HOST':
            brokerConnections[normalizedConnectionName].host = value
            break
          case 'PORT':
            brokerConnections[normalizedConnectionName].port = parseInt(value, 10)
            break
          case 'USERNAME':
            brokerConnections[normalizedConnectionName].username = value
            break
          case 'PASSWORD':
            brokerConnections[normalizedConnectionName].password = value
            break
          case 'SSL':
            brokerConnections[normalizedConnectionName].ssl = value.toLowerCase() === 'true'
            break
          default:
            logger.warn(`Unknown ActiveMQ environment variable parameter: ${parameter} for connection ${connectionName}`)
        }
      }
    }

    // Add discovered connections to config
    const connectionCount = Object.keys(brokerConnections).length
    if (connectionCount > 0) {
      for (const [connectionName, config] of Object.entries(brokerConnections)) {
        // Don't overwrite existing file-based configurations
        if (!this.config[connectionName]) {
          this.config[connectionName] = config
        } else {
          // Merge with existing config, with env vars taking precedence
          this.config[connectionName] = { ...this.config[connectionName], ...config }
        }
      }
      logger.info(`Multiple broker environment variables loaded: ${connectionCount} connections (${Object.keys(brokerConnections).join(', ')})`)
    }
  }

  getConnectionConfig(name = 'default') {
    return this.config[name] || null
  }

  getAllConnections() {
    return Object.keys(this.config)
  }

  setConnectionConfig(name, config) {
    this.config[name] = config
  }

  hasConnection(name) {
    return name in this.config
  }

  validateConnectionConfig(config) {
    const required = ['host']
    const missing = required.filter(field => !config[field])

    if (missing.length > 0) {
      throw new Error(`Missing required configuration fields: ${missing.join(', ')}`)
    }

    // Set defaults
    if (!config.port) {
      config.port = 61613
    }
    if (!config.username) {
      config.username = ''
    }
    if (!config.password) {
      config.password = ''
    }

    return true
  }

  // Get all configured connection names
  getConfiguredConnections() {
    return Object.keys(this.config).filter(name => 
      this.config[name] && typeof this.config[name] === 'object' && this.config[name].host
    )
  }

  // Check if any connections are configured
  hasConnections() {
    return this.getConfiguredConnections().length > 0
  }
}

export const configManager = new ConfigManager()