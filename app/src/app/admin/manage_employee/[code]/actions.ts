'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { addStatusPeriod } from '@/actions/status_history'
import { formatLocalDate } from '@/lib/utils'

export async function updateEmployeeDetails(code: string, data: {
    full_name: string
    japanese_name?: string
    category_id: string | null
    registration_date: string
    status: string
    job_type: string
}) {
    const supabase = await createClient()

    // Get current status before update to check for changes
    const { data: currentData, error: fetchError } = await supabase
        .from('people')
        .select('id, status')
        .eq('code', code)
        .single()

    if (fetchError) {
        return { success: false, error: fetchError.message }
    }

    const person = currentData

    // Update the person record
    const { error: updateError } = await supabase
        .from('people')
        .update({
            full_name: data.full_name,
            japanese_name: data.japanese_name,
            category_id: data.category_id,
            registration_date: data.registration_date,
            status: data.status,
            job_type: data.job_type,
            updated_at: new Date().toISOString()
        })
        .eq('code', code)

    if (updateError) {
        return { success: false, error: updateError.message }
    }

    // If status changed, add a history record
    if (person.status !== data.status) {
        const today = formatLocalDate(new Date())

        await addStatusPeriod({
            person_id: person.id,
            status: data.status as 'active' | 'inactive',
            valid_from: today,
            valid_until: null,
            note: 'Changed via profile settings'
        })
    }

    revalidatePath(`/admin/manage_employee/${code}`)
    revalidatePath('/admin/manage_employee')

    return { success: true }
}

export async function updateEmployeeMemo(code: string, memo: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('people')
        .update({
            memo: memo,
            updated_at: new Date().toISOString()
        })
        .eq('code', code)

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath(`/admin/manage_employee/${code}`)

    return { success: true }
}

export interface DailyAttendance {
    date: string
    dayOfWeek: string
    dayNumber: number
    isRestDay: boolean
    isHoliday: boolean
    eventTitle?: string
    checkIn: string | null
    checkOut: string | null
    breakMinutes: number | null
    workMinutes: number | null
    overtimeMinutes: number | null
    paidLeaveMinutes: number | null
    status: string
    notifications: Array<{
        type: 'break_exceeded' | 'missing_checkin' | 'missing_checkout' | 'no_break' | 'edited' | 'late' | 'early_out' | 'business_trip' | 'paid_leave' | 'half_paid_leave' | 'special_leave'
        message: string
    }>
}

export interface MonthlyAttendanceReport {
    year: number
    month: number
    employeeName: string
    dailyRecords: DailyAttendance[]
    summary: {
        totalDays: number
        workingDays: number
        daysAttended: number
        daysAbsent: number
        totalWorkHours: number
        totalOvertimeHours: number
        totalPaidLeaveHours: number
        totalSpecialLeaveDays: number
        averageDailyHours: number
    }
}

export async function getMonthlyAttendanceReport(
    personId: string,
    year: number,
    month: number
): Promise<{ success: boolean; data?: MonthlyAttendanceReport; error?: string }> {
    const supabase = await createClient()

    // Get person details
    const { data: person, error: personError } = await supabase
        .from('people')
        .select('full_name')
        .eq('id', personId)
        .single()

    if (personError || !person) {
        return { success: false, error: 'Person not found' }
    }

    // Calculate date range for the month
    const firstDay = new Date(year, month - 1, 1)
    const lastDay = new Date(year, month, 0)
    const daysInMonth = lastDay.getDate()

    // Fetch attendance records for the month
    const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance_days')
        .select('*')
        .eq('person_id', personId)
        .gte('date', formatLocalDate(firstDay))
        .lte('date', formatLocalDate(lastDay))

    if (attendanceError) {
        return { success: false, error: attendanceError.message }
    }

    // Fetch system events for the month (holidays, rest days, etc.)
    const { data: systemEvents, error: eventsError } = await supabase
        .from('system_events')
        .select('*')
        .gte('event_date', formatLocalDate(firstDay))
        .lte('event_date', formatLocalDate(lastDay))

    const events = eventsError ? [] : (systemEvents || [])

    // Fetch shifts for the month to check for late arrivals
    const { data: shiftsData } = await supabase
        .from('shifts')
        .select('date, start_time, end_time, shift_type')
        .eq('person_id', personId)
        .gte('date', formatLocalDate(firstDay))
        .lte('date', formatLocalDate(lastDay))

    const shifts = shiftsData || []

    // Build daily records
    const dailyRecords: DailyAttendance[] = []
    let totalWorkMinutes = 0
    let totalOvertimeMinutes = 0
    let totalPaidLeaveMinutes = 0
    let specialLeaveDays = 0
    let daysAttended = 0
    let daysAbsent = 0
    let workingDays = 0

    for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, month - 1, day)
        const dateStr = formatLocalDate(currentDate)
        const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'short' })
        const dayNum = currentDate.getDay() // 0 = Sunday, 6 = Saturday

        // Check for system events
        const dayEvents = events.filter(e => e.event_date === dateStr)
        const hasRestDayEvent = dayEvents.some(e => e.event_type === 'rest_day')
        const hasWorkDayEvent = dayEvents.some(e => e.event_type === 'work_day')
        const hasHolidayEvent = dayEvents.some(e => e.event_type === 'holiday' || e.is_holiday)
        const eventTitle = dayEvents.length > 0 ? dayEvents[0].title : undefined

        // Determine if it's a rest day
        const isWeekend = dayNum === 0 || dayNum === 6
        let isRestDay = false
        let isHoliday = false

        if (hasHolidayEvent) {
            isHoliday = true
            isRestDay = true
        } else if (hasRestDayEvent) {
            isRestDay = true
        } else if (hasWorkDayEvent) {
            isRestDay = false
        } else if (isWeekend) {
            isRestDay = true
        }

        // Get attendance record for this day
        const attendance = attendanceData?.find(a => a.date === dateStr)
        const shift = shifts.find(s => s.date === dateStr)

        // Build notifications
        const notifications: Array<{
            type: 'break_exceeded' | 'missing_checkin' | 'missing_checkout' | 'no_break' | 'edited' | 'late' | 'early_out' | 'business_trip' | 'paid_leave' | 'half_paid_leave' | 'special_leave'
            message: string
        }> = []

        // Check for business trip, paid leave, half paid leave, or special leave
        if (shift?.shift_type === 'business_trip') {
            notifications.push({
                type: 'business_trip',
                message: 'Business Trip'
            })
        } else if (shift?.shift_type === 'paid_leave') {
            notifications.push({
                type: 'paid_leave',
                message: 'Paid Leave'
            })
        } else if (shift?.shift_type === 'half_paid_leave') {
            notifications.push({
                type: 'half_paid_leave',
                message: 'Half Paid Leave'
            })
        } else if (shift?.shift_type === 'special_leave') {
            notifications.push({
                type: 'special_leave',
                message: 'Special Leave'
            })
            specialLeaveDays++
        }

        if (attendance) {
            // Helper to get minutes from midnight in JST
            const getMinutesFromMidnightJST = (isoString: string) => {
                const date = new Date(isoString)
                const jstDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }))
                return jstDate.getHours() * 60 + jstDate.getMinutes()
            }

            // Helper to get minutes from midnight from HH:MM string
            const getMinutesFromTimeStr = (timeStr: string) => {
                const [hours, minutes] = timeStr.split(':').map(Number)
                return hours * 60 + minutes
            }

            // Check for late arrival
            if (!isRestDay && shift?.start_time && attendance.check_in_at) {
                const checkInMinutes = getMinutesFromMidnightJST(attendance.check_in_at)
                const shiftStartMinutes = getMinutesFromTimeStr(shift.start_time)
                // Add a small buffer (e.g. 1 minute) if needed, but strictly:
                if (checkInMinutes > shiftStartMinutes) {
                    notifications.push({
                        type: 'late',
                        message: `Late check-in (shift starts at ${shift.start_time})`
                    })
                }
            }

            // Check for early out
            if (!isRestDay && shift?.end_time && attendance.check_out_at) {
                const checkOutMinutes = getMinutesFromMidnightJST(attendance.check_out_at)
                const shiftEndMinutes = getMinutesFromTimeStr(shift.end_time)

                if (checkOutMinutes < shiftEndMinutes) {
                    notifications.push({
                        type: 'early_out',
                        message: `Early out (shift ends at ${shift.end_time})`
                    })
                }
            }

            // Check for break exceeded
            if (attendance.break_exceeded || (attendance.total_break_minutes && attendance.total_break_minutes > 60)) {
                notifications.push({
                    type: 'break_exceeded',
                    message: 'Break time exceeded (>60 min)'
                })
            }

            // Check for missing check-in/out
            if (!isRestDay) {
                if (!attendance.check_in_at) {
                    notifications.push({
                        type: 'missing_checkin',
                        message: 'Missing check-in'
                    })
                } else if (!attendance.check_out_at) {
                    notifications.push({
                        type: 'missing_checkout',
                        message: 'Missing check-out'
                    })
                }

                // Check for no break logged when working > 6 hours
                if (attendance.total_work_minutes && attendance.total_work_minutes > 360) {
                    if (!attendance.break_start_at && !attendance.break_end_at) {
                        notifications.push({
                            type: 'no_break',
                            message: 'No break logged (>6h work)'
                        })
                    }
                }
            }

            // Check if edited
            if (attendance.is_edited) {
                notifications.push({
                    type: 'edited',
                    message: attendance.admin_note || 'Manually edited by admin'
                })
            }

            // Update summary stats
            if (!isRestDay) {
                if (attendance.check_in_at) {
                    daysAttended++
                } else {
                    daysAbsent++
                }
            }

            if (attendance.total_work_minutes) {
                totalWorkMinutes += attendance.total_work_minutes
            }

            if (attendance.overtime_minutes) {
                totalOvertimeMinutes += attendance.overtime_minutes
            }

            if (attendance.paid_leave_minutes) {
                totalPaidLeaveMinutes += attendance.paid_leave_minutes
            }
        } else if (!isRestDay) {
            // No attendance record on a working day
            daysAbsent++
        }

        if (!isRestDay) {
            workingDays++
        }

        dailyRecords.push({
            date: dateStr,
            dayOfWeek,
            dayNumber: day,
            isRestDay,
            isHoliday,
            eventTitle,
            checkIn: attendance?.check_in_at || null,
            checkOut: attendance?.check_out_at || null,
            breakMinutes: attendance?.total_break_minutes || null,
            workMinutes: attendance?.total_work_minutes || null,
            overtimeMinutes: attendance?.overtime_minutes || null,
            paidLeaveMinutes: attendance?.paid_leave_minutes || null,
            status: attendance?.status || '',
            notifications
        })
    }

    const totalWorkHours = parseFloat((totalWorkMinutes / 60).toFixed(2))
    const totalOvertimeHours = parseFloat((totalOvertimeMinutes / 60).toFixed(2))
    const totalPaidLeaveHours = parseFloat((totalPaidLeaveMinutes / 60).toFixed(2))
    const averageDailyHours = daysAttended > 0
        ? parseFloat((totalWorkMinutes / daysAttended / 60).toFixed(2))
        : 0

    return {
        success: true,
        data: {
            year,
            month,
            employeeName: person.full_name,
            dailyRecords,
            summary: {
                totalDays: daysInMonth,
                workingDays,
                daysAttended,
                daysAbsent,
                totalWorkHours,
                totalOvertimeHours,
                totalPaidLeaveHours,
                totalSpecialLeaveDays: specialLeaveDays,
                averageDailyHours
            }
        }
    }
}
