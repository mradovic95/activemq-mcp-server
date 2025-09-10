export class ConnectionService {
  constructor(core) {
    this.core = core;
  }

  // Connection lifecycle operations
  async connect() {
    return await this.core.connect();
  }

  async disconnect() {
    return await this.core.disconnect();
  }

  async testConnection() {
    return await this.core.testConnection();
  }

  isConnected() {
    return this.core.isConnected();
  }

  getConnectionInfo() {
    return this.core.getConnectionInfo();
  }

  // Utility methods
  getBrokerName() {
    return this.core.getBrokerName();
  }

  parseDestination(destination) {
    return this.core.parseDestination(destination);
  }

  cleanDestinationName(destination) {
    return this.core.cleanDestinationName(destination);
  }
}