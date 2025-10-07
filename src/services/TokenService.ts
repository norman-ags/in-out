import fs from 'fs';
import path from 'path';
import { ILoggerService } from '../interfaces';

export interface ITokenService {
  updateTokens(accessToken: string, refreshToken: string): Promise<boolean>;
}

export class TokenService implements ITokenService {
  private readonly logger: ILoggerService;
  private readonly envPath: string;

  constructor(logger: ILoggerService, envPath: string = '.env') {
    this.logger = logger;
    this.envPath = path.resolve(envPath);
  }

  async updateTokens(accessToken: string, refreshToken: string): Promise<boolean> {
    try {
      this.logger.debug('Updating tokens in .env file...');

      // Read current .env file
      if (!fs.existsSync(this.envPath)) {
        this.logger.error(`.env file not found at ${this.envPath}`);
        return false;
      }

      let envContent = fs.readFileSync(this.envPath, 'utf8');

      // Update or add access token
      if (envContent.includes('EMAPTA_TOKEN=')) {
        envContent = envContent.replace(
          /EMAPTA_TOKEN=.*/,
          `EMAPTA_TOKEN=${accessToken}`
        );
      } else {
        envContent += `\nEMAPTA_TOKEN=${accessToken}`;
      }

      // Update or add refresh token
      if (envContent.includes('EMAPTA_REFRESH_TOKEN=')) {
        envContent = envContent.replace(
          /EMAPTA_REFRESH_TOKEN=.*/,
          `EMAPTA_REFRESH_TOKEN=${refreshToken}`
        );
      } else {
        envContent += `\nEMAPTA_REFRESH_TOKEN=${refreshToken}`;
      }

      // Write updated content back to .env file
      fs.writeFileSync(this.envPath, envContent, 'utf8');

      // Update process.env for current session
      process.env.EMAPTA_TOKEN = accessToken;
      process.env.EMAPTA_REFRESH_TOKEN = refreshToken;

      this.logger.info('Tokens updated successfully in .env file');
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to update tokens in .env file: ${error.message}`);
      return false;
    }
  }
}