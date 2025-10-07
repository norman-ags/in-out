import * as cron from 'node-cron';
import { ISchedulerService, ILoggerService, IConnectionService, IEmaptaIntegrationService, IOfflineService, AppConfig } from '../interfaces';

export class SchedulerService implements ISchedulerService {
  private readonly logger: ILoggerService;
  private readonly config: AppConfig;
  private readonly connectionService: IConnectionService;
  private readonly emaptaService: IEmaptaIntegrationService;
  private readonly offlineService: IOfflineService;
  private jobs: cron.ScheduledTask[] = [];
  private startTime: Date;

  constructor(
    logger: ILoggerService,
    config: AppConfig,
    connectionService: IConnectionService,
    emaptaService: IEmaptaIntegrationService,
    offlineService: IOfflineService
  ) {
    this.logger = logger;
    this.config = config;
    this.connectionService = connectionService;
    this.emaptaService = emaptaService;
    this.offlineService = offlineService;
    this.startTime = new Date();
  }

  scheduleClockIn(): void {
    if (!this.config.automation.autoClockIn) {
      this.logger.info('Auto clock-in is disabled');
      return;
    }

    // Schedule immediate clock-in check (when computer starts)
    setTimeout(async () => {
      await this.handleClockIn();
    }, 5000); // Wait 5 seconds after startup

    this.logger.info('Clock-in scheduled for startup');
  }

  scheduleClockOut(): void {
    if (!this.config.automation.autoClockOut) {
      this.logger.info('Auto clock-out is disabled');
      return;
    }

    const workHours = this.config.automation.workHours;
    const clockOutTime = new Date(this.startTime.getTime() + (workHours * 60 * 60 * 1000));
    
    const delay = clockOutTime.getTime() - Date.now();
    
    if (delay > 0) {
      setTimeout(async () => {
        await this.handleClockOut();
      }, delay);

      this.logger.info(`Clock-out scheduled for ${clockOutTime.toLocaleString()} (${workHours} hours from start)`);
    } else {
      this.logger.warn('Clock-out time has already passed');
    }
  }

  startPeriodicCheck(): void {
    const intervalMinutes = this.config.automation.checkIntervalMinutes;
    
    // Create a cron job that runs every X minutes
    const cronPattern = `*/${intervalMinutes} * * * *`;
    
    const job = cron.schedule(cronPattern, async () => {
      await this.performPeriodicCheck();
    }, {
      scheduled: false
    });

    job.start();
    this.jobs.push(job);
    
    this.logger.info(`Periodic check started (every ${intervalMinutes} minutes)`);
  }

  stopAllJobs(): void {
    this.jobs.forEach(job => {
      job.stop();
    });
    this.jobs = [];
    this.logger.info('All scheduled jobs stopped');
  }

  private async handleClockIn(): Promise<void> {
    try {
      this.logger.info('Processing clock-in request...');

      const hasInternet = await this.connectionService.hasInternetConnection();
      
      if (!hasInternet) {
        if (this.config.offline.fallbackEnabled) {
          this.offlineService.saveOfflineAction({
            type: 'clock-in',
            timestamp: new Date(),
            processed: false
          });
          this.logger.info('Saved clock-in for offline processing');
        } else {
          this.logger.warn('No internet connection and offline mode disabled');
        }
        return;
      }

      if (!this.emaptaService.hasToken()) {
        this.logger.error('No authentication token available');
        return;
      }

      if (!await this.emaptaService.isTokenRefreshed()) {
        this.logger.error('Failed to refresh authentication token');
        return;
      }

      const attendanceDetails = await this.emaptaService.getAttendanceDetails();
      
      // Check if it's a rest day, holiday, or on leave
      if (attendanceDetails.isRestDay || attendanceDetails.isOnLeave || attendanceDetails.isHoliday) {
        this.logger.info(`Not clocking in - Status: ${attendanceDetails.status}`);
        return;
      }

      // Check if already clocked in
      if (attendanceDetails.dateTimeIn) {
        this.logger.info('Already clocked in for today');
        return;
      }

      const success = await this.emaptaService.clockIn();
      if (success) {
        this.logger.info('Successfully clocked in');
      } else {
        this.logger.error('Failed to clock in');
      }
    } catch (error: any) {
      this.logger.error(`Clock-in error: ${error.message}`);
    }
  }

  private async handleClockOut(): Promise<void> {
    try {
      this.logger.info('Processing clock-out request...');

      const hasInternet = await this.connectionService.hasInternetConnection();
      
      if (!hasInternet) {
        if (this.config.offline.fallbackEnabled) {
          this.offlineService.saveOfflineAction({
            type: 'clock-out',
            timestamp: new Date(),
            processed: false
          });
          this.logger.info('Saved clock-out for offline processing');
        } else {
          this.logger.warn('No internet connection and offline mode disabled');
        }
        return;
      }

      if (!this.emaptaService.hasToken()) {
        this.logger.error('No authentication token available');
        return;
      }

      if (!await this.emaptaService.isTokenRefreshed()) {
        this.logger.error('Failed to refresh authentication token');
        return;
      }

      const attendanceDetails = await this.emaptaService.getAttendanceDetails();
      
      // Check if it's a rest day, holiday, or on leave
      if (attendanceDetails.isRestDay || attendanceDetails.isOnLeave || attendanceDetails.isHoliday) {
        this.logger.info(`Not clocking out - Status: ${attendanceDetails.status}`);
        return;
      }

      // Check if not clocked in yet
      if (!attendanceDetails.dateTimeIn) {
        this.logger.warn('Cannot clock out - not clocked in yet');
        return;
      }

      // Check if already clocked out
      if (attendanceDetails.dateTimeOut) {
        this.logger.info('Already clocked out for today');
        return;
      }

      const success = await this.emaptaService.clockOut();
      if (success) {
        this.logger.info('Successfully clocked out');
      } else {
        this.logger.error('Failed to clock out');
      }
    } catch (error: any) {
      this.logger.error(`Clock-out error: ${error.message}`);
    }
  }

  private async performPeriodicCheck(): Promise<void> {
    try {
      this.logger.debug('Performing periodic check...');
      
      // Process any pending offline actions if we have internet
      const hasInternet = await this.connectionService.hasInternetConnection();
      if (hasInternet) {
        await this.offlineService.processOfflineActions();
      }
      
      // Additional periodic checks can be added here
    } catch (error: any) {
      this.logger.error(`Periodic check error: ${error.message}`);
    }
  }
}