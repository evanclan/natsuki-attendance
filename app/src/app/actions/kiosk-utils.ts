/**
 * Shared utility functions for attendance calculations
 * Used by both kiosk and admin actions to ensure consistent calculations
 */

import { getRoundedCheckIn, getRoundedCheckOut, constructJSTDate } from '@/lib/time-utils'

/**
 * Calculate work hours and break time according to 15-minute rounding rules:
 * 
 * ROUNDING RULES:
 * 1. Early Check-in (before shift): Round UP to next 15-min interval (credit for early arrival)
 * 2. Late Check-in (after shift): Round UP to next 15-min interval (9:01→9:15, 9:16→9:30)
 * 3. Early Check-out (before shift end): Round DOWN to previous 15-min (5:50→5:45, 5:44→5:30)
 * 4. Late Check-out (overtime): Calculate overtime rounded to nearest 15-min
 * 
 * BREAK RULES:
 * - Work >= 6 hours: Deduct 1 hour break (default)
 * - Work < 6 hours: No break deduction
 * - Break > 60 minutes: Flag as exceeded
 * 
 * PAID LEAVE TYPES:
 * - Paid Leave: 0h work hours, customizable paid leave hours (default 8h)
 * - Half Paid Leave: Calculated work hours (if shift times defined) + 4h (240 min) paid leave
 * - Business Trip: 8h (480 min) work hours, 0h paid leave
 * - Rest / Absent: 0h
 * 
 * Returns: {
 *   total_work_minutes,
 *   total_break_minutes,
 *   break_exceeded,
 *   overtime_minutes,
 *   paid_leave_minutes,
 *   rounded_check_in_at,
 *   rounded_check_out_at
 * }
 */
export function calculateDailyStats(
    checkInAt: string,
    checkOutAt: string,
    breakStartAt: string | null,
    breakEndAt: string | null,
    shift: {
        shift_type: string
        start_time?: string
        end_time?: string
        paid_leave_hours?: number
    } | null,
    overrideBreakMinutes?: number | null
): {
    total_work_minutes: number
    total_break_minutes: number
    break_exceeded: boolean
    overtime_minutes: number
    paid_leave_minutes: number
    rounded_check_in_at: string
    rounded_check_out_at: string
} {
    const shiftType = shift?.shift_type || 'work'
    const isNoBreak = shiftType === 'work_no_break'
    const isFlex = shiftType.toLowerCase() === 'flex'

    const checkIn = new Date(checkInAt)
    const checkOut = new Date(checkOutAt)

    if (isNaN(checkIn.getTime())) {
        throw new Error(`Invalid check-in time: ${checkInAt}`)
    }
    if (isNaN(checkOut.getTime())) {
        throw new Error(`Invalid check-out time: ${checkOutAt}`)
    }

    // Paid Leave: 0 work hours, 8h paid leave
    if (shiftType === 'paid_leave') {
        return {
            total_work_minutes: 0,
            total_break_minutes: 0,
            break_exceeded: false,
            overtime_minutes: 0,
            paid_leave_minutes: 480, // 8 hours
            rounded_check_in_at: checkInAt,
            rounded_check_out_at: checkOutAt
        }
    }

    // Business Trip: 8h work hours, 0 paid leave
    if (shiftType === 'business_trip') {
        return {
            total_work_minutes: 480,
            total_break_minutes: 60,
            break_exceeded: false,
            overtime_minutes: 0,
            paid_leave_minutes: 0,
            rounded_check_in_at: checkInAt,
            rounded_check_out_at: checkOutAt
        }
    }

    // Half Paid Leave: Calculate work hours from check-in/out, PLUS 4h paid leave
    if (shiftType === 'half_paid_leave') {
        // Check if we have valid shift times to calculate working hours
        if (shift?.start_time && shift?.end_time) {
            // Apply rounding rules for check-in
            const roundedCheckIn = getRoundedCheckIn(
                checkIn,
                shift.start_time,
                checkIn
            )

            // Apply rounding rules for check-out and calculate overtime
            const { roundedCheckOut, overtimeMinutes } = getRoundedCheckOut(
                checkOut,
                shift.end_time,
                checkOut
            )

            // Explicitly calculate Early Overtime
            let earlyOvertimeMinutes = 0
            if (shift.start_time) {
                const shiftStart = constructJSTDate(checkIn, shift.start_time)
                if (roundedCheckIn.getTime() < shiftStart.getTime()) {
                    earlyOvertimeMinutes = Math.floor((shiftStart.getTime() - roundedCheckIn.getTime()) / 60000)
                }
            }

            // Calculate gross work duration using rounded times
            let grossMinutes = Math.floor((roundedCheckOut.getTime() - roundedCheckIn.getTime()) / 60000)
            if (grossMinutes < 0) grossMinutes = 0

            // Break Logic
            let actualBreakMinutes = 0
            if (breakStartAt && breakEndAt) {
                const breakStart = new Date(breakStartAt)
                const breakEnd = new Date(breakEndAt)
                actualBreakMinutes = Math.floor((breakEnd.getTime() - breakStart.getTime()) / 60000)
            }

            let applicableBreakMinutes = 0
            let breakExceeded = false

            // Rule: If work >= 6 hours, deduct 1 hour break
            // If override is provided, use it directly (skip auto-calc logic)
            if (typeof overrideBreakMinutes === 'number') {
                applicableBreakMinutes = overrideBreakMinutes
                if (actualBreakMinutes > 60 && overrideBreakMinutes < actualBreakMinutes) {
                    // This logic is tricky with overrides. 
                    // If manually set to 60, but scanned break was 70, is it exceeded?
                    // Let's assume manual edit resolves the "exceeded" status conceptually, or we keep it.
                    // For now, let's keep strict check against actual scanned break if available.
                    breakExceeded = actualBreakMinutes > 60
                }
            } else if (grossMinutes >= 360) { // 6 hours
                applicableBreakMinutes = 60
                if (actualBreakMinutes > 60) {
                    breakExceeded = true
                }
            }

            const totalWorkMinutes = Math.max(0, grossMinutes - applicableBreakMinutes) + overtimeMinutes

            return {
                total_work_minutes: totalWorkMinutes,
                total_break_minutes: applicableBreakMinutes,
                break_exceeded: breakExceeded,
                overtime_minutes: overtimeMinutes + earlyOvertimeMinutes,
                paid_leave_minutes: 240, // Always 4 hours for half paid leave
                rounded_check_in_at: roundedCheckIn.toISOString(),
                rounded_check_out_at: roundedCheckOut.toISOString()
            }
        } else {
            // No shift times defined - just 4h paid leave with no work hours
            return {
                total_work_minutes: 0,
                total_break_minutes: 0,
                break_exceeded: false,
                overtime_minutes: 0,
                paid_leave_minutes: 240, // 4 hours
                rounded_check_in_at: checkInAt,
                rounded_check_out_at: checkOutAt
            }
        }
    }

    // Custom Leave: Calculate work hours from check-in/out, PLUS custom paid leave
    if (shiftType === 'custom_leave') {
        const customLeaveMinutes = Math.round((shift?.paid_leave_hours ?? 0) * 60)

        // Check if we have valid shift times to calculate working hours
        if (shift?.start_time && shift?.end_time) {
            // Apply rounding rules for check-in
            const roundedCheckIn = getRoundedCheckIn(
                checkIn,
                shift.start_time,
                checkIn
            )

            // Apply rounding rules for check-out and calculate overtime
            const { roundedCheckOut, overtimeMinutes } = getRoundedCheckOut(
                checkOut,
                shift.end_time,
                checkOut
            )

            // Explicitly calculate Early Overtime
            let earlyOvertimeMinutes = 0
            if (shift.start_time) {
                const shiftStart = constructJSTDate(checkIn, shift.start_time)
                if (roundedCheckIn.getTime() < shiftStart.getTime()) {
                    earlyOvertimeMinutes = Math.floor((shiftStart.getTime() - roundedCheckIn.getTime()) / 60000)
                }
            }

            // Calculate gross work duration using rounded times
            let grossMinutes = Math.floor((roundedCheckOut.getTime() - roundedCheckIn.getTime()) / 60000)
            if (grossMinutes < 0) grossMinutes = 0

            // Break Logic
            let actualBreakMinutes = 0
            if (breakStartAt && breakEndAt) {
                const breakStart = new Date(breakStartAt)
                const breakEnd = new Date(breakEndAt)
                actualBreakMinutes = Math.floor((breakEnd.getTime() - breakStart.getTime()) / 60000)
            }

            let applicableBreakMinutes = 0
            let breakExceeded = false

            // Rule: If work >= 6 hours, deduct 1 hour break
            if (typeof overrideBreakMinutes === 'number') {
                applicableBreakMinutes = overrideBreakMinutes
                if (actualBreakMinutes > 60 && overrideBreakMinutes < actualBreakMinutes) {
                    breakExceeded = actualBreakMinutes > 60
                }
            } else if (grossMinutes >= 360) { // 6 hours
                applicableBreakMinutes = 60
                if (actualBreakMinutes > 60) {
                    breakExceeded = true
                }
            }

            const totalWorkMinutes = Math.max(0, grossMinutes - applicableBreakMinutes) + overtimeMinutes

            return {
                total_work_minutes: totalWorkMinutes,
                total_break_minutes: applicableBreakMinutes,
                break_exceeded: breakExceeded,
                overtime_minutes: overtimeMinutes + earlyOvertimeMinutes,
                paid_leave_minutes: customLeaveMinutes,
                rounded_check_in_at: roundedCheckIn.toISOString(),
                rounded_check_out_at: roundedCheckOut.toISOString()
            }
        } else {
            // No shift times defined - just custom paid leave with no work hours
            return {
                total_work_minutes: 0,
                total_break_minutes: 0,
                break_exceeded: false,
                overtime_minutes: 0,
                paid_leave_minutes: customLeaveMinutes,
                rounded_check_in_at: checkInAt,
                rounded_check_out_at: checkOutAt
            }
        }
    }

    if (shiftType === 'rest' || shiftType === 'absent') {
        return {
            total_work_minutes: 0,
            total_break_minutes: 0,
            break_exceeded: false,
            overtime_minutes: 0,
            paid_leave_minutes: 0,
            rounded_check_in_at: checkInAt,
            rounded_check_out_at: checkOutAt
        }
    }

    // Apply rounding rules for check-in
    // If Flex, we intentionally ignore the scheduled start time to force simple 15m rounding
    const roundedCheckIn = getRoundedCheckIn(
        checkIn,
        isFlex ? undefined : shift?.start_time,
        checkIn
    )

    // Apply rounding rules for check-out and calculate raw overtime (clock-based)
    // If Flex, we intentionally ignore the scheduled end time to force simple 15m rounding
    const { roundedCheckOut, overtimeMinutes: clockOvertime } = getRoundedCheckOut(
        checkOut,
        isFlex ? undefined : shift?.end_time,
        checkOut
    )

    // Calculate gross duration using the CAPPED roundedCheckOut + mismatch overtime
    // Effectively reconstructing the "Actual Rounded End Time"
    // roundedCheckOut is capped at shift end. clockOvertime is the excess.
    // So (roundedCheckOut + clockOvertime) is the effective end time.
    const effectiveEndTimeMs = roundedCheckOut.getTime() + (clockOvertime * 60000)

    let grossMinutes = Math.floor((effectiveEndTimeMs - roundedCheckIn.getTime()) / 60000)
    if (grossMinutes < 0) grossMinutes = 0

    // Break Logic
    let actualBreakMinutes = 0
    if (breakStartAt && breakEndAt) {
        const breakStart = new Date(breakStartAt)
        const breakEnd = new Date(breakEndAt)
        actualBreakMinutes = Math.floor((breakEnd.getTime() - breakStart.getTime()) / 60000)
    }

    let applicableBreakMinutes = 0
    let breakExceeded = false

    // Rule: If work >= 6 hours, deduct 1 hour break
    // BUT if it's 'work_no_break', we do NOT deduct break
    // If override is provided, use it directly
    if (typeof overrideBreakMinutes === 'number') {
        applicableBreakMinutes = overrideBreakMinutes
        if (actualBreakMinutes > 60) { // Keep warning if physically took long break? Or ignore?
            breakExceeded = actualBreakMinutes > 60
        }
    } else if (!isNoBreak && grossMinutes >= 360) { // 6 hours
        applicableBreakMinutes = 60
        if (actualBreakMinutes > 60) {
            breakExceeded = true
        }
    } else {
        // work_no_break or < 6 hours
        applicableBreakMinutes = 0
    }

    const totalWorkMinutes = Math.max(0, grossMinutes - applicableBreakMinutes)


    // Explicitly add Early Overtime (time clocked before scheduled start) and Late Overtime (clockOvertime)
    let earlyOvertimeMinutes = 0
    if (shift?.start_time) {
        // We ensure shiftStart is on the JST checkIn day conceptually to match roundedCheckIn
        const shiftStart = constructJSTDate(checkIn, shift.start_time)
        if (roundedCheckIn.getTime() < shiftStart.getTime()) {
            earlyOvertimeMinutes = Math.floor((shiftStart.getTime() - roundedCheckIn.getTime()) / 60000)
        }
    }

    let finalOvertimeMinutes = clockOvertime + earlyOvertimeMinutes

    // [FLEX SHIFT FIX]: If it's a Flex shift, overtime is ONLY calculated as: Total Work - Scheduled Work
    // We ignore the actual clock overtime and early overtime since Flex shifts are flexible.
    if (isFlex && shift?.start_time && shift?.end_time) {
        // Calculate nominal scheduled work for the flex shift
        const shiftStart = constructJSTDate(checkIn, shift.start_time)
        const shiftEnd = constructJSTDate(checkOut, shift.end_time) // Typically same day

        // Calculate scheduled duration
        let scheduledGrossMinutes = Math.floor((shiftEnd.getTime() - shiftStart.getTime()) / 60000)
        if (scheduledGrossMinutes < 0) scheduledGrossMinutes = 0

        // Subtract standard 60 min break if scheduled work is >= 6 hours
        // Note: For 'work_no_break' flex shifts (if they exist), we wouldn't deduct.
        let scheduledBreakMinutes = 0
        if (!isNoBreak && scheduledGrossMinutes >= 360) {
            scheduledBreakMinutes = 60
        }

        const scheduledWorkMinutes = Math.max(0, scheduledGrossMinutes - scheduledBreakMinutes)

        // Overtime is only the remainder above scheduled work
        finalOvertimeMinutes = Math.max(0, totalWorkMinutes - scheduledWorkMinutes)
    }

    return {
        total_work_minutes: totalWorkMinutes,
        total_break_minutes: applicableBreakMinutes,
        break_exceeded: breakExceeded,
        overtime_minutes: finalOvertimeMinutes,
        paid_leave_minutes: 0, // No paid leave for regular work shifts
        rounded_check_in_at: roundedCheckIn.toISOString(),
        rounded_check_out_at: roundedCheckOut.toISOString()
    }
}
