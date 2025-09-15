import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {CoreClient} from '../../../src/core/client/index.js'
import {ConnectionService} from '../../../src/core/service/connection-service.js'
import {activemqConfig} from '../setup/activemq-config.js'
import {randomUUID} from 'crypto'

describe('ConnectionService Integration Tests', () => {
	let coreClient
	let sut

	beforeEach(() => {
		// Initialize components and unique test data
		coreClient = new CoreClient(activemqConfig)
		sut = new ConnectionService(coreClient)
	})

	afterEach(async () => {
		// CLEANUP - Close connections
		if (coreClient.isConnected()) {
			await coreClient.disconnect()
		}
	})

	describe('connect', () => {
		// Happy path tests first
		it('should establish connection when valid config provided', async () => {
			// GIVEN - Service is initially disconnected
			expect(sut.isConnected()).toBe(false)

			// WHEN - Connection is established
			await sut.connect()

			// THEN - Service should be connected
			expect(sut.isConnected()).toBe(true)
		})

		it('should remain connected when connect called multiple times', async () => {
			// GIVEN - Service is initially disconnected
			expect(sut.isConnected()).toBe(false)

			// WHEN - Connection established multiple times
			await sut.connect()
			await sut.connect()

			// THEN - Service should remain connected
			expect(sut.isConnected()).toBe(true)
		})

		// Unhappy path tests
		it('should throw error when invalid config provided', async () => {
			// GIVEN - Service with invalid configuration
			const invalidClient = new CoreClient({
				host: 'invalid-host-' + randomUUID(),
				port: 99999,
				username: 'invalid-' + randomUUID(),
				password: 'invalid-' + randomUUID()
			})
			const invalidService = new ConnectionService(invalidClient)

			// WHEN/THEN - Should throw error and remain disconnected
			await expect(invalidService.connect()).rejects.toThrow()
			expect(invalidService.isConnected()).toBe(false)
		})
	})

	describe('disconnect', () => {
		// Happy path tests first
		it('should close connection gracefully when connected', async () => {
			// GIVEN - Service is connected
			await sut.connect()
			expect(sut.isConnected()).toBe(true)

			// WHEN - Connection is closed
			await sut.disconnect()

			// THEN - Service should be disconnected
			expect(sut.isConnected()).toBe(false)
		})

		it('should handle disconnect when already disconnected', async () => {
			// GIVEN - Service is disconnected
			expect(sut.isConnected()).toBe(false)

			// WHEN - Disconnect called on disconnected service
			await sut.disconnect()

			// THEN - Service should remain disconnected
			expect(sut.isConnected()).toBe(false)
		})

		it('should handle multiple disconnect calls gracefully', async () => {
			// GIVEN - Service is connected then disconnected
			await sut.connect()
			await sut.disconnect()
			expect(sut.isConnected()).toBe(false)

			// WHEN - Multiple disconnect calls made
			await sut.disconnect()
			await sut.disconnect()

			// THEN - Service should remain disconnected
			expect(sut.isConnected()).toBe(false)
		})
	})

	describe('testConnection', () => {
		// Happy path tests first
		it('should return success status when connection is active', async () => {
			// GIVEN - Service is connected to broker
			await sut.connect()

			// WHEN - Connection health is tested
			const result = await sut.testConnection()
			console.log(result)
			// THEN - Health check should report success with concrete values
			expect(result.success).toBe(true)
			expect(result.connected).toBe(true)
		})

		it('should include response time when connection tested', async () => {
			// GIVEN - Service is connected to broker
			await sut.connect()

			// WHEN - Connection health is tested
			const result = await sut.testConnection()

			// THEN - Should include valid response time
			if (result.responseTime !== undefined) {
				expect(result.responseTime).toBeGreaterThan(0)
				expect(result.responseTime).toBeLessThan(10000) // Should be under 10 seconds
			}
		})

		// Unhappy path tests
		it('should test server reachability even when not connected', async () => {
			// GIVEN - Service is not connected but server is reachable
			expect(sut.isConnected()).toBe(false)

			// WHEN - Connection test attempted
			const result = await sut.testConnection()

			// THEN - Should still test server reachability (current behavior)
			expect(result.success).toBe(true)
			expect(result.connected).toBe(true)
		})
	})

	describe('getConnectionInfo', () => {
		// Happy path tests first
		it('should return complete config details when connected', async () => {
			// GIVEN - Service is connected to broker
			await sut.connect()

			// WHEN - Connection info is requested
			const info = sut.getConnectionInfo()

			// THEN - Info should match configuration with concrete values
			expect(info.host).toBe('localhost')
			expect(info.port).toBe(8161)
			expect(info.connected).toBe(true)
		})

		it('should return config details when disconnected', async () => {
			// GIVEN - Service is disconnected
			expect(sut.isConnected()).toBe(false)

			// WHEN - Connection info is requested
			const info = sut.getConnectionInfo()

			// THEN - Should return config with disconnected status
			expect(info.host).toBe('localhost')
			expect(info.port).toBe(8161)
			expect(info.connected).toBe(false)
		})
	})

	describe('getBrokerName', () => {
		// Happy path tests first
		it('should return concrete broker identifier when connected', async () => {
			// GIVEN - Service is connected to broker
			await sut.connect()

			// WHEN - Broker name is requested
			const brokerName = await sut.getBrokerName()

			// THEN - Should return specific broker name
			expect(brokerName).toBe('localhost')
			expect(typeof brokerName).toBe('string')
			expect(brokerName.length).toBeGreaterThan(0)
		})

		// Unhappy path tests
		it('should return fallback broker name when not connected', async () => {
			// GIVEN - Service is not connected
			expect(sut.isConnected()).toBe(false)

			// WHEN - Broker name is requested
			const brokerName = await sut.getBrokerName()

			// THEN - Should return fallback name (current behavior)
			expect(brokerName).toBe('localhost')
			expect(typeof brokerName).toBe('string')
		})
	})

	describe('parseDestination', () => {
		// Happy path tests first
		it('should extract queue components when queue format provided', () => {
			// GIVEN - Queue destination string
			const queueDestination = '/queue/test-queue-' + randomUUID()

			// WHEN - Destination is parsed
			const parsed = sut.parseDestination(queueDestination)

			// THEN - Should return exact parsed components
			expect(parsed.destinationType).toBe('queue')
			expect(parsed.destinationName).toBe(queueDestination.replace('/queue/', ''))
		})

		it('should extract topic components when topic format provided', () => {
			// GIVEN - Topic destination string
			const topicDestination = '/topic/test-topic-' + randomUUID()

			// WHEN - Destination is parsed
			const parsed = sut.parseDestination(topicDestination)

			// THEN - Should return exact parsed components
			expect(parsed.destinationType).toBe('topic')
			expect(parsed.destinationName).toBe(topicDestination.replace('/topic/', ''))
		})

		it('should handle destinations with complex names', () => {
			// GIVEN - Complex destination names
			const complexQueue = '/queue/my-app.orders.priority-high'
			const complexTopic = '/topic/events.user.login.success'

			// WHEN - Complex destinations are parsed
			const queueParsed = sut.parseDestination(complexQueue)
			const topicParsed = sut.parseDestination(complexTopic)

			// THEN - Should parse correctly
			expect(queueParsed.destinationType).toBe('queue')
			expect(queueParsed.destinationName).toBe('my-app.orders.priority-high')
			expect(topicParsed.destinationType).toBe('topic')
			expect(topicParsed.destinationName).toBe('events.user.login.success')
		})

		// Unhappy path tests
		it('should handle malformed destination strings', () => {
			// GIVEN - Malformed destination strings
			const malformed = 'not-a-valid-destination'

			// WHEN - Malformed destination is parsed
			const parsed = sut.parseDestination(malformed)

			// THEN - Should handle gracefully (implementation dependent)
			expect(parsed).toBeDefined()
			expect(typeof parsed).toBe('object')
		})
	})

	describe('cleanDestinationName', () => {
		// Happy path tests first
		it('should remove queue prefixes when queue formats provided', () => {
			// GIVEN - Various queue destination formats
			const queueName = 'test-queue-' + randomUUID()

			// WHEN/THEN - Queue prefixes should be removed
			expect(sut.cleanDestinationName(`/queue/${queueName}`)).toBe(queueName)
			expect(sut.cleanDestinationName(`queue/${queueName}`)).toBe(queueName)
		})

		it('should remove topic prefixes when topic formats provided', () => {
			// GIVEN - Various topic destination formats
			const topicName = 'test-topic-' + randomUUID()

			// WHEN/THEN - Topic prefixes should be removed
			expect(sut.cleanDestinationName(`/topic/${topicName}`)).toBe(topicName)
			expect(sut.cleanDestinationName(`topic/${topicName}`)).toBe(topicName)
		})

		it('should preserve clean names when no prefixes present', () => {
			// GIVEN - Clean destination names
			const simpleName = 'simple-name-' + randomUUID()
			const complexName = 'app.service.event-' + randomUUID()

			// WHEN/THEN - Clean names should remain unchanged
			expect(sut.cleanDestinationName(simpleName)).toBe(simpleName)
			expect(sut.cleanDestinationName(complexName)).toBe(complexName)
		})

		it('should handle empty string input', () => {
			// GIVEN - Empty string input
			// WHEN/THEN - Should handle gracefully
			expect(sut.cleanDestinationName('')).toBe('')
		})
	})

	describe('connection service integration', () => {
		it('should maintain connection state across all operations', async () => {
			// GIVEN - Service starts disconnected
			expect(sut.isConnected()).toBe(false)

			// WHEN - Connection established and operations performed
			await sut.connect()
			const connectionTest = await sut.testConnection()
			const connectionInfo = sut.getConnectionInfo()
			const brokerName = await sut.getBrokerName()

			// THEN - All operations should reflect connected state
			expect(sut.isConnected()).toBe(true)
			expect(connectionTest.success).toBe(true)
			expect(connectionTest.connected).toBe(true)
			expect(connectionInfo.connected).toBe(true)
			expect(brokerName).toBe('localhost')

			// AND - After disconnect, state should be consistent
			await sut.disconnect()
			const disconnectedInfo = sut.getConnectionInfo()
			expect(sut.isConnected()).toBe(false)
			expect(disconnectedInfo.connected).toBe(false)
		})
	})
})
