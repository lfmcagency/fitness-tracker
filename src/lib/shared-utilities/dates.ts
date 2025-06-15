// Date, time, and timezone utilities (eliminates 2x duplication across stores)

/**
 * Time block enumeration for consistent use across domains
 */
export type TimeBlock = 'morning' | 'afternoon' | 'evening';

/**
 * Time ranges for each block (24-hour format)
 */
export const TIME_BLOCK_RANGES = {
  morning: { start: '06:00', end: '11:59' },
  afternoon: { start: '12:00', end: '17:59' },
  evening: { start: '18:00', end: '05:59' } // Wraps to next day
} as const;

/**
 * Get today's date string in YYYY-MM-DD format (local timezone)
 * Used by task and nutrition stores
 */
export function getTodayString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get yesterday's date string in YYYY-MM-DD format
 */
export function getYesterdayString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return formatDateToString(yesterday);
}

/**
 * Get tomorrow's date string in YYYY-MM-DD format
 */
export function getTomorrowString(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return formatDateToString(tomorrow);
}

/**
 * Format a Date object to YYYY-MM-DD string
 */
export function formatDateToString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD string to Date object (local timezone)
 */
export function parseStringToDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Get time block for a given time string (HH:MM format)
 * Used by task and nutrition stores for organization
 */
export function getTimeBlockForTime(timeString: string): TimeBlock {
  if (!timeString || !timeString.includes(':')) {
    return 'morning'; // Default fallback
  }

  const [hoursStr] = timeString.split(':');
  const hours = parseInt(hoursStr, 10);

  if (isNaN(hours)) {
    return 'morning'; // Default fallback
  }

  if (hours >= 6 && hours < 12) return 'morning';
  if (hours >= 12 && hours < 18) return 'afternoon';
  return 'evening';
}

/**
 * Get time block for current time
 */
export function getCurrentTimeBlock(): TimeBlock {
  const now = new Date();
  const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  return getTimeBlockForTime(timeString);
}

/**
 * Check if a time string falls within a specific time block
 */
export function isTimeInBlock(timeString: string, timeBlock: TimeBlock): boolean {
  const detectedBlock = getTimeBlockForTime(timeString);
  return detectedBlock === timeBlock;
}

/**
 * Normalize date to start of day (00:00:00.000)
 */
export function normalizeToStartOfDay(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

/**
 * Normalize date to end of day (23:59:59.999)
 */
export function normalizeToEndOfDay(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(23, 59, 59, 999);
  return normalized;
}

/**
 * Check if two dates are on the same day (ignoring time)
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return formatDateToString(date1) === formatDateToString(date2);
}

/**
 * Check if date is today
 */
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/**
 * Check if date is yesterday
 */
export function isYesterday(date: Date): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(date, yesterday);
}

/**
 * Check if date is tomorrow
 */
export function isTomorrow(date: Date): boolean {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return isSameDay(date, tomorrow);
}

/**
 * Calculate days between two dates (absolute value)
 */
export function daysBetween(date1: Date, date2: Date): number {
  const normalized1 = normalizeToStartOfDay(date1);
  const normalized2 = normalizeToStartOfDay(date2);
  const diffMs = Math.abs(normalized2.getTime() - normalized1.getTime());
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Add days to a date (returns new Date object)
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Subtract days from a date (returns new Date object)
 */
export function subtractDays(date: Date, days: number): Date {
  return addDays(date, -days);
}

/**
 * Get start of week (Sunday) for a given date
 */
export function getWeekStart(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = result.getDate() - day;
  result.setDate(diff);
  return normalizeToStartOfDay(result);
}

/**
 * Get end of week (Saturday) for a given date
 */
export function getWeekEnd(date: Date): Date {
  const weekStart = getWeekStart(date);
  return normalizeToEndOfDay(addDays(weekStart, 6));
}

/**
 * Get start of month for a given date
 */
export function getMonthStart(date: Date): Date {
  const result = new Date(date);
  result.setDate(1);
  return normalizeToStartOfDay(result);
}

/**
 * Get end of month for a given date
 */
export function getMonthEnd(date: Date): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + 1, 0); // Last day of current month
  return normalizeToEndOfDay(result);
}

/**
 * Format date for display in different formats
 */
export function formatDateForDisplay(
  date: Date,
  format: 'short' | 'medium' | 'long' | 'relative' = 'medium'
): string {
  if (format === 'relative') {
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    if (isTomorrow(date)) return 'Tomorrow';
    
    const days = daysBetween(new Date(), date);
    if (days <= 7) {
      return date.toLocaleDateString('en-US', { weekday: 'long' });
    }
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  const options: Intl.DateTimeFormatOptions = {
    short: { month: 'numeric' as const, day: 'numeric' as const },
    medium: { month: 'short' as const, day: 'numeric' as const },
    long: { weekday: 'long' as const, month: 'long' as const, day: 'numeric' as const, year: 'numeric' as const }
  }[format];

  return date.toLocaleDateString('en-US', options);
}

/**
 * Format time for display (HH:MM format)
 */
export function formatTimeForDisplay(timeString: string): string {
  if (!timeString || !timeString.includes(':')) {
    return '00:00';
  }

  const [hours, minutes] = timeString.split(':');
  const h = parseInt(hours, 10);
  const m = parseInt(minutes, 10);

  if (isNaN(h) || isNaN(m)) {
    return '00:00';
  }

  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Convert 24-hour time to 12-hour format with AM/PM
 */
export function format24to12Hour(timeString: string): string {
  const [hoursStr, minutesStr] = timeString.split(':');
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);

  if (isNaN(hours) || isNaN(minutes)) {
    return '12:00 AM';
  }

  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Get current time in HH:MM format
 */
export function getCurrentTimeString(): string {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
}

/**
 * Validate time string format (HH:MM)
 */
export function isValidTimeString(timeString: string): boolean {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(timeString);
}

/**
 * Validate date string format (YYYY-MM-DD)
 */
export function isValidDateString(dateString: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return false;
  }

  const date = parseStringToDate(dateString);
  return formatDateToString(date) === dateString;
}

/**
 * Get date range for different periods (useful for analytics)
 */
export function getDateRange(
  period: 'today' | 'yesterday' | 'week' | 'month' | 'year',
  referenceDate: Date = new Date()
): { start: Date; end: Date } {
  switch (period) {
    case 'today':
      return {
        start: normalizeToStartOfDay(referenceDate),
        end: normalizeToEndOfDay(referenceDate)
      };
    
    case 'yesterday':
      const yesterday = subtractDays(referenceDate, 1);
      return {
        start: normalizeToStartOfDay(yesterday),
        end: normalizeToEndOfDay(yesterday)
      };
    
    case 'week':
      return {
        start: getWeekStart(referenceDate),
        end: getWeekEnd(referenceDate)
      };
    
    case 'month':
      return {
        start: getMonthStart(referenceDate),
        end: getMonthEnd(referenceDate)
      };
    
    case 'year':
      const yearStart = new Date(referenceDate.getFullYear(), 0, 1);
      const yearEnd = new Date(referenceDate.getFullYear(), 11, 31, 23, 59, 59, 999);
      return {
        start: yearStart,
        end: yearEnd
      };
    
    default:
      return {
        start: normalizeToStartOfDay(referenceDate),
        end: normalizeToEndOfDay(referenceDate)
      };
  }
}

/**
 * Check if a given date falls within a date range
 */
export function isDateInRange(date: Date, start: Date, end: Date): boolean {
  const normalizedDate = normalizeToStartOfDay(date);
  const normalizedStart = normalizeToStartOfDay(start);
  const normalizedEnd = normalizeToEndOfDay(end);
  
  return normalizedDate >= normalizedStart && normalizedDate <= normalizedEnd;
}

/**
 * Generate array of dates between start and end (inclusive)
 */
export function getDatesBetween(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(start);
  const endDate = new Date(end);
  
  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}