import { logger } from '../../utils/logger.js';

export class QueueService {
  constructor(core) {
    this.core = core;
  }

  async sendMessage(destination, message, headers = {}) {
    if (!this.core.isConnected()) {
      throw new Error('Not connected to ActiveMQ broker');
    }

    try {
      // Parse destination to get name and type
      const { destinationName, destinationType } = this.core.parseDestination(destination);
      
      logger.debug('Sending message', { 
        destinationName,
        destinationType,
        messageLength: typeof message === 'string' ? message.length : JSON.stringify(message).length
      });

      // Use proper ActiveMQ REST API format
      const messageBody = typeof message === 'string' ? message : JSON.stringify(message);
      const formData = `body=${encodeURIComponent(messageBody)}`;
      
      // Add any additional headers as form parameters
      let additionalParams = '';
      for (const [key, value] of Object.entries(headers)) {
        additionalParams += `&${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
      }

      const response = await this.core.httpClient.post(
        `/api/message/${destinationName}?type=${destinationType}`,
        formData + additionalParams,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      logger.info('Message sent successfully', { 
        destinationName,
        destinationType,
        status: response.status
      });

      return { success: true, status: response.status };
    } catch (error) {
      logger.error('Failed to send message', { 
        destination,
        error: error.message,
        status: error.response?.status
      });
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }

  async consumeMessage(destination, options = {}) {
    if (!this.core.isConnected()) {
      throw new Error('Not connected to ActiveMQ broker');
    }

    try {
      // Parse destination to get name and type
      const { destinationName, destinationType } = this.core.parseDestination(destination);
      
      logger.debug('Consuming message', { destinationName, destinationType, options });

      // Build query parameters for REST API
      const params = new URLSearchParams();
      params.append('type', destinationType);
      
      if (options.timeout) {
        params.append('timeout', options.timeout.toString());
      }
      
      if (options.clientId) {
        params.append('clientId', options.clientId);
      }
      
      if (options.selector) {
        params.append('selector', options.selector);
      }

      const response = await this.core.httpClient.get(`/api/message/${destinationName}?${params.toString()}`);

      if (response.status === 204 || !response.data) {
        logger.debug('No message available', { destinationName, destinationType });
        return null; // No message available
      }

      const messageData = {
        headers: response.headers,
        body: response.data,
        timestamp: Date.now(),
        destinationName,
        destinationType,
        ack: async () => {
          logger.debug('Message acknowledged (REST API auto-acknowledges)');
          return Promise.resolve();
        },
        nack: async () => {
          logger.warn('NACK not supported in REST API mode');
          return Promise.resolve();
        }
      };

      logger.info('Message consumed successfully', { destinationName, destinationType });
      return messageData;
    } catch (error) {
      if (error.response?.status === 204) {
        return null; // No message available
      }
      logger.error('Failed to consume message', { 
        destination,
        error: error.message,
        status: error.response?.status
      });
      throw new Error(`Failed to consume message: ${error.message}`);
    }
  }

  async browseMessages(queueName, limit = 10) {
    if (!this.core.isConnected()) {
      throw new Error('Not connected to ActiveMQ broker');
    }

    try {
      // Clean queue name
      const cleanQueueName = this.core.cleanDestinationName(queueName);
      
      logger.debug('Browsing messages', { queueName: cleanQueueName, limit });

      const messages = [];
      let browsed = 0;

      // Browse messages one by one (REST API limitation)
      while (browsed < limit) {
        try {
          const response = await this.core.httpClient.get(`/api/message/${cleanQueueName}`, {
            params: {
              type: 'browse'
            }
          });

          if (response.status === 204 || !response.data) {
            break; // No more messages
          }

          messages.push({
            headers: response.headers,
            body: response.data,
            timestamp: Date.now()
          });

          browsed++;
        } catch (error) {
          if (error.response?.status === 204) {
            break; // No more messages
          }
          throw error;
        }
      }

      logger.info('Messages browsed successfully', { 
        queueName: cleanQueueName,
        messageCount: messages.length
      });

      return messages;
    } catch (error) {
      logger.error('Failed to browse messages', { 
        queueName,
        error: error.message,
        status: error.response?.status
      });
      throw new Error(`Failed to browse messages: ${error.message}`);
    }
  }

  async purgeQueue(queueName) {
    if (!this.core.isConnected()) {
      throw new Error('Not connected to ActiveMQ broker');
    }

    try {
      // Clean queue name
      const cleanQueueName = this.core.cleanDestinationName(queueName);
      
      logger.info('Purging queue', { queueName: cleanQueueName });

      // Use Jolokia API to purge queue
      const brokerName = await this.core.getBrokerName();
      const response = await this.core.httpClient.post(`/api/jolokia/exec/org.apache.activemq:type=Broker,brokerName=${brokerName},destinationType=Queue,destinationName=${cleanQueueName}/purge`);

      const purgedCount = response.data?.value || 0;
      
      logger.info('Queue purged successfully', { 
        queueName: cleanQueueName,
        purgedMessages: purgedCount
      });

      return { purgedMessages: purgedCount };
    } catch (error) {
      logger.error('Failed to purge queue', { 
        queueName,
        error: error.message,
        status: error.response?.status
      });
      throw new Error(`Failed to purge queue: ${error.message}`);
    }
  }

  async getQueueInfo(queueName) {
    if (!this.core.isConnected()) {
      throw new Error('Not connected to ActiveMQ broker');
    }

    try {
      // Clean queue name
      const cleanQueueName = this.core.cleanDestinationName(queueName);
      
      logger.debug('Getting queue info', { queueName: cleanQueueName });

      const brokerName = await this.core.getBrokerName();
      const response = await this.core.httpClient.get(`/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=${brokerName},destinationType=Queue,destinationName=${cleanQueueName}`);

      const queueData = response.data?.value || {};
      
      const queueInfo = {
        name: cleanQueueName,
        size: queueData.QueueSize || 0,
        consumerCount: queueData.ConsumerCount || 0,
        enqueueCount: queueData.EnqueueCount || 0,
        dequeueCount: queueData.DequeueCount || 0,
        memoryUsage: queueData.MemoryUsageByteCount || 0,
        memoryLimit: queueData.MemoryLimit || 0
      };

      logger.debug('Queue info retrieved', { queueName: cleanQueueName, queueInfo });
      return queueInfo;
    } catch (error) {
      logger.error('Failed to get queue info', { 
        queueName,
        error: error.message,
        status: error.response?.status
      });
      
      return {
        name: queueName,
        size: 0,
        consumerCount: 0,
        enqueueCount: 0,
        dequeueCount: 0,
        error: error.message
      };
    }
  }

  async listQueues() {
    if (!this.core.isConnected()) {
      throw new Error('Not connected to ActiveMQ broker');
    }

    try {
      logger.debug('Listing queues');

      // Try multiple approaches to get queue list
      let response;
      let data = {};
      
      try {
        // First try with wildcard broker name
        response = await this.core.httpClient.get('/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=*,destinationType=Queue,destinationName=*');
        data = response.data?.value || {};
      } catch (error) {
        logger.debug('Wildcard broker query failed, trying specific broker name');
        
        // Fall back to localhost broker name
        try {
          response = await this.core.httpClient.get('/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost,destinationType=Queue,destinationName=*');
          data = response.data?.value || {};
        } catch (error2) {
          // Try to get broker name first, then query queues
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
          response = await this.core.httpClient.get(`/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=${brokerName},destinationType=Queue,destinationName=*`);
          data = response.data?.value || {};
        }
      }

      const queues = [];

      // Parse queue data from Jolokia response
      if (typeof data === 'object' && data !== null) {
        for (const [key, value] of Object.entries(data)) {
          if (key.includes('destinationName=') && !key.includes('ActiveMQ.Advisory')) {
            const queueName = key.split('destinationName=')[1].split(',')[0];
            if (queueName && typeof value === 'object' && value !== null) {
              queues.push({
                name: queueName,
                size: value.QueueSize || 0,
                consumerCount: value.ConsumerCount || 0,
                enqueueCount: value.EnqueueCount || 0,
                dequeueCount: value.DequeueCount || 0
              });
            }
          }
        }
      }

      logger.info('Queues listed successfully', { queueCount: queues.length });
      return queues;
    } catch (error) {
      logger.error('Failed to list queues', { 
        error: error.message,
        status: error.response?.status,
        responseData: error.response?.data
      });
      throw new Error(`Failed to list queues: ${error.message}`);
    }
  }
}