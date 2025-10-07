import { ILoggerService, IConnectionService, IEmaptaIntegrationService, ISchedulerService, IOfflineService, AppConfig, AttendanceDetails } from './interfaces';
import { AttendanceStatus } from './models';

export class App {
  private readonly logger: ILoggerService;
  private readonly connectionService: IConnectionService;
  private readonly emaptaService: IEmaptaIntegrationService;
  private readonly schedulerService: ISchedulerService;
  private readonly offlineService: IOfflineService;
  private readonly config: AppConfig;

  constructor(
    logger: ILoggerService,
    connectionService: IConnectionService,
    emaptaService: IEmaptaIntegrationService,
    schedulerService: ISchedulerService,
    offlineService: IOfflineService,
    config: AppConfig
  ) {
    this.logger = logger;
    this.connectionService = connectionService;
    this.emaptaService = emaptaService;
    this.schedulerService = schedulerService;
    this.offlineService = offlineService;
    this.config = config;
  }

  async run(): Promise<void> {
    try {
      this.logger.info('Starting Attendance Automation...');

      // Check internet connection first
      const hasInternet = await this.connectionService.hasInternetConnection();
      if (!hasInternet) {
        this.logger.warn('No internet connection detected');
        if (!this.config.offline.fallbackEnabled) {
          this.logger.error('Offline mode is disabled. Exiting.');
          return;
        }
        this.logger.info('Continuing in offline mode');
      }

      // Validate token if we have internet
      if (hasInternet) {
        if (!this.emaptaService.hasToken()) {
          this.logger.error('No reference token set up');
          return;
        }

        // Skip token refresh for now - using existing token
        this.logger.info('Using existing token (skipping refresh for testing)');
        
        if (!await this.emaptaService.isTokenRefreshed()) {
          this.logger.error('ISSUE WITH REFRESH TOKEN :(');
          return;
        }
      }

      // Schedule automatic clock-in (when computer starts)
      this.schedulerService.scheduleClockIn();

      // Schedule automatic clock-out (after work hours)
      this.schedulerService.scheduleClockOut();

      // Start periodic checks
      this.schedulerService.startPeriodicCheck();

      this.logger.info('Attendance automation is now running...');

      // Keep the application running
      this.setupGracefulShutdown();

    } catch (error: any) {
      this.logger.error(`Application error: ${error.message} -- ${error.stack}`);
    }
  }

  async performManualCheck(): Promise<void> {
    try {
      // Check if there's internet connection
      const hasInternet = await this.connectionService.hasInternetConnection();
      if (!hasInternet) {
        this.logger.warn('No internet connection for manual check');
        return;
      }

      if (!this.emaptaService.hasToken()) {
        this.logger.error('No reference token set up');
        return;
      }

      if (!await this.emaptaService.isTokenRefreshed()) {
        this.logger.error('ISSUE WITH REFRESH TOKEN :(');
        return;
      }

      const attendanceDetails = await this.emaptaService.getAttendanceDetails();

      // Check if it's a rest day or on leave
      const isRestDay = this.isStatusEqual(attendanceDetails.status, AttendanceStatus.RESTDAY) ||
                       this.isStatusEqual(attendanceDetails.status, AttendanceStatus.ON_LEAVE) ||
                       this.isStatusEqual(attendanceDetails.status, AttendanceStatus.HOLIDAY);

      if (isRestDay) {
        this.logger.info("Don't bother working - it's a rest day/holiday/leave");
        return;
      }

      // Check if DTR is completed
      if (this.isStatusEqual(attendanceDetails.status, AttendanceStatus.COMPLETED)) {
        this.logger.info("Shift is completed");
        return;
      }

      // Check if DTR is ready to clock out
      const hasTimeIn = !!(attendanceDetails.dateTimeIn?.trim());
      if (hasTimeIn && !isRestDay) {
        await this.processDtr("Out", () => this.emaptaService.hasClockedOut());
        return;
      }

      // Check if DTR is ready to clock in
      if (!hasTimeIn && !isRestDay) {
        await this.processDtr("In", () => this.emaptaService.hasClockedIn());
        return;
      }

      this.logger.info("Automation didn't trigger - manual intervention may be needed");

    } catch (error: any) {
      this.logger.error(`Manual check error: ${error.message}`);
    }
  }

  private async processDtr(action: string, clockFunc: () => Promise<boolean>): Promise<void> {
    try {
      const success = await clockFunc();
      if (success) {
        this.logger.info(`Clocked ${action} Successfully!`);
        this.logger.info(`Clocked ${action} at ${new Date().toLocaleTimeString()}`);
      } else {
        this.logger.error(`Clock ${action} failed`);
      }
    } catch (error: any) {
      this.logger.error(`Error processing ${action}: ${error.message}`);
    }
  }

  private isStatusEqual(actual: string, expected: string): boolean {
    if (!actual || !expected) return false;
    return expected.toLowerCase() === actual.toLowerCase();
  }

  private setupGracefulShutdown(): void {
    const gracefulShutdown = () => {
      this.logger.info('Shutting down gracefully...');
      this.schedulerService.stopAllJobs();
      process.exit(0);
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
    process.on('SIGUSR2', gracefulShutdown); // Nodemon
  }
}