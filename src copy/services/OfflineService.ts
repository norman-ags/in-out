import fs from 'fs';
import path from 'path';
import { IOfflineService, ILoggerService, OfflineAction } from '../interfaces';

export class OfflineService implements IOfflineService {
  private readonly logger: ILoggerService;
  private readonly dataPath: string;

  constructor(logger: ILoggerService, dataPath: string = './data/offline.json') {
    this.logger = logger;
    this.dataPath = dataPath;
    this.ensureDataDirectory();
  }

  saveOfflineAction(action: OfflineAction): void {
    try {
      const actions = this.getOfflineActions();
      actions.push(action);
      
      fs.writeFileSync(this.dataPath, JSON.stringify(actions, null, 2));
      this.logger.info(`Saved offline action: ${action.type} at ${action.timestamp}`);
    } catch (error: any) {
      this.logger.error(`Failed to save offline action: ${error.message}`);
    }
  }

  getOfflineActions(): OfflineAction[] {
    try {
      if (!fs.existsSync(this.dataPath)) {
        return [];
      }

      const data = fs.readFileSync(this.dataPath, 'utf8');
      const actions = JSON.parse(data) as OfflineAction[];
      
      // Convert string timestamps back to Date objects
      return actions.map(action => ({
        ...action,
        timestamp: new Date(action.timestamp)
      }));
    } catch (error: any) {
      this.logger.error(`Failed to load offline actions: ${error.message}`);
      return [];
    }
  }

  clearOfflineActions(): void {
    try {
      fs.writeFileSync(this.dataPath, JSON.stringify([], null, 2));
      this.logger.info('Cleared all offline actions');
    } catch (error: any) {
      this.logger.error(`Failed to clear offline actions: ${error.message}`);
    }
  }

  async processOfflineActions(): Promise<void> {
    // This method will be implemented when online service is available
    // For now, it's a placeholder
    this.logger.info('Processing offline actions (not implemented yet)');
  }

  private ensureDataDirectory(): void {
    const dir = path.dirname(this.dataPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}