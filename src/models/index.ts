export class AttendanceStatus {
  static readonly RESTDAY = 'Rest Day';
  static readonly ON_LEAVE = 'On leave';  // Updated to match API response
  static readonly COMPLETED = 'Completed';
  static readonly HOLIDAY = 'Holiday';
  static readonly IN_PROGRESS = 'In Progress';
  static readonly NOT_STARTED = 'Not started';  // Updated to match API response
}

export class AttendanceItem {
  static readonly RESTDAY = AttendanceStatus.RESTDAY;
  static readonly ON_LEAVE = AttendanceStatus.ON_LEAVE;
  static readonly COMPLETED = AttendanceStatus.COMPLETED;
  static readonly HOLIDAY = AttendanceStatus.HOLIDAY;
}

export interface EmaptaApiResponse {
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
}

export interface TokenResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  timeIn?: string;
  timeOut?: string;
  status: string;
  workingHours: number;
  isRestDay: boolean;
  isOnLeave: boolean;
  isHoliday: boolean;
}