// Facade that composes core + services into unified interface
export { ActiveMQFacade } from './activemq-facade.js';

// Domain-specific services that operate on the core client
export { ConnectionService } from './connection-service.js';
export { QueueService } from './queue-service.js';
export { TopicService } from './topic-service.js';
export { BrokerService } from './broker-service.js';