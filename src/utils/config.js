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
      logger.info('Environment variables loaded into configuration')
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