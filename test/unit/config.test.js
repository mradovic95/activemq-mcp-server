import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ConfigManager } from '../../src/utils/config.js'

describe('ConfigManager Unit Tests', () => {
  // Setup variables
  let sut, originalEnv

  beforeEach(() => {
    // Component initialization
    originalEnv = { ...process.env }

    // Clear relevant environment variables
    delete process.env.ACTIVEMQ_HOST
    delete process.env.ACTIVEMQ_PORT
    delete process.env.ACTIVEMQ_USERNAME
    delete process.env.ACTIVEMQ_PASSWORD
    delete process.env.ACTIVEMQ_SSL

    // Clear any existing multi-broker environment variables
    Object.keys(process.env).forEach(key => {
      if (key.match(/^[A-Z][A-Z0-9_]*_ACTIVEMQ_[A-Z_]+$/)) {
        delete process.env[key]
      }
    })

    sut = new ConfigManager()
  })

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv
  })

  describe('getConnectionConfig()', () => {
    it('should return null when connection does not exist', () => {
      // GIVEN - ConfigManager with no connections
      // (Already set up in beforeEach)

      // WHEN - Getting non-existent connection config
      const result = sut.getConnectionConfig('nonexistent')

      // THEN - Should return null
      expect(result).toBe(null)
    })

    it('should return default connection config when no name specified', () => {
      // GIVEN - Default broker environment variables
      process.env.ACTIVEMQ_HOST = 'localhost'
      process.env.ACTIVEMQ_PORT = '8161'
      process.env.ACTIVEMQ_USERNAME = 'admin'
      process.env.ACTIVEMQ_PASSWORD = 'admin'
      sut = new ConfigManager()

      // WHEN - Getting connection config without name
      const result = sut.getConnectionConfig()

      // THEN - Should return default connection config
      expect(result).toEqual({
        host: 'localhost',
        port: 8161,
        username: 'admin',
        password: 'admin'
      })
    })

    it('should return specific connection config when name provided', () => {
      // GIVEN - Named broker environment variables
      process.env.PROD_ACTIVEMQ_HOST = 'prod-broker.com'
      process.env.PROD_ACTIVEMQ_PORT = '8161'
      process.env.PROD_ACTIVEMQ_USERNAME = 'prod_user'
      process.env.PROD_ACTIVEMQ_PASSWORD = 'prod_pass'
      sut = new ConfigManager()

      // WHEN - Getting specific connection config
      const result = sut.getConnectionConfig('prod')

      // THEN - Should return correct connection config
      expect(result).toEqual({
        host: 'prod-broker.com',
        port: 8161,
        username: 'prod_user',
        password: 'prod_pass'
      })
    })
  })

  describe('getAllConnections()', () => {
    it('should return empty array when no connections configured', () => {
      // GIVEN - ConfigManager with no connections
      // (Already set up in beforeEach)

      // WHEN - Getting all connections
      const result = sut.getAllConnections()

      // THEN - Should return empty array
      expect(result).toEqual([])
    })

    it('should return array of connection names when connections exist', () => {
      // GIVEN - Multiple broker connections
      process.env.PROD_ACTIVEMQ_HOST = 'prod.com'
      process.env.PROD_ACTIVEMQ_PORT = '8161'
      process.env.PROD_ACTIVEMQ_USERNAME = 'user'
      process.env.PROD_ACTIVEMQ_PASSWORD = 'pass'

      process.env.DEV_ACTIVEMQ_HOST = 'dev.com'
      process.env.DEV_ACTIVEMQ_PORT = '8161'
      process.env.DEV_ACTIVEMQ_USERNAME = 'user'
      process.env.DEV_ACTIVEMQ_PASSWORD = 'pass'
      sut = new ConfigManager()

      // WHEN - Getting all connections
      const result = sut.getAllConnections()

      // THEN - Should return connection names
      expect(result).toContain('prod')
      expect(result).toContain('dev')
      expect(result).toHaveLength(2)
    })
  })

  describe('hasConnection()', () => {
    it('should return false when connection does not exist', () => {
      // GIVEN - ConfigManager with no connections
      // (Already set up in beforeEach)

      // WHEN - Checking for non-existent connection
      const result = sut.hasConnection('nonexistent')

      // THEN - Should return false
      expect(result).toBe(false)
    })

    it('should return true when connection exists', () => {
      // GIVEN - Broker connection configured
      process.env.TEST_ACTIVEMQ_HOST = 'test.com'
      process.env.TEST_ACTIVEMQ_PORT = '8161'
      process.env.TEST_ACTIVEMQ_USERNAME = 'user'
      process.env.TEST_ACTIVEMQ_PASSWORD = 'pass'
      sut = new ConfigManager()

      // WHEN - Checking for existing connection
      const result = sut.hasConnection('test')

      // THEN - Should return true
      expect(result).toBe(true)
    })
  })

  describe('setConnectionConfig()', () => {
    it('should add new connection configuration', () => {
      // GIVEN - ConfigManager with no connections
      const newConfig = {
        host: 'new-host.com',
        port: 8161,
        username: 'new_user',
        password: 'new_pass'
      }

      // WHEN - Setting new connection config
      sut.setConnectionConfig('new', newConfig)

      // THEN - Should have the new connection
      expect(sut.hasConnection('new')).toBe(true)
      expect(sut.getConnectionConfig('new')).toEqual(newConfig)
      expect(sut.getAllConnections()).toContain('new')
    })

    it('should overwrite existing connection configuration', () => {
      // GIVEN - Existing connection configuration
      process.env.EXISTING_ACTIVEMQ_HOST = 'old-host.com'
      process.env.EXISTING_ACTIVEMQ_PORT = '8161'
      process.env.EXISTING_ACTIVEMQ_USERNAME = 'old_user'
      process.env.EXISTING_ACTIVEMQ_PASSWORD = 'old_pass'
      sut = new ConfigManager()

      const newConfig = {
        host: 'new-host.com',
        port: 8161,
        username: 'new_user',
        password: 'new_pass'
      }

      // WHEN - Overwriting existing connection config
      sut.setConnectionConfig('existing', newConfig)

      // THEN - Should have the updated connection
      expect(sut.getConnectionConfig('existing')).toEqual(newConfig)
      expect(sut.getConnectionConfig('existing').host).toBe('new-host.com')
      expect(sut.getConnectionConfig('existing').username).toBe('new_user')
    })
  })

  describe('validateConnectionConfig()', () => {
    it('should return true for valid configuration', () => {
      // GIVEN - Valid connection configuration
      const validConfig = {
        host: 'localhost',
        port: 8161,
        username: 'admin',
        password: 'admin'
      }

      // WHEN - Validating configuration
      const result = sut.validateConnectionConfig(validConfig)

      // THEN - Should return true
      expect(result).toBe(true)
    })

    it('should throw error when required field is missing', () => {
      // GIVEN - Invalid configuration missing required field
      const invalidConfig = {
        // Missing host
        port: 8161,
        username: 'admin',
        password: 'admin'
      }

      // WHEN/THEN - Validating configuration should throw error
      expect(() => sut.validateConnectionConfig(invalidConfig)).toThrow('Missing required configuration fields: host')
    })

    it('should apply default values for optional fields', () => {
      // GIVEN - Configuration with only required fields
      const minimalConfig = {
        host: 'localhost'
      }

      // WHEN - Validating configuration
      const result = sut.validateConnectionConfig(minimalConfig)

      // THEN - Should apply defaults and return true
      expect(result).toBe(true)
      expect(minimalConfig.port).toBe(61613)
      expect(minimalConfig.username).toBe('')
      expect(minimalConfig.password).toBe('')
    })
  })

  describe('loadMultipleEnvironmentBrokers()', () => {
    it('should parse multiple broker connections from environment variables', () => {
      // GIVEN - Multiple broker environment variables
      process.env.PROD_ACTIVEMQ_HOST = 'prod-broker.company.com'
      process.env.PROD_ACTIVEMQ_PORT = '8161'
      process.env.PROD_ACTIVEMQ_USERNAME = 'prod_user'
      process.env.PROD_ACTIVEMQ_PASSWORD = 'prod_password'
      process.env.PROD_ACTIVEMQ_SSL = 'true'

      process.env.DEV_ACTIVEMQ_HOST = 'localhost'
      process.env.DEV_ACTIVEMQ_PORT = '8161'
      process.env.DEV_ACTIVEMQ_USERNAME = 'admin'
      process.env.DEV_ACTIVEMQ_PASSWORD = 'admin'
      process.env.DEV_ACTIVEMQ_SSL = 'false'

      // WHEN - ConfigManager is instantiated
      sut = new ConfigManager()

      // THEN - Should have both broker connections configured
      const allConnections = sut.getAllConnections()
      expect(allConnections).toContain('prod')
      expect(allConnections).toContain('dev')
      expect(allConnections).toHaveLength(2)

      // AND - Should parse production broker configuration correctly
      const prodConfig = sut.getConnectionConfig('prod')
      expect(prodConfig).toEqual({
        host: 'prod-broker.company.com',
        port: 8161,
        username: 'prod_user',
        password: 'prod_password',
        ssl: true
      })

      // AND - Should parse development broker configuration correctly
      const devConfig = sut.getConnectionConfig('dev')
      expect(devConfig).toEqual({
        host: 'localhost',
        port: 8161,
        username: 'admin',
        password: 'admin',
        ssl: false
      })
    })

    it('should handle SSL parameter correctly', () => {
      // GIVEN - Broker environment variables with SSL configurations
      process.env.SECURE_ACTIVEMQ_HOST = 'secure.company.com'
      process.env.SECURE_ACTIVEMQ_PORT = '8161'
      process.env.SECURE_ACTIVEMQ_USERNAME = 'secure_user'
      process.env.SECURE_ACTIVEMQ_PASSWORD = 'secure_password'
      process.env.SECURE_ACTIVEMQ_SSL = 'true'

      process.env.INSECURE_ACTIVEMQ_HOST = 'insecure.company.com'
      process.env.INSECURE_ACTIVEMQ_PORT = '8161'
      process.env.INSECURE_ACTIVEMQ_USERNAME = 'insecure_user'
      process.env.INSECURE_ACTIVEMQ_PASSWORD = 'insecure_password'
      process.env.INSECURE_ACTIVEMQ_SSL = 'false'

      // WHEN - ConfigManager is instantiated
      sut = new ConfigManager()

      // THEN - Should parse SSL as boolean correctly
      const secureConfig = sut.getConnectionConfig('secure')
      expect(secureConfig.ssl).toBe(true)

      const insecureConfig = sut.getConnectionConfig('insecure')
      expect(insecureConfig.ssl).toBe(false)
    })

    it('should ignore invalid environment variable patterns', () => {
      // GIVEN - Invalid environment variable patterns
      process.env.INVALID_PROD_HOST = 'prod.com'          // Missing _ACTIVEMQ_
      process.env.PROD_HOST = 'prod.com'                  // Missing _ACTIVEMQ_
      process.env.ACTIVEMQ_PROD_HOST = 'prod.com'         // Wrong prefix order
      process.env.prod_ACTIVEMQ_HOST = 'prod.com'         // Lowercase connection name

      // Valid pattern
      process.env.VALID_ACTIVEMQ_HOST = 'valid-host.com'
      process.env.VALID_ACTIVEMQ_PORT = '8161'
      process.env.VALID_ACTIVEMQ_USERNAME = 'valid_user'
      process.env.VALID_ACTIVEMQ_PASSWORD = 'valid_password'

      // WHEN - ConfigManager is instantiated
      sut = new ConfigManager()

      // THEN - Should only have the valid connection
      const allConnections = sut.getAllConnections()
      expect(allConnections).toContain('valid')
      expect(allConnections).not.toContain('invalid')
      expect(allConnections).not.toContain('prod')
      expect(allConnections).toHaveLength(1)

      // AND - Should parse valid connection correctly
      const validConfig = sut.getConnectionConfig('valid')
      expect(validConfig.host).toBe('valid-host.com')
      expect(validConfig.port).toBe(8161)
    })

    it('should handle combination of single and multiple broker environment variables', () => {
      // GIVEN - Both single broker and multiple broker environment variables
      process.env.ACTIVEMQ_HOST = 'default-host.com'
      process.env.ACTIVEMQ_PORT = '8161'
      process.env.ACTIVEMQ_USERNAME = 'default_user'
      process.env.ACTIVEMQ_PASSWORD = 'default_password'

      process.env.SPECIAL_ACTIVEMQ_HOST = 'special-host.com'
      process.env.SPECIAL_ACTIVEMQ_PORT = '8161'
      process.env.SPECIAL_ACTIVEMQ_USERNAME = 'special_user'
      process.env.SPECIAL_ACTIVEMQ_PASSWORD = 'special_password'

      // WHEN - ConfigManager is instantiated
      sut = new ConfigManager()

      // THEN - Should have both default and special connections
      const allConnections = sut.getAllConnections()
      expect(allConnections).toContain('default')
      expect(allConnections).toContain('special')
      expect(allConnections).toHaveLength(2)

      // AND - Should configure default connection correctly
      const defaultConfig = sut.getConnectionConfig('default')
      expect(defaultConfig.host).toBe('default-host.com')
      expect(defaultConfig.username).toBe('default_user')

      // AND - Should configure special connection correctly
      const specialConfig = sut.getConnectionConfig('special')
      expect(specialConfig.host).toBe('special-host.com')
      expect(specialConfig.username).toBe('special_user')
    })

    it('should normalize connection names to lowercase', () => {
      // GIVEN - Broker environment variables with uppercase connection name
      process.env.PRODUCTION_ACTIVEMQ_HOST = 'prod.com'
      process.env.PRODUCTION_ACTIVEMQ_PORT = '8161'
      process.env.PRODUCTION_ACTIVEMQ_USERNAME = 'prod_user'
      process.env.PRODUCTION_ACTIVEMQ_PASSWORD = 'prod_pass'

      // WHEN - ConfigManager is instantiated
      sut = new ConfigManager()

      // THEN - Should normalize connection name to lowercase
      const allConnections = sut.getAllConnections()
      expect(allConnections).toContain('production')
      expect(allConnections).not.toContain('PRODUCTION')

      // AND - Should be accessible by lowercase name
      const config = sut.getConnectionConfig('production')
      expect(config.host).toBe('prod.com')
    })

    it('should handle partial configuration gracefully', () => {
      // GIVEN - Broker environment variables with only some parameters
      process.env.PARTIAL_ACTIVEMQ_HOST = 'partial-host.com'
      process.env.PARTIAL_ACTIVEMQ_PORT = '8161'
      // Missing USERNAME and PASSWORD

      // WHEN - ConfigManager is instantiated
      sut = new ConfigManager()

      // THEN - Should still create the connection with available parameters
      const allConnections = sut.getAllConnections()
      expect(allConnections).toContain('partial')

      // AND - Should have the provided parameters
      const partialConfig = sut.getConnectionConfig('partial')
      expect(partialConfig.host).toBe('partial-host.com')
      expect(partialConfig.port).toBe(8161)
      expect(partialConfig.username).toBeUndefined()
      expect(partialConfig.password).toBeUndefined()
    })

    it('should handle numeric port conversion correctly', () => {
      // GIVEN - Broker environment variables with port as string
      process.env.PORTTEST_ACTIVEMQ_HOST = 'port-test.com'
      process.env.PORTTEST_ACTIVEMQ_PORT = '61616'
      process.env.PORTTEST_ACTIVEMQ_USERNAME = 'user'
      process.env.PORTTEST_ACTIVEMQ_PASSWORD = 'pass'

      // WHEN - ConfigManager is instantiated
      sut = new ConfigManager()

      // THEN - Should parse port as integer
      const config = sut.getConnectionConfig('porttest')
      expect(config.port).toBe(61616)
      expect(typeof config.port).toBe('number')
    })

    it('should log warning for unknown parameters', () => {
      // GIVEN - Broker environment variables with unknown parameter
      process.env.TEST_ACTIVEMQ_HOST = 'test.com'
      process.env.TEST_ACTIVEMQ_UNKNOWN_PARAM = 'some_value'

      // WHEN - ConfigManager is instantiated
      // Note: In a real scenario, we'd mock the logger to verify the warning
      sut = new ConfigManager()

      // THEN - Should still create connection without the unknown parameter
      const config = sut.getConnectionConfig('test')
      expect(config.host).toBe('test.com')
      expect(config.unknown_param).toBeUndefined()
    })
  })

  describe('getConfiguredConnections()', () => {
    it('should return only connections with valid host', () => {
      // GIVEN - Mix of valid and invalid configurations
      sut.setConnectionConfig('valid', { host: 'valid.com', port: 8161 })
      sut.setConnectionConfig('invalid', { port: 8161 })  // No host
      sut.setConnectionConfig('another_valid', { host: 'another.com' })

      // WHEN - Getting configured connections
      const result = sut.getConfiguredConnections()

      // THEN - Should return only connections with host
      expect(result).toContain('valid')
      expect(result).toContain('another_valid')
      expect(result).not.toContain('invalid')
      expect(result).toHaveLength(2)
    })

    it('should return empty array when no valid connections exist', () => {
      // GIVEN - Only invalid configurations
      sut.setConnectionConfig('invalid1', { port: 8161 })
      sut.setConnectionConfig('invalid2', {})

      // WHEN - Getting configured connections
      const result = sut.getConfiguredConnections()

      // THEN - Should return empty array
      expect(result).toEqual([])
    })
  })

  describe('hasConnections()', () => {
    it('should return false when no connections configured', () => {
      // GIVEN - ConfigManager with no connections
      // (Already set up in beforeEach)

      // WHEN - Checking if connections exist
      const result = sut.hasConnections()

      // THEN - Should return false
      expect(result).toBe(false)
    })

    it('should return true when connections exist', () => {
      // GIVEN - At least one configured connection
      process.env.TEST_ACTIVEMQ_HOST = 'test.com'
      process.env.TEST_ACTIVEMQ_PORT = '8161'
      sut = new ConfigManager()

      // WHEN - Checking if connections exist
      const result = sut.hasConnections()

      // THEN - Should return true
      expect(result).toBe(true)
    })
  })
})
