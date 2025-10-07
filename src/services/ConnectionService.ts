import axios from 'axios';
import { IConnectionService, ILoggerService } from '../interfaces';

export class ConnectionService implements IConnectionService {
  private readonly logger: ILoggerService;
  private readonly testUrls = [
    'https://www.google.com',
    'https://www.cloudflare.com',
    'https://1.1.1.1'
  ];

  constructor(logger: ILoggerService) {
    this.logger = logger;
  }

  async hasInternetConnection(): Promise<boolean> {
    try {
      this.logger.debug('Checking internet connection...');
      
      // Try multiple endpoints for reliability
      for (const url of this.testUrls) {
        try {
          const response = await axios.get(url, {
            timeout: 5000,
            headers: {
              'User-Agent': 'AttendanceAutomation/1.0.0'
            }
          });
          
          if (response.status === 200) {
            this.logger.debug(`Internet connection confirmed via ${url}`);
            return true;
          }
        } catch (error) {
          this.logger.debug(`Failed to connect to ${url}: ${error}`);
          continue;
        }
      }
      
      this.logger.warn('No internet connection detected');
      return false;
    } catch (error) {
      this.logger.error(`Error checking internet connection: ${error}`);
      return false;
    }
  }
}