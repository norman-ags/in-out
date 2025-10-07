export interface IConnectionService {
  hasInternetConnection(): Promise<boolean>;
}

export interface IEmaptaIntegrationService {
  hasToken(): boolean;
  isTokenRefreshed(): Promise<boolean>;
  getAttendanceDetails(): Promise<AttendanceDetails>;
  hasClockedIn(): Promise<boolean>;
  hasClockedOut(): Promise<boolean>;
  clockIn(): Promise<boolean>;
  clockOut(): Promise<boolean>;
}

export interface ILoggerService {
  info(message: string): void;
  error(message: string): void;
  warn(message: string): void;
  debug(message: string): void;
}

export interface ISchedulerService {
  scheduleClockIn(): void;
  scheduleClockOut(): void;
  startPeriodicCheck(): void;
  stopAllJobs(): void;
}

export interface IOfflineService {
  saveOfflineAction(action: OfflineAction): void;
  getOfflineActions(): OfflineAction[];
  clearOfflineActions(): void;
  processOfflineActions(): Promise<void>;
}

export interface AttendanceDetails {
  status: string;
  dateTimeIn: string | null;
  dateTimeOut: string | null;
  workingHours: number;
  isRestDay: boolean;
  isOnLeave: boolean;
  isHoliday: boolean;
}

export interface OfflineAction {
  type: 'clock-in' | 'clock-out';
  timestamp: Date;
  processed: boolean;
}

export interface AppConfig {
  emapta: {
    baseUrl: string;
    token?: string;
    refreshToken?: string;
  };
  automation: {
    workHours: number;
    autoClockIn: boolean;
    autoClockOut: boolean;
    checkIntervalMinutes: number;
  };
  offline: {
    fallbackEnabled: boolean;
    dataPath: string;
  };
  logging: {
    level: string;
    filePath: string;
  };
}