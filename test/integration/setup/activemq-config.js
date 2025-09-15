// Simple test configuration - assumes ActiveMQ is running via Docker Compose
export const activemqConfig = {
  host: 'localhost',
  port: 8161,      // Web console port for REST API
  stompPort: 61616, // STOMP port for reference
  webPort: 8161,
  username: 'admin',
  password: 'admin',
  ssl: false
}