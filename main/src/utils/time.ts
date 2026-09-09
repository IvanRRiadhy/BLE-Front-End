import dayjs from 'dayjs';

/**
 * Checks if an API date/time string ends with 'Z' (indicating UTC timezone).
 */
export const hasZTimezone = (dateString?: string | null): boolean => {
  if (!dateString || typeof dateString !== 'string') return false;
  const str = dateString.trim();
  return str.endsWith('Z') || str.endsWith('z');
};

/**
 * Converts an API date/time string to a local Date object.
 * If the string ends with 'Z', JavaScript interprets it as UTC
 * and converts it to the client's local timezone.
 * If the string does NOT end with 'Z', it is already in local timezone,
 * so it is parsed as local time without UTC offset modification.
 */
export const toLocalDate = (dateString?: string | Date | null): Date | null => {
  if (!dateString) return null;
  if (dateString instanceof Date) return dateString;

  const str = String(dateString).trim();
  if (!str) return null;

  let normalized = str;
  if (normalized.includes(' ') && !normalized.includes('T')) {
    normalized = normalized.replace(' ', 'T');
  }

  const date = new Date(normalized);
  return isNaN(date.getTime()) ? new Date(str) : date;
};

/**
 * Formats an API date/time string for display.
 * If the string has 'Z' at the end, it converts from UTC to local time.
 * If the string has NO 'Z' at the end, it is already in local timezone,
 * so it is parsed as local time without shifting the timezone.
 * Then it formats the date using `formatStr` (default: 'MMM D, YYYY HH:mm:ss').
 * If parsing fails, it returns the raw string.
 */
export const formatOrRawTime = (
  dateString?: string | null,
  formatStr: string = 'MMM D, YYYY HH:mm:ss'
): string => {
  if (!dateString) return '-';
  const str = String(dateString).trim();
  if (!str) return '-';

  // Parse with DayJS (DayJS natively parses 'Z' as UTC -> local, and no 'Z' as local)
  const parsed = dayjs(str);
  if (parsed.isValid()) {
    return parsed.format(formatStr);
  }

  // Fallback to toLocalDate
  const date = toLocalDate(str);
  if (!date || isNaN(date.getTime())) return str;
  return dayjs(date).format(formatStr);
};

export const formatFullDateTime = (dateString: string, lang: 'en' | 'id' = 'en') => {
  if (!dateString) return '-';
  const str = String(dateString).trim();
  if (!str) return '-';

  const locale = lang === 'id' ? 'id-ID' : 'en-US';
  const date = toLocalDate(str);
  if (!date || isNaN(date.getTime())) return str;

  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
    .format(date)
    .replace(/\./g, ':'); // make sure seconds use ":"
};

export const getUserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;