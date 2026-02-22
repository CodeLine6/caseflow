import { toZonedTime, fromZonedTime, format as formatTZ } from 'date-fns-tz'

export const IST_TIMEZONE = 'Asia/Kolkata'

/**
 * Get start of day (midnight) in IST, returned as a UTC Date for DB queries
 */
export function getISTStartOfDay(date: Date = new Date()): Date {
    const zoned = toZonedTime(date, IST_TIMEZONE)
    zoned.setHours(0, 0, 0, 0)
    return fromZonedTime(zoned, IST_TIMEZONE)
}

/**
 * Get end of day (23:59:59.999) in IST, returned as a UTC Date for DB queries
 */
export function getISTEndOfDay(date: Date = new Date()): Date {
    const zoned = toZonedTime(date, IST_TIMEZONE)
    zoned.setHours(23, 59, 59, 999)
    return fromZonedTime(zoned, IST_TIMEZONE)
}

/**
 * Format a Date as 'yyyy-MM-dd' in IST
 */
export function formatISTDate(date: Date): string {
    return formatTZ(toZonedTime(date, IST_TIMEZONE), 'yyyy-MM-dd', { timeZone: IST_TIMEZONE })
}

/**
 * Get the current time interpreted in IST (as a zoned Date object)
 */
export function getISTNow(): Date {
    return toZonedTime(new Date(), IST_TIMEZONE)
}

/**
 * Convert a 24h time string (e.g. "14:30") to 12h format (e.g. "2:30 PM")
 */
export function formatTime12h(time: string | null | undefined): string {
    if (!time) return 'Time TBD'
    const match = time.match(/^(\d{1,2}):(\d{2})/)
    if (!match) return time
    const hour = parseInt(match[1])
    const min = match[2]
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${min} ${ampm}`
}
