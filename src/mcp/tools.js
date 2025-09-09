export const TOOLS = [
  {
    name: "list_connections",
    description: "List all configured ActiveMQ broker connections",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: "add_connection",
    description: "Add a new ActiveMQ broker connection",
    inputSchema: {
      type: "object",
      properties: {
        connectionId: {
          type: "string",
          description: "Unique identifier for the connection"
        },
        host: {
          type: "string",
          description: "ActiveMQ broker hostname or IP address",
          default: "localhost"
        },
        port: {
          type: "number",
          description: "ActiveMQ web console port",
          default: 8161
        },
        username: {
          type: "string",
          description: "Username for authentication (optional)"
        },
        password: {
          type: "string",
          description: "Password for authentication (optional)"
        },
        maxReconnectAttempts: {
          type: "number",
          description: "Maximum number of reconnection attempts",
          default: 5
        },
        reconnectDelay: {
          type: "number",
          description: "Delay between reconnection attempts in milliseconds",
          default: 5000
        }
      },
      required: ["connectionId"]
    }
  },
  {
    name: "remove_connection",
    description: "Remove an ActiveMQ broker connection",
    inputSchema: {
      type: "object",
      properties: {
        connectionId: {
          type: "string",
          description: "ID of the connection to remove"
        }
      },
      required: ["connectionId"]
    }
  },
  {
    name: "test_connection",
    description: "Test connectivity to an ActiveMQ broker",
    inputSchema: {
      type: "object",
      properties: {
        host: {
          type: "string",
          description: "ActiveMQ broker hostname or IP address",
          default: "localhost"
        },
        port: {
          type: "number",
          description: "ActiveMQ web console port",
          default: 8161
        },
        username: {
          type: "string",
          description: "Username for authentication (optional)"
        },
        password: {
          type: "string",
          description: "Password for authentication (optional)"
        }
      },
      required: ["host", "port"]
    }
  },
  {
    name: "connection_info",
    description: "Get detailed information about a specific connection",
    inputSchema: {
      type: "object",
      properties: {
        connectionId: {
          type: "string",
          description: "ID of the connection to get info for"
        }
      },
      required: ["connectionId"]
    }
  },
  {
    name: "health_status",
    description: "Get health status of all connections",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: "list_queues",
    description: "List all queues for a connection",
    inputSchema: {
      type: "object",
      properties: {
        connectionId: {
          type: "string",
          description: "ID of the connection to list queues for"
        }
      },
      required: ["connectionId"]
    }
  },
  {
    name: "queue_info",
    description: "Get queue statistics and information",
    inputSchema: {
      type: "object",
      properties: {
        connectionId: {
          type: "string",
          description: "ID of the connection"
        },
        queueName: {
          type: "string",
          description: "Name of the queue"
        }
      },
      required: ["connectionId", "queueName"]
    }
  },
  {
    name: "send_message",
    description: "Send a message to a queue or topic",
    inputSchema: {
      type: "object",
      properties: {
        connectionId: {
          type: "string",
          description: "ID of the connection"
        },
        destination: {
          type: "string",
          description: "Queue or topic destination (e.g., /queue/myqueue or /topic/mytopic)"
        },
        message: {
          type: "string",
          description: "Message content to send"
        },
        headers: {
          type: "object",
          description: "Optional message headers"
        }
      },
      required: ["connectionId", "destination", "message"]
    }
  },
  {
    name: "consume_message",
    description: "Consume a message from a queue",
    inputSchema: {
      type: "object",
      properties: {
        connectionId: {
          type: "string",
          description: "ID of the connection"
        },
        queueName: {
          type: "string",
          description: "Name of the queue to consume from"
        },
        timeout: {
          type: "number",
          description: "Timeout in milliseconds to wait for a message",
          default: 5000
        },
        autoAck: {
          type: "boolean",
          description: "Automatically acknowledge the message",
          default: true
        },
        clientId: {
          type: "string",
          description: "Client ID for persistent consumer sessions (optional)"
        },
        selector: {
          type: "string",
          description: "JMS message selector for filtering messages (optional)"
        }
      },
      required: ["connectionId", "queueName"]
    }
  },
  {
    name: "browse_messages",
    description: "Browse messages in a queue without consuming them",
    inputSchema: {
      type: "object",
      properties: {
        connectionId: {
          type: "string",
          description: "ID of the connection"
        },
        queueName: {
          type: "string",
          description: "Name of the queue to browse"
        },
        limit: {
          type: "number",
          description: "Maximum number of messages to retrieve",
          default: 10
        }
      },
      required: ["connectionId", "queueName"]
    }
  },
  {
    name: "purge_queue",
    description: "Remove all messages from a queue",
    inputSchema: {
      type: "object",
      properties: {
        connectionId: {
          type: "string",
          description: "ID of the connection"
        },
        queueName: {
          type: "string",
          description: "Name of the queue to purge"
        },
        confirm: {
          type: "boolean",
          description: "Confirmation flag - must be true to proceed with purge"
        }
      },
      required: ["connectionId", "queueName", "confirm"]
    }
  },
  {
    name: "list_topics",
    description: "List all topics for a connection",
    inputSchema: {
      type: "object",
      properties: {
        connectionId: {
          type: "string",
          description: "ID of the connection to list topics for"
        }
      },
      required: ["connectionId"]
    }
  },
  {
    name: "publish_message",
    description: "Publish a message to a topic",
    inputSchema: {
      type: "object",
      properties: {
        connectionId: {
          type: "string",
          description: "ID of the connection"
        },
        topicName: {
          type: "string",
          description: "Name of the topic to publish to"
        },
        message: {
          type: "string",
          description: "Message content to publish"
        },
        headers: {
          type: "object",
          description: "Optional message headers"
        }
      },
      required: ["connectionId", "topicName", "message"]
    }
  },
  {
    name: "subscribe_topic",
    description: "Subscribe to a topic and receive messages",
    inputSchema: {
      type: "object",
      properties: {
        connectionId: {
          type: "string",
          description: "ID of the connection"
        },
        topicName: {
          type: "string",
          description: "Name of the topic to subscribe to"
        },
        timeout: {
          type: "number",
          description: "Timeout in milliseconds to wait for messages",
          default: 10000
        },
        maxMessages: {
          type: "number",
          description: "Maximum number of messages to receive",
          default: 1
        }
      },
      required: ["connectionId", "topicName"]
    }
  },
  {
    name: "broker_info",
    description: "Get broker statistics and health information",
    inputSchema: {
      type: "object",
      properties: {
        connectionId: {
          type: "string",
          description: "ID of the connection to get broker info for"
        }
      },
      required: ["connectionId"]
    }
  },
  {
    name: "broker_stats",
    description: "Get comprehensive broker statistics for all connections",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: "export_connections",
    description: "Export connection configurations for backup or migration",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: "import_connections",
    description: "Import connection configurations from backup",
    inputSchema: {
      type: "object",
      properties: {
        connections: {
          type: "object",
          description: "Connection configurations to import"
        },
        overwrite: {
          type: "boolean",
          description: "Whether to overwrite existing connections with same ID"
        }
      },
      required: ["connections"]
    }
  },
  {
    name: "system_status",
    description: "Get overall system status and performance metrics",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false
    }
  }
]