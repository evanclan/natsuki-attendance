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
 * - Work > 6 hours: Deduct 1 hour break (default)
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

            // Calculate gross work duration using rounded times
            // Reconstruct effective end time from capped roundedCheckOut + clockOvertime
            const hplEffectiveEndTimeMs = roundedCheckOut.getTime() + (overtimeMinutes * 60000)
            let grossMinutes = Math.floor((hplEffectiveEndTimeMs - roundedCheckIn.getTime()) / 60000)
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

            // Rule: If work > 6 hours, deduct 1 hour break
            // If override is provided, use it directly (skip auto-calc logic)
            if (typeof overrideBreakMinutes === 'number') {
                applicableBreakMinutes = overrideBreakMinutes
                if (actualBreakMinutes > 60 && overrideBreakMinutes < actualBreakMinutes) {
                    breakExceeded = actualBreakMinutes > 60
                }
            } else if (grossMinutes > 360) { // more than 6 hours
                applicableBreakMinutes = 60
                if (actualBreakMinutes > 60) {
                    breakExceeded = true
                }
            }

            const totalWorkMinutes = Math.max(0, grossMinutes - applicableBreakMinutes)

            // Overtime = max(0, Total Work - Scheduled Work)
            const shiftStart = constructJSTDate(checkIn, shift.start_time)
            const shiftEnd = constructJSTDate(checkOut, shift.end_time)
            let scheduledGrossMinutes = Math.floor((shiftEnd.getTime() - shiftStart.getTime()) / 60000)
            if (scheduledGrossMinutes < 0) scheduledGrossMinutes = 0
            let scheduledBreakMinutes = scheduledGrossMinutes > 360 ? 60 : 0
            const scheduledWorkMinutes = Math.max(0, scheduledGrossMinutes - scheduledBreakMinutes)
            const finalOvertimeMinutes = Math.max(0, totalWorkMinutes - scheduledWorkMinutes)

            return {
                total_work_minutes: totalWorkMinutes,
                total_break_minutes: applicableBreakMinutes,
                break_exceeded: breakExceeded,
                overtime_minutes: finalOvertimeMinutes,
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

            // Calculate gross work duration using rounded times
            // Reconstruct effective end time from capped roundedCheckOut + clockOvertime
            const clEffectiveEndTimeMs = roundedCheckOut.getTime() + (overtimeMinutes * 60000)
            let grossMinutes = Math.floor((clEffectiveEndTimeMs - roundedCheckIn.getTime()) / 60000)
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

            // Rule: If work > 6 hours, deduct 1 hour break
            if (typeof overrideBreakMinutes === 'number') {
                applicableBreakMinutes = overrideBreakMinutes
                if (actualBreakMinutes > 60 && overrideBreakMinutes < actualBreakMinutes) {
                    breakExceeded = actualBreakMinutes > 60
                }
            } else if (grossMinutes > 360) { // more than 6 hours
                applicableBreakMinutes = 60
                if (actualBreakMinutes > 60) {
                    breakExceeded = true
                }
            }

            const totalWorkMinutes = Math.max(0, grossMinutes - applicableBreakMinutes)

            // Overtime = max(0, Total Work - Scheduled Work)
            const clShiftStart = constructJSTDate(checkIn, shift.start_time)
            const clShiftEnd = constructJSTDate(checkOut, shift.end_time)
            let clScheduledGrossMinutes = Math.floor((clShiftEnd.getTime() - clShiftStart.getTime()) / 60000)
            if (clScheduledGrossMinutes < 0) clScheduledGrossMinutes = 0
            let clScheduledBreakMinutes = clScheduledGrossMinutes > 360 ? 60 : 0
            const clScheduledWorkMinutes = Math.max(0, clScheduledGrossMinutes - clScheduledBreakMinutes)
            const clFinalOvertimeMinutes = Math.max(0, totalWorkMinutes - clScheduledWorkMinutes)

            return {
                total_work_minutes: totalWorkMinutes,
                total_break_minutes: applicableBreakMinutes,
                break_exceeded: breakExceeded,
                overtime_minutes: clFinalOvertimeMinutes,
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

    // Rule: If work > 6 hours, deduct 1 hour break
    // BUT if it's 'work_no_break', we do NOT deduct break
    // If override is provided, use it directly
    if (typeof overrideBreakMinutes === 'number') {
        applicableBreakMinutes = overrideBreakMinutes
        if (actualBreakMinutes > 60) { // Keep warning if physically took long break? Or ignore?
            breakExceeded = actualBreakMinutes > 60
        }
    } else if (!isNoBreak && grossMinutes > 360) { // more than 6 hours
        applicableBreakMinutes = 60
        if (actualBreakMinutes > 60) {
            breakExceeded = true
        }
    } else {
        // work_no_break or < 6 hours
        applicableBreakMinutes = 0
    }

    const totalWorkMinutes = Math.max(0, grossMinutes - applicableBreakMinutes)

    // Overtime = max(0, Total Work - Scheduled Work)
    // This applies to ALL shift types (work, work_no_break, flex) uniformly.
    let finalOvertimeMinutes = 0
    if (shift?.start_time && shift?.end_time) {
        const shiftStart = constructJSTDate(checkIn, shift.start_time)
        const shiftEnd = constructJSTDate(checkOut, shift.end_time)

        let scheduledGrossMinutes = Math.floor((shiftEnd.getTime() - shiftStart.getTime()) / 60000)
        if (scheduledGrossMinutes < 0) scheduledGrossMinutes = 0

        // Subtract standard 60 min break if scheduled work is > 6 hours
        // For 'work_no_break', we do NOT deduct scheduled break
        let scheduledBreakMinutes = 0
        if (!isNoBreak && scheduledGrossMinutes > 360) {
            scheduledBreakMinutes = 60
        }

        const scheduledWorkMinutes = Math.max(0, scheduledGrossMinutes - scheduledBreakMinutes)

        // Overtime is only the remainder above scheduled work
        finalOvertimeMinutes = Math.max(0, totalWorkMinutes - scheduledWorkMinutes)
    } else {
        // No scheduled shift times: fall back to clock-based overtime only
        finalOvertimeMinutes = clockOvertime
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
