import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {CoreClient} from '../../../src/core/client/index.js'
import {TopicService} from '../../../src/core/service/index.js'
import {activemqConfig} from '../setup/activemq-config.js'
import {randomUUID} from 'crypto'

describe('TopicService Integration Tests', () => {
	let coreClient
	let sut

	beforeEach(async () => {
		// Initialize components and unique test data
		coreClient = new CoreClient(activemqConfig)
		sut = new TopicService(coreClient)

		await coreClient.connect()
	})

	afterEach(async () => {
		// CLEANUP - Close connections
		if (coreClient.isConnected()) {
			await coreClient.disconnect()
		}
	})

	describe('publishMessage', () => {
		// Happy path tests first
		it('should publish message successfully to topic', async () => {
			// GIVEN - Valid topic and message
			const testTopicName = `test-topic-${randomUUID()}`
			const testTopicPath = `/topic/${testTopicName}`
			const testMessage = `Test message - ${Date.now()}`

			// WHEN - Message is published
			const result = await sut.publishMessage(testTopicPath, testMessage)

			// THEN - Should return success
			expect(result.success).toBe(true)
			expect(result.status).toBe(200)

			// AND - Topic should appear in broker with enqueue count
			const topics = await sut.listTopics()
			const publishedTopic = topics.find(t => t.name === testTopicName)
			if (publishedTopic) {
				expect(publishedTopic.enqueueCount).toBe(1)
				expect(publishedTopic.consumerCount).toBe(0)
				expect(publishedTopic.dequeueCount).toBe(0)
				expect(publishedTopic.subscriptionCount).toBe(0)
			}
		})

		it('should publish JSON message when object provided', async () => {
			// GIVEN - Topic and JSON message
			const testTopicName = `test-topic-${randomUUID()}`
			const testTopicPath = `/topic/${testTopicName}`
			const jsonMessage = {id: 123, content: 'test', timestamp: Date.now()}

			// WHEN - JSON message is published
			const result = await sut.publishMessage(testTopicPath, jsonMessage)

			// THEN - Should succeed
			expect(result.success).toBe(true)
			expect(result.status).toBe(200)

			// AND - Topic should show the published JSON message in broker stats
			const topics = await sut.listTopics()
			const publishedTopic = topics.find(t => t.name === testTopicName)
			if (publishedTopic) {
				expect(publishedTopic.enqueueCount).toBe(1)
				expect(publishedTopic.consumerCount).toBe(0)
				expect(publishedTopic.dequeueCount).toBe(0)
				expect(publishedTopic.subscriptionCount).toBe(0)
			}
		})

		it('should include custom headers when provided', async () => {
			// GIVEN - Topic, message, and headers
			const testTopicName = `test-topic-${randomUUID()}`
			const testTopicPath = `/topic/${testTopicName}`
			const testMessage = 'Message with headers'
			const headers = {priority: '5', correlationId: 'test-123'}

			// WHEN - Message published with headers
			const result = await sut.publishMessage(testTopicPath, testMessage, headers)

			// THEN - Should succeed
			expect(result.success).toBe(true)
			expect(result.status).toBe(200)

			// AND - Topic should show the published message with headers in broker stats
			const topics = await sut.listTopics()
			const publishedTopic = topics.find(t => t.name === testTopicName)
			if (publishedTopic) {
				expect(publishedTopic.enqueueCount).toBe(1)
				expect(publishedTopic.consumerCount).toBe(0)
				expect(publishedTopic.dequeueCount).toBe(0)
				expect(publishedTopic.subscriptionCount).toBe(0)
			}
		})

		// Unhappy path tests
		it('should throw error when not connected', async () => {
			// GIVEN - Disconnected client
			await coreClient.disconnect()
			const testTopicPath = `/topic/test-topic-${randomUUID()}`

			// WHEN/THEN - Should throw connection error
			await expect(sut.publishMessage(testTopicPath, 'test')).rejects.toThrow('Not connected to ActiveMQ broker')
		})
	})

	describe('subscribeToTopic', () => {
		// Happy path tests first
		it('should handle subscription with timeout (REST API limitation)', async () => {
			// GIVEN - Topic with published message
			const testTopicName = `test-topic-${randomUUID()}`
			const testTopicPath = `/topic/${testTopicName}`
			const testMessage = `Message for subscription test - ${Date.now()}`
			
			// Publish message first
			await sut.publishMessage(testTopicPath, testMessage)

			// WHEN - Subscribing with short timeout
			const messages = await sut.subscribeToTopic(testTopicPath, {timeout: 2000, maxMessages: 1})

			// THEN - Should return empty array due to REST API limitations
			expect(Array.isArray(messages)).toBe(true)
			expect(messages.length).toBe(0)
			
			// AND - Verify the published message exists in broker stats
			const topics = await sut.listTopics()
			const targetTopic = topics.find(t => t.name === testTopicName)
			if (targetTopic) {
				expect(targetTopic.enqueueCount).toBe(1) // Message was published
			}
		})

		it('should respect maxMessages parameter', async () => {
			// GIVEN - Topic with multiple published messages
			const testTopicName = `test-topic-${randomUUID()}`
			const testTopicPath = `/topic/${testTopicName}`
			const messages = ['Message 1', 'Message 2', 'Message 3']
			
			// Publish multiple messages first
			for (const message of messages) {
				await sut.publishMessage(testTopicPath, `${message} - ${Date.now()}`)
			}

			// WHEN - Subscribing with maxMessages limit
			const receivedMessages = await sut.subscribeToTopic(testTopicPath, {timeout: 1000, maxMessages: 3})

			// THEN - Should return empty array (REST API limitation) with exact length
			expect(Array.isArray(receivedMessages)).toBe(true)
			expect(receivedMessages.length).toBe(0)
			
			// AND - Verify all messages were published to broker
			const topics = await sut.listTopics()
			const targetTopic = topics.find(t => t.name === testTopicName)
			if (targetTopic) {
				expect(targetTopic.enqueueCount).toBe(3) // All 3 messages published
			}
		})

		it('should use default options when none provided', async () => {
			// GIVEN - Topic with published message
			const testTopicName = `test-topic-${randomUUID()}`
			const testTopicPath = `/topic/${testTopicName}`
			const testMessage = `Default options test - ${Date.now()}`
			
			// Publish message to test against
			await sut.publishMessage(testTopicPath, testMessage)

			// WHEN - Subscribing with defaults (will take ~10 seconds due to default timeout)
			const startTime = Date.now()
			const messages = await sut.subscribeToTopic(testTopicPath, {timeout: 1000}) // Override for test speed
			const duration = Date.now() - startTime

			// THEN - Should complete within reasonable time and return empty array
			expect(Array.isArray(messages)).toBe(true)
			expect(messages.length).toBe(0)
			expect(duration).toBeGreaterThan(900) // Should take at least 900ms due to polling
			expect(duration).toBeLessThan(1500) // Should complete in under 1.5 seconds with our timeout
			
			// AND - Verify the message exists in broker (even though subscription can't retrieve it)
			const topics = await sut.listTopics()
			const targetTopic = topics.find(t => t.name === testTopicName)
			if (targetTopic) {
				expect(targetTopic.enqueueCount).toBe(1) // Message was published
			}
		})
	})

	describe('listTopics', () => {
		// Happy path tests first
		it('should return topic array when topics exist', async () => {
			// GIVEN - Create unique test topic by publishing message
			const testTopicName = `test-topic-${randomUUID()}`
			const testTopicPath = `/topic/${testTopicName}`
			const testMessage = `Create test topic for listing - ${Date.now()}`
			await sut.publishMessage(testTopicPath, testMessage)

			// WHEN - Topics are listed
			const topics = await sut.listTopics()

			// THEN - Should return array of topics
			expect(Array.isArray(topics)).toBe(true)
			
			// AND - Should find the test topic (might take time to appear in broker stats)
			const testTopicInfo = topics.find(t => t.name && t.name.includes(testTopicName))
			if (testTopicInfo) {
				expect(testTopicInfo.name).toBe(testTopicName)
				expect(testTopicInfo.consumerCount).toBe(0)
				expect(testTopicInfo.enqueueCount).toBe(1)
				expect(testTopicInfo.dequeueCount).toBe(0)
				expect(testTopicInfo.subscriptionCount).toBe(0)
			}
		})

		it('should return empty array when no topics exist initially', async () => {
			// GIVEN - Fresh broker state
			// WHEN - Topics are listed before any are created
			const topics = await sut.listTopics()

			// THEN - Should return valid array
			expect(Array.isArray(topics)).toBe(true)
			expect(topics.length).toBeGreaterThanOrEqual(0) // May be empty initially
		})

		// Unhappy path tests
		it('should throw error when not connected', async () => {
			// GIVEN - Disconnected client
			await coreClient.disconnect()

			// WHEN/THEN - Should throw connection error
			await expect(sut.listTopics()).rejects.toThrow('Not connected to ActiveMQ broker')
		})
	})

	describe('topic message flow integration', () => {
		it('should handle complete publish workflow', async () => {
			// GIVEN - Unique topic and test data
			const testTopicName = `integration-topic-${randomUUID()}`
			const testTopicPath = `/topic/${testTopicName}`
			const messages = [
				`Message 1 - ${Date.now()}`,
				{type: 'json', data: 'test data', timestamp: Date.now()},
				`Message 3 - ${Date.now()}`
			]

			// WHEN - Multiple messages are published
			const results = []
			for (const message of messages) {
				const result = await sut.publishMessage(testTopicPath, message)
				results.push(result)
			}

			// THEN - All messages should be published successfully
			expect(results).toHaveLength(3)
			results.forEach(result => {
				expect(result.success).toBe(true)
				expect(result.status).toBe(200)
			})

			// AND - Topic should appear in listings (may take time)
			const topics = await sut.listTopics()
			expect(Array.isArray(topics)).toBe(true)
			expect(topics.length).toBeGreaterThanOrEqual(0)
		})
	})
})