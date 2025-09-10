import { logger } from '../../utils/logger.js';

export class BrokerService {
  constructor(core) {
    this.core = core;
  }

  async getBrokerInfo() {
    if (!this.core.isConnected()) {
      throw new Error('Not connected to ActiveMQ broker');
    }

    try {
      logger.debug('Getting broker info');

      const brokerName = await this.core.getBrokerName();
      const response = await this.core.httpClient.get(`/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=${brokerName}`);

      const brokerData = response.data?.value || {};
      
      const brokerInfo = {
        host: this.core.config.host,
        port: this.core.config.port,
        brokerName: brokerData.BrokerName || 'localhost',
        brokerVersion: brokerData.BrokerVersion || 'Unknown',
        uptime: brokerData.UptimeMillis || 0,
        connected: this.core.isConnected(),
        totalConnectionsCount: brokerData.TotalConnectionsCount || 0,
        totalConsumerCount: brokerData.TotalConsumerCount || 0,
        totalProducerCount: brokerData.TotalProducerCount || 0,
        totalEnqueueCount: brokerData.TotalEnqueueCount || 0,
        totalDequeueCount: brokerData.TotalDequeueCount || 0,
        totalMessageCount: brokerData.TotalMessageCount || 0,
        memoryUsage: brokerData.MemoryUsage || 0,
        memoryLimit: brokerData.MemoryLimit || 0,
        storeUsage: brokerData.StoreUsage || 0,
        storeLimit: brokerData.StoreLimit || 0,
        tempUsage: brokerData.TempUsage || 0,
        tempLimit: brokerData.TempLimit || 0
      };

      logger.debug('Broker info retrieved', brokerInfo);
      return brokerInfo;
    } catch (error) {
      logger.error('Failed to get broker info', { 
        error: error.message,
        status: error.response?.status
      });
      throw new Error(`Failed to get broker info: ${error.message}`);
    }
  }

  async getBrokerHealth() {
    if (!this.core.isConnected()) {
      throw new Error('Not connected to ActiveMQ broker');
    }

    try {
      logger.debug('Checking broker health');

      const brokerInfo = await this.getBrokerInfo();
      
      const healthInfo = {
        status: 'healthy',
        brokerName: brokerInfo.brokerName,
        uptime: brokerInfo.uptime,
        connections: brokerInfo.totalConnectionsCount,
        consumers: brokerInfo.totalConsumerCount,
        producers: brokerInfo.totalProducerCount,
        messages: brokerInfo.totalMessageCount,
        memoryUsagePercentage: brokerInfo.memoryLimit > 0 ? 
          Math.round((brokerInfo.memoryUsage / brokerInfo.memoryLimit) * 100) : 0,
        storeUsagePercentage: brokerInfo.storeLimit > 0 ? 
          Math.round((brokerInfo.storeUsage / brokerInfo.storeLimit) * 100) : 0,
        tempUsagePercentage: brokerInfo.tempLimit > 0 ? 
          Math.round((brokerInfo.tempUsage / brokerInfo.tempLimit) * 100) : 0,
        timestamp: Date.now()
      };

      // Determine health status based on usage percentages
      const maxUsage = Math.max(
        healthInfo.memoryUsagePercentage,
        healthInfo.storeUsagePercentage,
        healthInfo.tempUsagePercentage
      );

      if (maxUsage > 90) {
        healthInfo.status = 'critical';
      } else if (maxUsage > 75) {
        healthInfo.status = 'warning';
      }

      logger.debug('Broker health checked', healthInfo);
      return healthInfo;
    } catch (error) {
      logger.error('Failed to check broker health', { 
        error: error.message,
        status: error.response?.status
      });
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  async getBrokerStats() {
    if (!this.core.isConnected()) {
      throw new Error('Not connected to ActiveMQ broker');
    }

    try {
      logger.debug('Getting broker statistics');

      const brokerName = await this.core.getBrokerName();
      
      // Get broker statistics
      const brokerResponse = await this.core.httpClient.get(`/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=${brokerName}`);
      const brokerData = brokerResponse.data?.value || {};

      // Get queue statistics
      let queueStats = { count: 0, totalMessages: 0, totalConsumers: 0 };
      try {
        const queueResponse = await this.core.httpClient.get(`/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=${brokerName},destinationType=Queue,destinationName=*`);
        const queueData = queueResponse.data?.value || {};
        
        let queueCount = 0;
        let totalMessages = 0;
        let totalConsumers = 0;
        
        for (const [key, value] of Object.entries(queueData)) {
          if (key.includes('destinationName=') && !key.includes('ActiveMQ.Advisory')) {
            queueCount++;
            totalMessages += value.QueueSize || 0;
            totalConsumers += value.ConsumerCount || 0;
          }
        }
        
        queueStats = { count: queueCount, totalMessages, totalConsumers };
      } catch (error) {
        logger.warn('Failed to get queue statistics', { error: error.message });
      }

      // Get topic statistics
      let topicStats = { count: 0, totalConsumers: 0, totalSubscriptions: 0 };
      try {
        const topicResponse = await this.core.httpClient.get(`/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=${brokerName},destinationType=Topic,destinationName=*`);
        const topicData = topicResponse.data?.value || {};
        
        let topicCount = 0;
        let totalConsumers = 0;
        let totalSubscriptions = 0;
        
        for (const [key, value] of Object.entries(topicData)) {
          if (key.includes('destinationName=') && !key.includes('ActiveMQ.Advisory')) {
            topicCount++;
            totalConsumers += value.ConsumerCount || 0;
            totalSubscriptions += value.SubscriptionCount || 0;
          }
        }
        
        topicStats = { count: topicCount, totalConsumers, totalSubscriptions };
      } catch (error) {
        logger.warn('Failed to get topic statistics', { error: error.message });
      }

      const stats = {
        broker: {
          name: brokerData.BrokerName || 'localhost',
          version: brokerData.BrokerVersion || 'Unknown',
          uptime: brokerData.UptimeMillis || 0,
          totalConnections: brokerData.TotalConnectionsCount || 0,
          totalConsumers: brokerData.TotalConsumerCount || 0,
          totalProducers: brokerData.TotalProducerCount || 0,
          totalEnqueued: brokerData.TotalEnqueueCount || 0,
          totalDequeued: brokerData.TotalDequeueCount || 0,
          currentMessages: brokerData.TotalMessageCount || 0
        },
        queues: queueStats,
        topics: topicStats,
        memory: {
          usage: brokerData.MemoryUsage || 0,
          limit: brokerData.MemoryLimit || 0,
          usagePercentage: brokerData.MemoryLimit > 0 ? 
            Math.round((brokerData.MemoryUsage / brokerData.MemoryLimit) * 100) : 0
        },
        store: {
          usage: brokerData.StoreUsage || 0,
          limit: brokerData.StoreLimit || 0,
          usagePercentage: brokerData.StoreLimit > 0 ? 
            Math.round((brokerData.StoreUsage / brokerData.StoreLimit) * 100) : 0
        },
        temp: {
          usage: brokerData.TempUsage || 0,
          limit: brokerData.TempLimit || 0,
          usagePercentage: brokerData.TempLimit > 0 ? 
            Math.round((brokerData.TempUsage / brokerData.TempLimit) * 100) : 0
        },
        timestamp: Date.now()
      };

      logger.debug('Broker statistics retrieved', stats);
      return stats;
    } catch (error) {
      logger.error('Failed to get broker statistics', { 
        error: error.message,
        status: error.response?.status
      });
      throw new Error(`Failed to get broker statistics: ${error.message}`);
    }
  }
}