import { formatInTimeZone } from 'date-fns-tz';

const PH_TZ = 'Asia/Manila';

export function nowPH(): Date {
  return new Date();
}

export function formatPH(date: Date, pattern = 'yyyy-MM-dd HH:mm:ss'): string {
  return formatInTimeZone(date, PH_TZ, pattern);
}
