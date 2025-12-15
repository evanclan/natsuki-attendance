'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export type ShiftType = 'work' | 'rest' | 'absent' | 'paid_leave' | 'half_paid_leave' | 'business_trip' | 'flex' | 'special_leave' | 'preferred_rest'

export type MasterListShiftData = {
    date: string
    shift_type: ShiftType
    shift_name?: string
    start_time?: string
    end_time?: string
    location?: string
    paid_leave_hours?: number
    memo?: string
    color?: string
    force_break?: boolean
}

export async function getMonthlyMasterList(year: number, month: number) {
    try {
        const supabase = await createClient()

        // Calculate the first and last day of the month
        const startDate = new Date(year, month, 1)
        const endDate = new Date(year, month + 1, 0)
        const startDateStr = startDate.toISOString().split('T')[0]
        const endDateStr = endDate.toISOString().split('T')[0]

        // Get all active people
        // 2. Fetch active people via RPC for the month
        const { data: people, error: peopleError } = await supabase
            .rpc('get_active_people_in_range', {
                range_start: startDateStr,
                range_end: endDateStr
            })
            .select('id, full_name, code, role, job_type, categories(name)')
            .order('role', { ascending: true })
            .order('code', { ascending: true })

        if (peopleError) throw peopleError

        // 2. Fetch shifts for the month
        const { data: shifts, error: shiftsError } = await supabase
            .from('shifts')
            .select('*')
            .gte('date', startDateStr)
            .lte('date', endDateStr)

        if (shiftsError) throw shiftsError

        // 3. Fetch system events for the month
        const { data: events, error: eventsError } = await supabase
            .from('system_events')
            .select('*')
            .gte('event_date', startDateStr)
            .lte('event_date', endDateStr)

        if (eventsError) throw eventsError

        // 4. Fetch attendance days for the month
        const { data: attendance, error: attendanceError } = await supabase
            .from('attendance_days')
            .select('person_id, date, total_work_minutes')
            .gte('date', startDateStr)
            .lte('date', endDateStr)

        if (attendanceError) throw attendanceError

        return {
            success: true,
            data: {
                people: people || [],
                shifts: shifts || [],
                events: events || [],
                attendance: attendance || []
            }
        }
    } catch (error: any) {
        console.error('Error in getMonthlyMasterList:', error)
        return { success: false, error: error.message }
    }
}

export async function upsertShift(personId: string, shiftData: MasterListShiftData) {
    try {
        const supabase = await createClient()

        // Check if a shift already exists for this person on this date
        const { data: existingShift } = await supabase
            .from('shifts')
            .select('id')
            .eq('person_id', personId)
            .eq('date', shiftData.date)
            .single()

        const payload = {
            person_id: personId,
            date: shiftData.date,
            shift_type: shiftData.shift_type,
            shift_name: shiftData.shift_name,
            start_time: shiftData.start_time,
            end_time: shiftData.end_time,
            location: shiftData.location,
            paid_leave_hours: shiftData.paid_leave_hours,
            memo: shiftData.memo,
            color: shiftData.color,
            force_break: shiftData.force_break,
            updated_at: new Date().toISOString(),
        }

        let result
        if (existingShift) {
            // Update
            result = await supabase
                .from('shifts')
                .update(payload)
                .eq('id', existingShift.id)
                .select()
                .single()
        } else {
            // Insert
            result = await supabase
                .from('shifts')
                .insert(payload)
                .select()
                .single()
        }

        if (result.error) throw result.error

        // Auto-create attendance records for business trips, paid leave, half paid leave, and special leave
        if (shiftData.shift_type === 'business_trip' || shiftData.shift_type === 'paid_leave' || shiftData.shift_type === 'half_paid_leave' || shiftData.shift_type === 'special_leave') {
            await syncShiftToAttendance(personId, shiftData)
        }

        revalidatePath('/admin/masterlist')
        revalidatePath('/admin/manage_employee')
        return { success: true, data: result.data }
    } catch (error: any) {
        console.error('Error in upsertShift:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Sync special shift types (business trip, paid leave, half paid leave) to attendance records
 */
async function syncShiftToAttendance(personId: string, shiftData: MasterListShiftData) {
    try {
        const supabase = await createClient()

        // Determine work minutes and paid leave minutes based on shift type
        let workMinutes = 0
        let paidLeaveMinutes = 0
        let adminNote = ''

        switch (shiftData.shift_type) {
            case 'business_trip':
                workMinutes = 480 // 8 hours
                paidLeaveMinutes = 0
                adminNote = 'Business Trip'
                break
            case 'paid_leave':
                workMinutes = 0 // Not counted as work hours
                const hours = shiftData.paid_leave_hours || 8
                paidLeaveMinutes = hours * 60
                adminNote = `Paid Leave (${hours}h)`
                break
            case 'half_paid_leave':
                // Always 4h paid leave, but work hours depend on whether shift has times defined
                paidLeaveMinutes = 240 // 4 hours (fixed)

                // If shift has start/end times, allow work hours to be calculated from actual check-in/out
                // Otherwise, no work hours (backward compatible)
                if (shiftData.start_time && shiftData.end_time) {
                    adminNote = 'Half Paid Leave (with work hours)'
                    // Work minutes will be calculated from actual attendance if exists,
                    // or remain 0 if no attendance record yet
                    workMinutes = 0 // Default to 0, actual calculation happens in kiosk check-in/out
                } else {
                    workMinutes = 0
                    adminNote = 'Half Paid Leave'
                }
                break
            case 'special_leave':
                workMinutes = 0 // Not counted as work hours
                paidLeaveMinutes = 0 // Not counted as paid leave
                adminNote = 'Special Leave'
                break
        }

        // Check if attendance record already exists
        const { data: existingAttendance } = await supabase
            .from('attendance_days')
            .select('id, check_in_at, check_out_at, total_work_minutes, paid_leave_minutes, admin_note')
            .eq('person_id', personId)
            .eq('date', shiftData.date)
            .single()

        if (existingAttendance) {
            // Record exists (from kiosk check-in/out or previous edits)
            // For half paid leave: preserve work hours if they exist, but ensure paid leave is set
            const updatePayload: any = {
                admin_note: existingAttendance.admin_note
                    ? `${existingAttendance.admin_note}; ${adminNote}`
                    : adminNote,
                updated_at: new Date().toISOString()
            }

            // For half paid leave with work hours, preserve existing work calculation
            // but ensure paid leave minutes are set
            if (shiftData.shift_type === 'half_paid_leave') {
                updatePayload.paid_leave_minutes = paidLeaveMinutes
                // Keep existing work minutes if they were calculated from check-in/out
            } else {
                // For other shift types, update work minutes if specified
                if (workMinutes > 0 || shiftData.shift_type === 'business_trip') {
                    updatePayload.total_work_minutes = workMinutes
                }
                if (paidLeaveMinutes > 0) {
                    updatePayload.paid_leave_minutes = paidLeaveMinutes
                }
            }

            await supabase
                .from('attendance_days')
                .update(updatePayload)
                .eq('id', existingAttendance.id)
        } else {
            // No record exists, create one with the appropriate minutes
            await supabase
                .from('attendance_days')
                .insert({
                    person_id: personId,
                    date: shiftData.date,
                    check_in_at: null,
                    check_out_at: null,
                    total_work_minutes: workMinutes,
                    total_break_minutes: 0,
                    paid_leave_minutes: paidLeaveMinutes,
                    status: 'present',
                    is_edited: true,
                    admin_note: adminNote
                })
        }
    } catch (error) {
        console.error('Error syncing shift to attendance:', error)
        // Don't throw - we don't want to fail the shift creation if attendance sync fails
    }
}

export async function deleteShift(personId: string, date: string) {

    try {
        const supabase = await createClient()

        // Get the shift first to check type (to remove attendance if needed?)
        // For now, just delete the shift.
        // If we want to be clean, we might want to remove the auto-generated attendance too?
        // But attendance might have manual edits.
        // Let's just delete the shift. The attendance record will remain but won't be linked to a shift type.
        // However, if it was a business trip, the attendance record says "Business Trip".
        // If we delete the shift, the attendance record is still there.
        // Maybe we should clear the attendance record if it was auto-generated?
        // That's complex. Let's stick to deleting the shift row.

        const { error } = await supabase
            .from('shifts')
            .delete()
            .eq('person_id', personId)
            .eq('date', date)

        if (error) throw error

        revalidatePath('/admin/masterlist')
        return { success: true }
    } catch (error: any) {
        console.error('Error in deleteShift:', error)
        return { success: false, error: error.message }
    }
}
