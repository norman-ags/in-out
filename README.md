# Attendance Automation TypeScript

A TypeScript-based attendance automation system that automatically handles clock-in and clock-out operations with the Emapta system.

## Features

- **Automatic Clock-In**: Automatically clocks in when computer starts
- **Automatic Clock-Out**: Automatically clocks out after specified work hours (default: 9 hours)
- **Offline Mode**: Saves actions for later processing when internet is unavailable
- **Token Management**: Handles authentication token validation and refreshing
- **Smart Detection**: Recognizes holidays, rest days, and leave status
- **Comprehensive Logging**: Detailed logging with configurable levels
- **Periodic Checks**: Regular monitoring and processing of pending actions

## Requirements

- Node.js (version 16 or higher)
- npm or yarn
- Access to Emapta system API

## Installation

1. Clone or download this project
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment configuration:
   ```bash
   cp .env.example .env
   ```

4. Configure your environment variables in `.env`:
   ```env
   EMAPTA_BASE_URL=https://your-emapta-domain.com/api
   EMAPTA_TOKEN=your_token_here
   EMAPTA_REFRESH_TOKEN=your_refresh_token_here
   ```

## Configuration

Edit the `.env` file with your specific settings:

- `EMAPTA_BASE_URL`: Your Emapta API endpoint
- `EMAPTA_TOKEN`: Your authentication token
- `EMAPTA_REFRESH_TOKEN`: Your refresh token
- `WORK_HOURS`: Number of work hours before auto clock-out (default: 9)
- `AUTO_CLOCK_IN`: Enable/disable automatic clock-in (default: true)
- `AUTO_CLOCK_OUT`: Enable/disable automatic clock-out (default: true)
- `OFFLINE_FALLBACK`: Enable offline mode (default: true)

## Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

### Available Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run start` - Run the compiled application
- `npm run dev` - Run in development mode with ts-node
- `npm run watch` - Watch for changes and recompile
- `npm run clean` - Clean the dist directory
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## How It Works

1. **Startup**: When the application starts (computer boot), it schedules a clock-in attempt
2. **Clock-In Process**: 
   - Checks internet connectivity
   - Validates authentication token
   - Retrieves attendance status
   - Clocks in if conditions are met (not rest day/holiday/leave)

3. **Clock-Out Process**: 
   - Automatically triggered after configured work hours
   - Same validation process as clock-in
   - Clocks out if clocked in and conditions are met

4. **Offline Mode**: 
   - If no internet connection, actions are saved locally
   - When connectivity returns, pending actions are processed

5. **Periodic Checks**: 
   - Regular monitoring every few minutes
   - Processes any pending offline actions
   - Ensures system stays synchronized

## Offline Mode

When `OFFLINE_FALLBACK=true`:
- Clock-in/out actions are saved locally when offline
- Actions are automatically processed when internet connection returns
- Data is stored in `./data/offline.json`

## Logging

Logs are written to:
- Console (with colors)
- File (configurable path, default: `./logs/attendance.log`)

Log levels: `error`, `warn`, `info`, `debug`

## Project Structure

```
src/
├── interfaces/          # TypeScript interfaces
├── models/             # Data models and constants
├── services/           # Service implementations
│   ├── ConnectionService.ts    # Internet connectivity
│   ├── EmaptaIntegrationService.ts  # Emapta API integration
│   ├── LoggerService.ts        # Logging functionality
│   ├── SchedulerService.ts     # Job scheduling
│   ├── OfflineService.ts       # Offline mode handling
│   └── ConfigService.ts        # Configuration management
├── App.ts              # Main application logic
└── index.ts            # Entry point
```

## Troubleshooting

1. **No internet connection**: Check if offline mode is enabled
2. **Token issues**: Verify your EMAPTA_TOKEN and EMAPTA_REFRESH_TOKEN
3. **API errors**: Check your EMAPTA_BASE_URL and credentials
4. **Scheduling issues**: Ensure the application stays running in the background

## License

MIT License