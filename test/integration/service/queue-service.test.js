import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {CoreClient} from '../../../src/core/client/index.js'
import {QueueService} from '../../../src/core/service/index.js'
import {activemqConfig} from '../setup/activemq-config.js'
import {randomUUID} from 'crypto'

describe('QueueService Integration Tests', () => {
	let coreClient
	let sut

	beforeEach(async () => {
		// Initialize components and unique test data
		coreClient = new CoreClient(activemqConfig)
		sut = new QueueService(coreClient)

		await coreClient.connect()
	})

	afterEach(async () => {
		// CLEANUP - Close connections
		if (coreClient.isConnected()) {
			await coreClient.disconnect()
		}
	})

	describe('sendMessage', () => {
		// Happy path tests first
		it('should send message successfully when queue exists', async () => {
			// GIVEN - Valid queue and message
			const testQueueName = `test-queue-${randomUUID()}`
			const testQueuePath = `/queue/${testQueueName}`
			const testMessage = `Test message - ${Date.now()}`

			// WHEN - Message is sent
			const result = await sut.sendMessage(testQueuePath, testMessage)

			// THEN - Should return success
			expect(result.success).toBe(true)
			expect(result.status).toBe(200)

			// AND - Queue should contain the message
			const queueInfo = await sut.getQueueInfo(testQueueName)
			expect(queueInfo.size).toBe(1)
			expect(queueInfo.enqueueCount).toBe(1)
		})

		it('should send JSON message when object provided', async () => {
			// GIVEN - Queue and JSON message
			const testQueueName = `test-queue-${randomUUID()}`
			const testQueuePath = `/queue/${testQueueName}`
			const jsonMessage = {id: 123, content: 'test', timestamp: Date.now()}

			// WHEN - JSON message is sent
			const result = await sut.sendMessage(testQueuePath, jsonMessage)

			// THEN - Should succeed
			expect(result.success).toBe(true)

			// AND - Queue should contain the JSON message
			const queueInfo = await sut.getQueueInfo(testQueueName)
			expect(queueInfo.size).toBe(1)
		})

		it('should include custom headers when provided', async () => {
			// GIVEN - Queue, message, and headers
			const testQueueName = `test-queue-${randomUUID()}`
			const testQueuePath = `/queue/${testQueueName}`
			const testMessage = 'Message with headers'
			const headers = {priority: '5', correlationId: 'test-123'}

			// WHEN - Message sent with headers
			const result = await sut.sendMessage(testQueuePath, testMessage, headers)

			// THEN - Should succeed
			expect(result.success).toBe(true)

			// AND - Queue should contain the message with headers
			const queueInfo = await sut.getQueueInfo(testQueueName)
			expect(queueInfo.size).toBe(1)
		})

	})

	describe('consumeMessage', () => {
		// Happy path tests first
		it('should consume message when available', async () => {
			// GIVEN - Message exists in queue
			const testQueueName = `test-queue-${randomUUID()}`
			const testQueuePath = `/queue/${testQueueName}`
			const testMessage = `Test message - ${Date.now()}`
			await sut.sendMessage(testQueuePath, testMessage)

			// Verify message is in queue
			const queueInfo = await sut.getQueueInfo(testQueueName)
			expect(queueInfo.size).toBe(1)

			// WHEN - Message is consumed
			const message = await sut.consumeMessage(testQueuePath, {timeout: 3000})

			// THEN - Should return the message with correct content
			expect(message).toBeTruthy()
			expect(message.body).toBe(testMessage)
			expect(message.headers).toBeDefined()

			// AND - Queue should be empty after consumption (wait for statistics to update)
			await new Promise(resolve => setTimeout(resolve, 1000))
			const queueInfoAfter = await sut.getQueueInfo(testQueueName)
			expect(queueInfoAfter.size).toBe(0)
			expect(queueInfoAfter.dequeueCount).toBe(1)
		})


		it('should handle JSON messages correctly', async () => {
			// GIVEN - JSON message in queue
			const testQueueName = `test-queue-${randomUUID()}`
			const testQueuePath = `/queue/${testQueueName}`
			const jsonMessage = {id: 456, data: 'test data'}
			await sut.sendMessage(testQueuePath, jsonMessage)

			// WHEN - JSON message is consumed
			const message = await sut.consumeMessage(testQueuePath)

			// THEN - Should return parsed JSON object
			expect(message).toBeTruthy()
			expect(message.body).toEqual(jsonMessage)
		})

	})



	describe('getQueueInfo', () => {
		// Happy path tests first
		it('should return queue information when queue exists', async () => {
			// GIVEN - Queue with messages
			const testQueueName = `test-queue-${randomUUID()}`
			const testQueuePath = `/queue/${testQueueName}`
			await sut.sendMessage(testQueuePath, 'Test message')

			// WHEN - Queue info is requested
			const queueInfo = await sut.getQueueInfo(testQueueName)

			// THEN - Should return complete queue information
			expect(queueInfo).toMatchObject({
				name: testQueueName,
				size: 1,
				consumerCount: 0,
				enqueueCount: 1,
				dequeueCount: 0
			})
		})

		it('should return default values when queue does not exist', async () => {
			// GIVEN - Non-existent queue
			const nonExistentQueue = `non-existent-${randomUUID()}`

			// WHEN - Info requested for non-existent queue
			const queueInfo = await sut.getQueueInfo(nonExistentQueue)

			// THEN - Should return default values
			expect(queueInfo.name).toBe(nonExistentQueue)
			expect(queueInfo.size).toBe(0)
		})
	})

	describe('listQueues', () => {
		// Happy path tests first
		it('should return queue array when queues exist', async () => {
			// GIVEN - Create unique test queue name
			const testQueueName = `test-queue-${randomUUID()}`
			const testQueuePath = `/queue/${testQueueName}`
			const testMessage = `Create test queue for listing - ${Date.now()}`
			await sut.sendMessage(testQueuePath, testMessage)

			// WHEN - Queues are listed
			const queues = await sut.listQueues()
			console.log(queues)

			// THEN - Should find the test queue
			const testQueueInfo = queues.find(q => q.name && q.name.includes(testQueueName))
			expect(testQueueInfo).toBeTruthy()
			expect(testQueueInfo.name).toBe(testQueueName)
			expect(testQueueInfo.size).toBe(1)
			expect(testQueueInfo.consumerCount).toBe(0)
			expect(testQueueInfo.enqueueCount).toBe(1)
			expect(testQueueInfo.dequeueCount).toBe(0)
		})
	})
})
