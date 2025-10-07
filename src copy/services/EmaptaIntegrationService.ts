import axios, { AxiosInstance } from 'axios';
import { IEmaptaIntegrationService, ILoggerService, AttendanceDetails, AppConfig } from '../interfaces';
import { AttendanceStatus, EmaptaApiResponse, TokenResponse } from '../models';

export class EmaptaIntegrationService implements IEmaptaIntegrationService {
  private readonly logger: ILoggerService;
  private readonly config: AppConfig;
  private readonly httpClient: AxiosInstance;
  private token: string | undefined;
  private refreshToken: string | undefined;

  constructor(logger: ILoggerService, config: AppConfig) {
    this.logger = logger;
    this.config = config;
    this.token = config.emapta.token;
    this.refreshToken = config.emapta.refreshToken;

    this.httpClient = axios.create({
      baseURL: config.emapta.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AttendanceAutomation-TS/1.0.0'
      }
    });

    // Add request interceptor to include token
    this.httpClient.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });
  }

  hasToken(): boolean {
    const hasToken = !!(this.token && this.token.trim().length > 0);
    this.logger.debug(`Token check: ${hasToken ? 'Token exists' : 'No token'}`);
    return hasToken;
  }

  async isTokenRefreshed(): Promise<boolean> {
    try {
      if (!this.refreshToken) {
        this.logger.error('No refresh token available');
        return false;
      }

      this.logger.info('Attempting to refresh token...');
      
      const response = await this.httpClient.post('/auth/refresh', {
        refreshToken: this.refreshToken
      });

      if (response.status === 200 && response.data) {
        const tokenData: TokenResponse = response.data;
        this.token = tokenData.token;
        this.refreshToken = tokenData.refreshToken;
        
        this.logger.info('Token refreshed successfully');
        return true;
      }

      this.logger.error('Failed to refresh token: Invalid response');
      return false;
    } catch (error: any) {
      this.logger.error(`Token refresh failed: ${error.message}`);
      return false;
    }
  }

  async getAttendanceDetails(): Promise<AttendanceDetails> {
    try {
      this.logger.debug('Fetching attendance details...');
      
      const today = new Date().toISOString().split('T')[0];
      const response = await this.httpClient.get(`/attendance/details?date=${today}`);

      if (response.status === 200 && response.data) {
        const data = response.data;
        
        const attendanceDetails: AttendanceDetails = {
          status: data.status || AttendanceStatus.NOT_STARTED,
          dateTimeIn: data.timeIn || null,
          dateTimeOut: data.timeOut || null,
          workingHours: data.workingHours || 0,
          isRestDay: this.isStatusEqual(data.status, AttendanceStatus.RESTDAY),
          isOnLeave: this.isStatusEqual(data.status, AttendanceStatus.ON_LEAVE),
          isHoliday: this.isStatusEqual(data.status, AttendanceStatus.HOLIDAY)
        };

        this.logger.info(`Attendance status: ${attendanceDetails.status}`);
        return attendanceDetails;
      }

      throw new Error('Invalid response from attendance API');
    } catch (error: any) {
      this.logger.error(`Failed to get attendance details: ${error.message}`);
      throw error;
    }
  }

  async hasClockedIn(): Promise<boolean> {
    try {
      this.logger.debug('Attempting to clock in...');
      
      const response = await this.httpClient.post('/attendance/clock-in', {
        timestamp: new Date().toISOString()
      });

      const success = response.status === 200 && response.data?.success === true;
      this.logger.info(`Clock in ${success ? 'successful' : 'failed'}`);
      return success;
    } catch (error: any) {
      this.logger.error(`Clock in failed: ${error.message}`);
      return false;
    }
  }

  async hasClockedOut(): Promise<boolean> {
    try {
      this.logger.debug('Attempting to clock out...');
      
      const response = await this.httpClient.post('/attendance/clock-out', {
        timestamp: new Date().toISOString()
      });

      const success = response.status === 200 && response.data?.success === true;
      this.logger.info(`Clock out ${success ? 'successful' : 'failed'}`);
      return success;
    } catch (error: any) {
      this.logger.error(`Clock out failed: ${error.message}`);
      return false;
    }
  }

  async clockIn(): Promise<boolean> {
    return this.hasClockedIn();
  }

  async clockOut(): Promise<boolean> {
    return this.hasClockedOut();
  }

  private isStatusEqual(actual: string, expected: string): boolean {
    if (!actual || !expected) return false;
    return expected.toLowerCase() === actual.toLowerCase();
  }
}