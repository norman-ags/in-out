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
      
      const requestData = {
        grant_type: 'refresh_token',
        client_id: 'EMAPTA-MYEMAPTAWEB',
        refresh_token: this.refreshToken,
        scope: 'openid'
      };
      
      this.logger.debug(`Request URL: ${this.config.emapta.baseUrl}/auth/v1/auth/protocol/openid-connect/token`);
      this.logger.debug(`Request body: ${JSON.stringify(requestData)}`);
      
      const response = await this.httpClient.post('/auth/v1/auth/protocol/openid-connect/token', requestData);

      if (response.status === 200 && response.data && response.data.result) {
        const tokenData = response.data.result;
        this.token = tokenData.access_token;
        this.refreshToken = tokenData.refresh_token;
        
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
      
      // Note: Using login endpoint for now as CheckAttendance in Postman uses same endpoint
      // This might need adjustment based on actual API behavior
      const response = await this.httpClient.post('/time-and-attendance/ta/v1/dtr/attendance/login');

      if (response.status === 200 && response.data) {
        const data = response.data;
        
        const attendanceDetails: AttendanceDetails = {
          status: data.status || AttendanceStatus.NOT_STARTED,
          dateTimeIn: data.timeIn || data.time_in || null,
          dateTimeOut: data.timeOut || data.time_out || null,
          workingHours: data.workingHours || data.working_hours || 0,
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
      
      const response = await this.httpClient.post('/time-and-attendance/ta/v1/dtr/attendance/login');

      const success = response.status === 200;
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
      
      const response = await this.httpClient.post('/time-and-attendance/ta/v1/dtr/attendance/logout');

      const success = response.status === 200;
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