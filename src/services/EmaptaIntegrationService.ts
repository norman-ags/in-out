import axios, { AxiosInstance } from 'axios';
import { IEmaptaIntegrationService, ILoggerService, ITokenService, AttendanceDetails, AppConfig } from '../interfaces';
import { AttendanceStatus, EmaptaApiResponse, TokenResponse } from '../models';

export class EmaptaIntegrationService implements IEmaptaIntegrationService {
  private readonly logger: ILoggerService;
  private readonly config: AppConfig;
  private readonly httpClient: AxiosInstance;
  private readonly tokenService: ITokenService;
  private token: string | undefined;
  private refreshToken: string | undefined;

  constructor(logger: ILoggerService, config: AppConfig, tokenService: ITokenService) {
    this.logger = logger;
    this.config = config;
    this.tokenService = tokenService;
    this.token = config.emapta.token;
    this.refreshToken = config.emapta.refreshToken;

    this.httpClient = axios.create({
      baseURL: config.emapta.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
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
        const newAccessToken = tokenData.access_token;
        const newRefreshToken = tokenData.refresh_token;
        
        if (newAccessToken && newRefreshToken) {
          this.token = newAccessToken;
          this.refreshToken = newRefreshToken;
          
          // Save tokens to .env file
          const tokensSaved = await this.tokenService.updateTokens(newAccessToken, newRefreshToken);
          if (!tokensSaved) {
            this.logger.warn('Failed to save tokens to .env file, but token refresh was successful');
          }
          
          this.logger.info('Token refreshed successfully');
          return true;
        } else {
          this.logger.error('Token refresh response missing access_token or refresh_token');
          return false;
        }
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
      
      // Get current date and date range (last 2 weeks)
      const today = new Date();
      const twoWeeksAgo = new Date(today);
      twoWeeksAgo.setDate(today.getDate() - 14);
      
      const dateFrom = twoWeeksAgo.toISOString().split('T')[0];
      const dateTo = today.toISOString().split('T')[0];
      
      this.logger.debug(`Fetching attendance from ${dateFrom} to ${dateTo}`);
      
      const response = await this.httpClient.get('/time-and-attendance/ta/v1/dtr/attendance', {
        params: {
          date_from: dateFrom,
          date_to: dateTo
        }
      });

      if (response.status === 200 && response.data && response.data.data && response.data.data.items) {
        const items = response.data.data.items;
        
        // Find today's attendance record
        let todayRecord = null;
        const todayStr = today.toISOString().split('T')[0];
        
        todayRecord = items.find((record: any) => 
          record.work_date === todayStr
        );
        
        if (!todayRecord) {
          this.logger.warn(`No attendance record found for today (${todayStr})`);
        }
        
        // Calculate working hours from minutes
        const workingHours = todayRecord?.work_minutes_rendered ? 
          Math.round((todayRecord.work_minutes_rendered / 60) * 100) / 100 : 0;
        
        const attendanceDetails: AttendanceDetails = {
          status: todayRecord?.attendance_status || AttendanceStatus.NOT_STARTED,
          dateTimeIn: todayRecord?.date_time_in || null,
          dateTimeOut: todayRecord?.date_time_out || null,
          workingHours: workingHours,
          isRestDay: todayRecord?.is_restday === true,
          isOnLeave: todayRecord?.attendance_status === 'On leave',
          isHoliday: todayRecord?.holidays && todayRecord.holidays.length > 0
        };

        this.logger.info(`Attendance status: ${attendanceDetails.status}`);
        this.logger.debug(`Today's record: ${JSON.stringify(todayRecord)}`);
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
      
      // Use the correct clock in endpoint
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
      
      // Use the correct clock out endpoint
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