/**
 * Shared utility functions for attendance calculations
 * Used by both kiosk and admin actions to ensure consistent calculations
 */

import { getRoundedCheckIn, getRoundedCheckOut } from '@/lib/time-utils'

/**
 * Calculate work hours and break time according to 15-minute rounding rules:
 * 
 * ROUNDING RULES:
 * 1. Early Check-in (before shift): Count from shift start time (no credit for early arrival)
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
    } | null
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
    const checkIn = new Date(checkInAt)
    const checkOut = new Date(checkOutAt)

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
            if (grossMinutes >= 360) { // 6 hours
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
                overtime_minutes: overtimeMinutes,
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
    const roundedCheckIn = getRoundedCheckIn(
        checkIn,
        shift?.start_time,
        checkIn
    )

    // Apply rounding rules for check-out and calculate overtime
    const { roundedCheckOut, overtimeMinutes } = getRoundedCheckOut(
        checkOut,
        shift?.end_time,
        checkOut
    )

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
    if (grossMinutes >= 360) { // 6 hours
        applicableBreakMinutes = 60
        if (actualBreakMinutes > 60) {
            breakExceeded = true
        }
    } else {
        applicableBreakMinutes = 0
    }

    const totalWorkMinutes = Math.max(0, grossMinutes - applicableBreakMinutes) + overtimeMinutes

    return {
        total_work_minutes: totalWorkMinutes,
        total_break_minutes: applicableBreakMinutes,
        break_exceeded: breakExceeded,
        overtime_minutes: overtimeMinutes,
        paid_leave_minutes: 0, // No paid leave for regular work shifts
        rounded_check_in_at: roundedCheckIn.toISOString(),
        rounded_check_out_at: roundedCheckOut.toISOString()
    }
}
