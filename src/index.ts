import { App } from './App';
import { LoggerService } from './services/LoggerService';
import { ConnectionService } from './services/ConnectionService';
import { EmaptaIntegrationService } from './services/EmaptaIntegrationService';
import { SchedulerService } from './services/SchedulerService';
import { OfflineService } from './services/OfflineService';
import { ConfigService } from './services/ConfigService';

async function main(): Promise<void> {
  try {
    // Load configuration
    const configService = new ConfigService();
    const config = configService.getConfig();
    
    // Initialize services
    const logger = new LoggerService(config.logging.level, config.logging.filePath);
    const connectionService = new ConnectionService(logger);
    const emaptaService = new EmaptaIntegrationService(logger, config);
    const offlineService = new OfflineService(logger, config.offline.dataPath);
    const schedulerService = new SchedulerService(
      logger,
      config,
      connectionService,
      emaptaService,
      offlineService
    );

    // Create and run the application
    const app = new App(
      logger,
      connectionService,
      emaptaService,
      schedulerService,
      offlineService,
      config
    );

    await app.run();

  } catch (error: any) {
    console.error('Failed to start application:', error.message);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the application
main().catch((error) => {
  console.error('Application startup failed:', error);
  process.exit(1);
});