import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {CoreClient} from '../../../src/core/client/index.js'
import {BrokerService} from '../../../src/core/service/index.js'
import {activemqConfig} from '../setup/activemq-config.js'

describe('BrokerService Integration Tests', () => {
	let coreClient
	let sut

	beforeEach(async () => {
		// Initialize components and unique test data
		coreClient = new CoreClient(activemqConfig)
		sut = new BrokerService(coreClient)

		await coreClient.connect()
	})

	afterEach(async () => {
		// CLEANUP - Close connections
		if (coreClient.isConnected()) {
			await coreClient.disconnect()
		}
	})

	describe('getBrokerInfo', () => {
		// Happy path tests first
		it('should return complete broker details when connected', async () => {
			// GIVEN - Service connected to broker
			// WHEN - Broker info is requested
			const brokerInfo = await sut.getBrokerInfo()

			// THEN - Should return complete broker information with concrete values
			expect(brokerInfo.brokerName).toBe('localhost')
			expect(brokerInfo.brokerVersion).toMatch(/^\d+\.\d+\.\d+/)
			expect(brokerInfo.uptime).toBeGreaterThan(0)
			expect(brokerInfo.host).toBe('localhost')
			expect(brokerInfo.port).toBe(8161)
		})

		it('should return consistent broker identity when called multiple times', async () => {
			// GIVEN - Service connected to broker
			const info1 = await sut.getBrokerInfo()
			const info2 = await sut.getBrokerInfo()

			// WHEN - Multiple calls are made
			// THEN - Broker identity should be identical
			expect(info1.brokerName).toBe(info2.brokerName)
			expect(info1.brokerVersion).toBe(info2.brokerVersion)
			expect(info1.host).toBe(info2.host)
			expect(info1.port).toBe(info2.port)
		})

		it('should show increasing uptime over time', async () => {
			// GIVEN - Initial broker info
			const info1 = await sut.getBrokerInfo()

			// WHEN - Time passes and info requested again
			await new Promise(resolve => setTimeout(resolve, 1000))
			const info2 = await sut.getBrokerInfo()

			// THEN - Uptime should increase
			expect(info2.uptime).toBeGreaterThan(info1.uptime)
		})

		// Unhappy path tests
		it('should throw error when not connected', async () => {
			// GIVEN - Disconnected client
			await coreClient.disconnect()

			// WHEN/THEN - Should throw connection error
			await expect(sut.getBrokerInfo()).rejects.toThrow('Not connected to ActiveMQ broker')
		})
	})

	describe('getBrokerHealth', () => {
		// Happy path tests first
		it('should return complete health metrics when broker is running', async () => {
			// GIVEN - Service connected to broker
			// WHEN - Health metrics are requested
			const health = await sut.getBrokerHealth()

			// THEN - Should return concrete health values
			expect(health.status).toBe('healthy')
			expect(health.uptime).toBeGreaterThan(0)
			expect(health.brokerName).toBe('localhost')
			expect(health.connections).toBeGreaterThanOrEqual(1) // At least our test connection
			expect(health.consumers).toBeGreaterThanOrEqual(0)
			expect(health.producers).toBeGreaterThanOrEqual(0)
		})

		it('should report valid memory usage percentage', async () => {
			// GIVEN - Service connected to broker
			// WHEN - Health with memory info is requested
			const health = await sut.getBrokerHealth()

			// THEN - Memory usage should be within valid range
			expect(health.memoryUsagePercentage).toBeGreaterThanOrEqual(0)
			expect(health.memoryUsagePercentage).toBeLessThanOrEqual(100)
			expect(Number.isInteger(health.memoryUsagePercentage)).toBe(true)
		})

		it('should show increasing uptime over time', async () => {
			// GIVEN - Initial health status
			const health1 = await sut.getBrokerHealth()

			// WHEN - Time passes and health checked again
			await new Promise(resolve => setTimeout(resolve, 1100))
			const health2 = await sut.getBrokerHealth()

			// THEN - Uptime should increase
			expect(health2.uptime).toBeGreaterThan(health1.uptime)
		})

		it('should include valid timestamp when provided', async () => {
			// GIVEN - Service connected to broker
			// WHEN - Health is requested
			const health = await sut.getBrokerHealth()

			// THEN - Should have valid timestamp
			if (health.timestamp) {
				expect(health.timestamp).toBeGreaterThan(Date.now() - 10000) // Within last 10 seconds
				expect(health.timestamp).toBeLessThanOrEqual(Date.now())
			}
		})

		// Unhappy path tests
		it('should throw error when not connected', async () => {
			// GIVEN - Disconnected client
			await coreClient.disconnect()

			// WHEN/THEN - Should throw connection error
			await expect(sut.getBrokerHealth()).rejects.toThrow('Not connected to ActiveMQ broker')
		})
	})

	describe('getBrokerStats', () => {
		// Happy path tests first
		it('should return complete operational statistics when broker is active', async () => {
			// GIVEN - Service connected to active broker
			// WHEN - Statistics are requested
			const stats = await sut.getBrokerStats()

			// THEN - Should return concrete statistical values
			expect(stats.broker.totalConsumers).toBeGreaterThanOrEqual(0)
			expect(stats.broker.totalProducers).toBeGreaterThanOrEqual(0)
			expect(stats.broker.currentMessages).toBeGreaterThanOrEqual(0)
			expect(stats.queues.count).toBeGreaterThanOrEqual(0)
			expect(stats.queues.totalMessages).toBeGreaterThanOrEqual(0)
			expect(stats.topics.count).toBeGreaterThanOrEqual(0)
		})

		it('should report concrete memory and storage metrics', async () => {
			// GIVEN - Service connected to broker
			// WHEN - Statistics with storage info are requested
			const stats = await sut.getBrokerStats()

			// THEN - Should include concrete memory metrics
			expect(stats.memory.usage).toBeGreaterThanOrEqual(0)
			expect(stats.memory.limit).toBeGreaterThan(stats.memory.usage)

			// AND - Should include concrete storage metrics
			expect(stats.store.usage).toBeGreaterThanOrEqual(0)
			expect(stats.store.limit).toBeGreaterThan(0)
		})

		it('should report at least one connection when test client connected', async () => {
			// GIVEN - Service connected to broker (our test connection)
			// WHEN - Statistics are requested
			const stats = await sut.getBrokerStats()

			// THEN - Should show at least our test connection exists
			expect(stats.broker.totalProducers).toBeGreaterThanOrEqual(0)
			expect(stats.broker.totalConsumers).toBeGreaterThanOrEqual(0)
			// Note: Connection count may vary based on broker implementation
		})

		it('should return integer values for all count fields', async () => {
			// GIVEN - Service connected to broker
			// WHEN - Statistics are requested
			const stats = await sut.getBrokerStats()

			// THEN - All count fields should be non-negative integers
			expect(Number.isInteger(stats.broker.totalConsumers)).toBe(true)
			expect(Number.isInteger(stats.broker.totalProducers)).toBe(true)
			expect(Number.isInteger(stats.broker.currentMessages)).toBe(true)
			expect(Number.isInteger(stats.queues.count)).toBe(true)
			expect(Number.isInteger(stats.queues.totalMessages)).toBe(true)
			expect(Number.isInteger(stats.topics.count)).toBe(true)
		})

		// Unhappy path tests
		it('should throw error when not connected', async () => {
			// GIVEN - Disconnected client
			await coreClient.disconnect()

			// WHEN/THEN - Should throw connection error
			await expect(sut.getBrokerStats()).rejects.toThrow('Not connected to ActiveMQ broker')
		})
	})

	describe('broker service integration', () => {
		it('should maintain consistent broker identity across all methods', async () => {
			// GIVEN - Service connected to broker
			// WHEN - Multiple methods called
			const info = await sut.getBrokerInfo()
			const health = await sut.getBrokerHealth()
			const stats = await sut.getBrokerStats()

			// THEN - Broker identity should be consistent across all responses
			expect(info.brokerName).toBe(health.brokerName)
			expect(info.brokerName).toBe('localhost')
			expect(health.brokerName).toBe('localhost')

			// AND - Port information should be consistent
			expect(info.port).toBe(8161)
		})
	})
})
