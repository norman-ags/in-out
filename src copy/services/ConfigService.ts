import dotenv from 'dotenv';
import path from 'path';
import { AppConfig } from '../interfaces';

export class ConfigService {
  private config: AppConfig;

  constructor(envPath?: string) {
    // Load environment variables
    if (envPath) {
      dotenv.config({ path: envPath });
    } else {
      dotenv.config();
    }

    this.config = this.loadConfig();
  }

  getConfig(): AppConfig {
    return this.config;
  }

  private loadConfig(): AppConfig {
    return {
      emapta: {
        baseUrl: this.getRequiredEnv('EMAPTA_BASE_URL'),
        username: this.getRequiredEnv('EMAPTA_USERNAME'),
        password: this.getRequiredEnv('EMAPTA_PASSWORD'),
        ...(process.env.EMAPTA_TOKEN && { token: process.env.EMAPTA_TOKEN }),
        ...(process.env.EMAPTA_REFRESH_TOKEN && { refreshToken: process.env.EMAPTA_REFRESH_TOKEN })
      },
      automation: {
        workHours: parseInt(process.env.WORK_HOURS || '9'),
        autoClockIn: this.getBooleanEnv('AUTO_CLOCK_IN', true),
        autoClockOut: this.getBooleanEnv('AUTO_CLOCK_OUT', true),
        checkIntervalMinutes: parseInt(process.env.CHECK_INTERVAL_MINUTES || '5')
      },
      offline: {
        fallbackEnabled: this.getBooleanEnv('OFFLINE_FALLBACK', true),
        dataPath: process.env.OFFLINE_DATA_PATH || './data/offline.json'
      },
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        filePath: process.env.LOG_FILE_PATH || './logs/attendance.log'
      }
    };
  }

  private getRequiredEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Required environment variable ${key} is not set`);
    }
    return value;
  }

  private getBooleanEnv(key: string, defaultValue: boolean = false): boolean {
    const value = process.env[key];
    if (!value) return defaultValue;
    return value.toLowerCase() === 'true';
  }
}