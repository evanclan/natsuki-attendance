/**
 * Time rounding utilities for attendance calculations
 * 
 * These functions implement the 15-minute time rounding rules:
 * - Late check-in: Round UP to next 15-minute mark (9:01 → 9:15, 9:16 → 9:30)
 * - Early check-out: Round DOWN to previous 15-minute mark (5:50 → 5:45, 5:44 → 5:30)
 * - Overtime: Round to nearest 15-minute interval
 *
 * NOTE: All functions here should be timezone-agnostic (Math-only) or strictly handled in JST.
 */

/**
 * Construct a Date object from a base date and time string (HH:MM)
 * Interprets the time as Asia/Tokyo time.
 * @param baseDate The date component
 * @param timeStr HH:MM
 */
export function constructJSTDate(baseDate: Date, timeStr: string): Date {
    // 1. Get YYYY-MM-DD in JST from baseDate
    const jstDateStr = baseDate.toLocaleDateString('sv-SE', {
        timeZone: 'Asia/Tokyo'
    })

    // 2. Append time and timezone offset for JST (+09:00)
    // Format: YYYY-MM-DDTHH:MM:00+09:00
    // Ensure timeStr is HH:MM (take first 5 chars if HH:MM:SS provided)
    const normalizedTime = timeStr.slice(0, 5)
    const isoString = `${jstDateStr}T${normalizedTime}:00+09:00`

    return new Date(isoString)
}

/**
 * Round time UP to the next 15-minute interval
 * Used for: Late check-ins
 * 
 * Examples:
 * - 9:00 → 9:00 (no change, already on interval)
 * - 9:01 → 9:15
 * - 9:14 → 9:15
 * - 9:15 → 9:15 (no change)
 * - 9:16 → 9:30
 * - 9:31 → 9:45
 */
export function roundTimeUp15(date: Date): Date {
    const result = new Date(date)
    const minutes = result.getMinutes()
    const remainder = minutes % 15

    if (remainder !== 0) {
        const minutesToAdd = 15 - remainder
        result.setMinutes(minutes + minutesToAdd)
    }

    // Reset seconds and milliseconds to 0
    result.setSeconds(0, 0)
    return result
}

/**
 * Round time DOWN to the previous 15-minute interval
 * Used for: Early check-outs
 * 
 * Examples:
 * - 6:00 → 6:00 (no change, already on interval)
 * - 5:59 → 5:45
 * - 5:50 → 5:45
 * - 5:45 → 5:45 (no change)
 * - 5:44 → 5:30
 * - 5:31 → 5:30
 */
export function roundTimeDown15(date: Date): Date {
    const result = new Date(date)
    const minutes = result.getMinutes()
    const remainder = minutes % 15

    if (remainder !== 0) {
        result.setMinutes(minutes - remainder)
    }

    // Reset seconds and milliseconds to 0
    result.setSeconds(0, 0)
    return result
}

/**
 * Round time to the NEAREST 15-minute interval
 * Used for: Overtime calculations
 * 
 * Examples:
 * - 6:00 → 6:00
 * - 6:07 → 6:00 (0-7 minutes rounds down)
 * - 6:08 → 6:15 (8-14 minutes rounds up)
 * - 6:15 → 6:15
 * - 6:22 → 6:15
 * - 6:23 → 6:30 (23-29 minutes = 8+ past 6:15, rounds to 6:30)
 */
export function roundTimeNearest15(date: Date): Date {
    const result = new Date(date)
    const minutes = result.getMinutes()
    const remainder = minutes % 15

    if (remainder !== 0) {
        if (remainder < 8) {
            // Round down
            result.setMinutes(minutes - remainder)
        } else {
            // Round up
            result.setMinutes(minutes + (15 - remainder))
        }
    }

    // Reset seconds and milliseconds to 0
    result.setSeconds(0, 0)
    return result
}

/**
 * Apply shift-based rounding rules for check-in time
 * 
 * Rules:
 * 1. If checked in before shift start: use shift start time
 * 2. If checked in after shift start: round UP to next 15-min interval
 * 
 * @param checkInTime - Raw check-in timestamp
 * @param shiftStartTime - Shift start time (e.g., "09:00")
 * @param checkInDate - The date of check-in (for constructing shift start timestamp)
 * @returns Rounded check-in time
 */
export function getRoundedCheckIn(
    checkInTime: Date,
    shiftStartTime: string | undefined,
    checkInDate: Date
): Date {
    if (!shiftStartTime) {
        // No shift defined, round up the actual check-in time
        return roundTimeUp15(checkInTime)
    }

    // Parse shift start time in JST context
    const shiftStart = constructJSTDate(checkInDate, shiftStartTime)

    if (checkInTime <= shiftStart) {
        // Early check-in: use shift start time (no credit for early arrival)
        return shiftStart
    } else {
        // Late check-in: round UP to next 15-min interval
        return roundTimeUp15(checkInTime)
    }
}

/**
 * Apply shift-based rounding rules for check-out time
 * 
 * Rules:
 * 1. If checked out before shift end: round DOWN to previous 15-min interval
 * 2. If checked out after shift end: calculate overtime (rounded to 15-min)
 * 
 * @param checkOutTime - Raw check-out timestamp
 * @param shiftEndTime - Shift end time (e.g., "18:00")
 * @param checkOutDate - The date of check-out (for constructing shift end timestamp)
 * @returns Object with rounded check-out time and overtime minutes
 */
export function getRoundedCheckOut(
    checkOutTime: Date,
    shiftEndTime: string | undefined,
    checkOutDate: Date
): { roundedCheckOut: Date; overtimeMinutes: number } {
    if (!shiftEndTime) {
        // No shift defined, just round down the actual check-out time
        return {
            roundedCheckOut: roundTimeDown15(checkOutTime),
            overtimeMinutes: 0
        }
    }

    // Parse shift end time in JST context
    const shiftEnd = constructJSTDate(checkOutDate, shiftEndTime)

    if (checkOutTime <= shiftEnd) {
        // Early or on-time check-out: round DOWN to previous 15-min interval
        return {
            roundedCheckOut: roundTimeDown15(checkOutTime),
            overtimeMinutes: 0
        }
    } else {
        // Late check-out (overtime)
        // Round the checkout time DOWN to nearest 15-min (e.g., 6:35 PM → 6:30 PM)
        const roundedCheckOut = roundTimeDown15(checkOutTime)

        // Calculate overtime from shift end to rounded checkout
        // Example: shift ends 6:00 PM, checkout 6:35 PM → rounds to 6:30 PM
        // Overtime = 6:00 PM to 6:30 PM = 30 minutes
        const overtimeMs = roundedCheckOut.getTime() - shiftEnd.getTime()
        const overtimeMinutes = Math.max(0, Math.floor(overtimeMs / 60000))

        return {
            roundedCheckOut: shiftEnd, // For regular work calc, stop at shift end
            overtimeMinutes: overtimeMinutes
        }
    }
}
