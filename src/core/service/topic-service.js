import { logger } from '../../utils/logger.js';

export class TopicService {
  constructor(core) {
    this.core = core;
  }

  async publishMessage(topicName, message, headers = {}) {
    if (!this.core.isConnected()) {
      throw new Error('Not connected to ActiveMQ broker');
    }

    try {
      // Clean topic name
      const cleanTopicName = this.core.cleanDestinationName(topicName);
      
      logger.debug('Publishing message to topic', { 
        topicName: cleanTopicName,
        messageLength: typeof message === 'string' ? message.length : JSON.stringify(message).length
      });

      // Use proper ActiveMQ REST API format for topics
      const messageBody = typeof message === 'string' ? message : JSON.stringify(message);
      const formData = `body=${encodeURIComponent(messageBody)}`;
      
      // Add any additional headers as form parameters
      let additionalParams = '';
      for (const [key, value] of Object.entries(headers)) {
        additionalParams += `&${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
      }

      const response = await this.core.httpClient.post(
        `/api/message/${cleanTopicName}?type=topic`,
        formData + additionalParams,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      logger.info('Message published successfully', { 
        topicName: cleanTopicName,
        status: response.status
      });

      return { success: true, status: response.status };
    } catch (error) {
      logger.error('Failed to publish message', { 
        topicName,
        error: error.message,
        status: error.response?.status
      });
      throw new Error(`Failed to publish message: ${error.message}`);
    }
  }

  async subscribeToTopic(topicName, options = {}) {
    // Note: REST API doesn't support real-time subscriptions
    // This is a polling-based simulation
    logger.warn('Topic subscription via REST API is polling-based, not real-time');
    
    const messages = [];
    const timeout = options.timeout || 10000;
    const maxMessages = options.maxMessages || 1;
    const pollInterval = 1000; // Poll every second
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout && messages.length < maxMessages) {
      try {
        // In REST API, we can't truly subscribe, so we'll just return a placeholder
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
        if (messages.length === 0) {
          // Simulate no messages received for now
          // In a real implementation, you might poll a specific endpoint
          logger.info('Topic subscription timeout (REST API limitation)', { topicName });
          break;
        }
      } catch (error) {
        logger.error('Error during topic subscription', { topicName, error: error.message });
        break;
      }
    }
    
    return messages;
  }

  async listTopics() {
    if (!this.core.isConnected()) {
      throw new Error('Not connected to ActiveMQ broker');
    }

    try {
      logger.debug('Listing topics');

      // Try multiple approaches to get topic list
      let response;
      let data = {};
      
      try {
        // First try with wildcard broker name
        response = await this.core.httpClient.get('/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=*,destinationType=Topic,destinationName=*');
        data = response.data?.value || {};
      } catch (error) {
        logger.debug('Wildcard broker query failed, trying specific broker name');
        
        // Fall back to localhost broker name
        try {
          response = await this.core.httpClient.get('/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost,destinationType=Topic,destinationName=*');
          data = response.data?.value || {};
        } catch (error2) {
          // Try to get broker name first, then query topics
          const brokerResponse = await this.core.httpClient.get('/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=*');
          const brokerData = brokerResponse.data?.value || {};
          
          // Extract broker name from response
          let brokerName = 'localhost';
          for (const key of Object.keys(brokerData)) {
            if (key.includes('brokerName=')) {
              brokerName = key.split('brokerName=')[1].split(',')[0];
              break;
            }
          }
          
          // Query with discovered broker name
          response = await this.core.httpClient.get(`/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=${brokerName},destinationType=Topic,destinationName=*`);
          data = response.data?.value || {};
        }
      }

      const topics = [];

      // Parse topic data from Jolokia response
      if (typeof data === 'object' && data !== null) {
        for (const [key, value] of Object.entries(data)) {
          if (key.includes('destinationName=') && !key.includes('ActiveMQ.Advisory')) {
            const topicName = key.split('destinationName=')[1].split(',')[0];
            if (topicName && typeof value === 'object' && value !== null) {
              topics.push({
                name: topicName,
                consumerCount: value.ConsumerCount || 0,
                enqueueCount: value.EnqueueCount || 0,
                dequeueCount: value.DequeueCount || 0,
                subscriptionCount: value.SubscriptionCount || 0
              });
            }
          }
        }
      }

      logger.info('Topics listed successfully', { topicCount: topics.length });
      return topics;
    } catch (error) {
      logger.error('Failed to list topics', { 
        error: error.message,
        status: error.response?.status,
        responseData: error.response?.data
      });
      throw new Error(`Failed to list topics: ${error.message}`);
    }
  }
}