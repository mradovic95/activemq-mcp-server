import axios from 'axios';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';

export class ActiveMQClient extends EventEmitter {
  constructor(config) {
    super();
    
    if (!config) {
      throw new Error('Configuration is required');
    }
    
    if (!config.host) {
      throw new Error('Host is required in configuration');
    }
    
    if (!config.port || typeof config.port !== 'number' || config.port <= 0) {
      throw new Error('Valid port number is required in configuration');
    }

    this.config = {
      host: config.host,
      port: config.port,
      username: config.username || '',
      password: config.password || '',
      baseURL: `http://${config.host}:${config.port}`,
      timeout: config.timeout || 30000
    };

    // Create axios instance with base configuration
    this.httpClient = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      auth: this.config.username ? {
        username: this.config.username,
        password: this.config.password
      } : undefined,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    this.connected = false;
    this._brokerName = null; // Cache broker name

    logger.debug('ActiveMQClient created', { 
      host: this.config.host, 
      port: this.config.port,
      username: config.username ? '***' : 'none',
      baseURL: this.config.baseURL
    });
  }

  async getBrokerName() {
    if (this._brokerName) {
      return this._brokerName;
    }

    try {
      const response = await this.httpClient.get('/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=*');
      const brokerData = response.data?.value || {};
      
      // Extract broker name from response
      for (const key of Object.keys(brokerData)) {
        if (key.includes('brokerName=')) {
          this._brokerName = key.split('brokerName=')[1].split(',')[0];
          logger.debug('Discovered broker name', { brokerName: this._brokerName });
          return this._brokerName;
        }
      }
      
      // Fallback to localhost if not found
      this._brokerName = 'localhost';
      return this._brokerName;
    } catch (error) {
      logger.warn('Failed to get broker name, using localhost', { error: error.message });
      this._brokerName = 'localhost';
      return this._brokerName;
    }
  }

  async connect() {
    if (this.connected) {
      logger.warn('Already connected to ActiveMQ broker');
      return;
    }

    logger.info('Testing connection to ActiveMQ web console', { 
      host: this.config.host, 
      port: this.config.port,
      baseURL: this.config.baseURL
    });

    try {
      // Test connection by getting broker info
      await this.httpClient.get('/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=*');
      
      this.connected = true;
      logger.info('Successfully connected to ActiveMQ web console', { 
        host: this.config.host, 
        port: this.config.port 
      });
      
      this.emit('connected');
    } catch (error) {
      logger.error('Failed to connect to ActiveMQ web console', { 
        host: this.config.host, 
        port: this.config.port,
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      
      this.emit('error', error);
      throw new Error(`Failed to connect to ActiveMQ: ${error.message}`);
    }
  }

  async disconnect() {
    if (this.connected) {
      this.connected = false;
      this.emit('disconnected');
      logger.info('Disconnected from ActiveMQ', {
        host: this.config.host,
        port: this.config.port
      });
    }
  }

  async sendMessage(destination, message, headers = {}) {
    if (!this.connected) {
      throw new Error('Not connected to ActiveMQ broker');
    }

    try {
      // Parse destination to get name and type
      let destinationName;
      let destinationType;
      
      if (destination.startsWith('/queue/')) {
        destinationName = destination.replace('/queue/', '');
        destinationType = 'queue';
      } else if (destination.startsWith('/topic/')) {
        destinationName = destination.replace('/topic/', '');
        destinationType = 'topic';
      } else if (destination.startsWith('queue/')) {
        destinationName = destination.replace('queue/', '');
        destinationType = 'queue';
      } else if (destination.startsWith('topic/')) {
        destinationName = destination.replace('topic/', '');
        destinationType = 'topic';
      } else {
        // Default to queue if no prefix
        destinationName = destination;
        destinationType = 'queue';
      }
      
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

      const response = await this.httpClient.post(
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
    if (!this.connected) {
      throw new Error('Not connected to ActiveMQ broker');
    }

    try {
      // Parse destination to get name and type
      let destinationName;
      let destinationType;
      
      if (destination.startsWith('/queue/')) {
        destinationName = destination.replace('/queue/', '');
        destinationType = 'queue';
      } else if (destination.startsWith('/topic/')) {
        destinationName = destination.replace('/topic/', '');
        destinationType = 'topic';
      } else if (destination.startsWith('queue/')) {
        destinationName = destination.replace('queue/', '');
        destinationType = 'queue';
      } else if (destination.startsWith('topic/')) {
        destinationName = destination.replace('topic/', '');
        destinationType = 'topic';
      } else {
        // Default to queue if no prefix
        destinationName = destination;
        destinationType = 'queue';
      }
      
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

      const response = await this.httpClient.get(`/api/message/${destinationName}?${params.toString()}`);

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
    if (!this.connected) {
      throw new Error('Not connected to ActiveMQ broker');
    }

    try {
      // Clean queue name
      const cleanQueueName = queueName.replace('/queue/', '').replace('queue/', '');
      
      logger.debug('Browsing messages', { queueName: cleanQueueName, limit });

      const messages = [];
      let browsed = 0;

      // Browse messages one by one (REST API limitation)
      while (browsed < limit) {
        try {
          const response = await this.httpClient.get(`/api/message/${cleanQueueName}`, {
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
    if (!this.connected) {
      throw new Error('Not connected to ActiveMQ broker');
    }

    try {
      // Clean queue name
      const cleanQueueName = queueName.replace('/queue/', '').replace('queue/', '');
      
      logger.info('Purging queue', { queueName: cleanQueueName });

      // Use Jolokia API to purge queue
      const brokerName = await this.getBrokerName();
      const response = await this.httpClient.post(`/api/jolokia/exec/org.apache.activemq:type=Broker,brokerName=${brokerName},destinationType=Queue,destinationName=${cleanQueueName}/purge`);

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
    if (!this.connected) {
      throw new Error('Not connected to ActiveMQ broker');
    }

    try {
      // Clean queue name
      const cleanQueueName = queueName.replace('/queue/', '').replace('queue/', '');
      
      logger.debug('Getting queue info', { queueName: cleanQueueName });

      const brokerName = await this.getBrokerName();
      const response = await this.httpClient.get(`/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=${brokerName},destinationType=Queue,destinationName=${cleanQueueName}`);

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
    if (!this.connected) {
      throw new Error('Not connected to ActiveMQ broker');
    }

    try {
      logger.debug('Listing queues');

      // Try multiple approaches to get queue list
      let response;
      let data = {};
      
      try {
        // First try with wildcard broker name
        response = await this.httpClient.get('/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=*,destinationType=Queue,destinationName=*');
        data = response.data?.value || {};
      } catch (error) {
        logger.debug('Wildcard broker query failed, trying specific broker name');
        
        // Fall back to localhost broker name
        try {
          response = await this.httpClient.get('/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost,destinationType=Queue,destinationName=*');
          data = response.data?.value || {};
        } catch (error2) {
          // Try to get broker name first, then query queues
          const brokerResponse = await this.httpClient.get('/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=*');
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
          response = await this.httpClient.get(`/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=${brokerName},destinationType=Queue,destinationName=*`);
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

  async listTopics() {
    if (!this.connected) {
      throw new Error('Not connected to ActiveMQ broker');
    }

    try {
      logger.debug('Listing topics');

      // Try multiple approaches to get topic list
      let response;
      let data = {};
      
      try {
        // First try with wildcard broker name
        response = await this.httpClient.get('/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=*,destinationType=Topic,destinationName=*');
        data = response.data?.value || {};
      } catch (error) {
        logger.debug('Wildcard broker query failed, trying specific broker name');
        
        // Fall back to localhost broker name
        try {
          response = await this.httpClient.get('/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost,destinationType=Topic,destinationName=*');
          data = response.data?.value || {};
        } catch (error2) {
          // Try to get broker name first, then query topics
          const brokerResponse = await this.httpClient.get('/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=*');
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
          response = await this.httpClient.get(`/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=${brokerName},destinationType=Topic,destinationName=*`);
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

  async publishMessage(topicName, message, headers = {}) {
    if (!this.connected) {
      throw new Error('Not connected to ActiveMQ broker');
    }

    try {
      // Clean topic name
      const cleanTopicName = topicName.replace('/topic/', '').replace('topic/', '');
      
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

      const response = await this.httpClient.post(
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

  async getBrokerInfo() {
    if (!this.connected) {
      throw new Error('Not connected to ActiveMQ broker');
    }

    try {
      logger.debug('Getting broker info');

      const brokerName = await this.getBrokerName();
      const response = await this.httpClient.get(`/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=${brokerName}`);

      const brokerData = response.data?.value || {};
      
      const brokerInfo = {
        host: this.config.host,
        port: this.config.port,
        brokerName: brokerData.BrokerName || 'localhost',
        brokerVersion: brokerData.BrokerVersion || 'Unknown',
        uptime: brokerData.UptimeMillis || 0,
        connected: this.connected,
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

  isConnected() {
    return this.connected;
  }

  getConnectionInfo() {
    return {
      host: this.config.host,
      port: this.config.port,
      baseURL: this.config.baseURL,
      connected: this.connected,
      username: this.config.username ? '***' : 'none'
    };
  }
}