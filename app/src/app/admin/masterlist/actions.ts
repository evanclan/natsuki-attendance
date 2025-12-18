'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { formatLocalDate } from '@/lib/utils'

export type ShiftType = 'work' | 'rest' | 'absent' | 'paid_leave' | 'half_paid_leave' | 'business_trip' | 'flex' | 'special_leave' | 'preferred_rest' | 'present' | 'sick_absent' | 'planned_absent' | 'family_reason' | 'other_reason'

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
        const startDateStr = formatLocalDate(startDate)
        const endDateStr = formatLocalDate(endDate)

        console.log('[getMonthlyMasterList] Date range:', startDateStr, 'to', endDateStr)

        // Get all active people
        // 2. Fetch active people via RPC for the month
        const { data: people, error: peopleError } = await supabase
            .rpc('get_active_people_in_range', {
                range_start: startDateStr,
                range_end: endDateStr
            })
            .select('id, full_name, code, role, job_type, display_order, person_categories(categories(name))')
            .order('role', { ascending: true })
            .order('display_order', { ascending: true })
            .order('code', { ascending: true })

        if (peopleError) throw peopleError

        // 2. Fetch shifts for the month
        const { data: shifts, error: shiftsError } = await supabase
            .from('shifts')
            .select('*')
            .gte('date', startDateStr)
            .lte('date', endDateStr)

        if (shiftsError) throw shiftsError

        // DEBUG: Log shifts for Dec 17 only
        const dec17Shifts = shifts?.filter(s => s.date === '2025-12-17')
        console.log('[getMonthlyMasterList] Total shifts in Dec:', shifts?.length, '| Dec 17 only:', dec17Shifts?.length, dec17Shifts?.map(s => s.person_id))

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
                people: ((people as any[])?.map((p: any) => ({
                    ...p,
                    categories: p.person_categories?.map((pc: any) => pc.categories) || []
                })) as any) || [],
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

export async function updatePeopleOrder(items: { id: string, display_order: number }[]) {
    try {
        const supabase = await createClient()

        console.log('[updatePeopleOrder] Updating order for', items.length, 'people')

        // Update each person's display_order
        // We do this in parallel for speed
        const promises = items.map(item =>
            supabase
                .from('people')
                .update({ display_order: item.display_order })
                .eq('id', item.id)
        )

        await Promise.all(promises)

        revalidatePath('/admin/masterlist')
        return { success: true }
    } catch (error: any) {
        console.error('Error in updatePeopleOrder:', error)
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

        // Auto-create attendance records for special types, OR sync/recalculate for work types
        if (shiftData.shift_type === 'business_trip' ||
            shiftData.shift_type === 'paid_leave' ||
            shiftData.shift_type === 'half_paid_leave' ||
            shiftData.shift_type === 'special_leave' ||
            shiftData.shift_type === 'work' ||
            shiftData.shift_type === 'flex') {
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

        // Check if attendance record already exists
        const { data: existingAttendance } = await supabase
            .from('attendance_days')
            .select('id, check_in_at, check_out_at, break_start_at, break_end_at, total_work_minutes, paid_leave_minutes, admin_note')
            .eq('person_id', personId)
            .eq('date', shiftData.date)
            .single()

        if (existingAttendance) {
            // Record exists (from kiosk check-in/out or previous edits)

            // If it's a regular work shift (or flex), we should recalculate the work stats
            // based on the new shift times and the existing check-in/out
            if (shiftData.shift_type === 'work' || shiftData.shift_type === 'flex' || (shiftData.shift_type === 'half_paid_leave' && shiftData.start_time && shiftData.end_time)) {
                if (existingAttendance.check_in_at && existingAttendance.check_out_at) {
                    // Import helper dynamically to avoid circular deps if any
                    const { calculateDailyStats } = await import('@/app/actions/kiosk-utils')

                    const shiftForCalc = {
                        shift_type: shiftData.shift_type,
                        start_time: shiftData.start_time,
                        end_time: shiftData.end_time
                    }

                    const stats = calculateDailyStats(
                        existingAttendance.check_in_at,
                        existingAttendance.check_out_at,
                        existingAttendance.break_start_at,
                        existingAttendance.break_end_at,
                        shiftForCalc
                    )

                    await supabase
                        .from('attendance_days')
                        .update({
                            total_work_minutes: stats.total_work_minutes,
                            total_break_minutes: stats.total_break_minutes,
                            break_exceeded: stats.break_exceeded,
                            overtime_minutes: stats.overtime_minutes,
                            paid_leave_minutes: stats.paid_leave_minutes,
                            rounded_check_in_at: stats.rounded_check_in_at,
                            rounded_check_out_at: stats.rounded_check_out_at,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', existingAttendance.id)

                    return // Done for work shift
                }
            }

            // Handle special shift types logic (mostly for non-work calculations or overrides)
            let workMinutes = 0
            let paidLeaveMinutes = 0
            let adminNoteAppend = ''

            switch (shiftData.shift_type) {
                case 'business_trip':
                    workMinutes = 480 // 8 hours
                    paidLeaveMinutes = 0
                    adminNoteAppend = 'Business Trip'
                    break
                case 'paid_leave':
                    workMinutes = 0
                    const hours = shiftData.paid_leave_hours || 8
                    paidLeaveMinutes = hours * 60
                    adminNoteAppend = `Paid Leave (${hours}h)`
                    break
                case 'half_paid_leave':
                    // If we are here, it means we didn't match the recalculation block above 
                    // (e.g. no check-in/out yet, or no shift times defined)
                    paidLeaveMinutes = 240 // 4 hours
                    if (!shiftData.start_time || !shiftData.end_time) {
                        workMinutes = 0
                        adminNoteAppend = 'Half Paid Leave'
                    }
                    break
                case 'special_leave':
                    workMinutes = 0
                    paidLeaveMinutes = 0
                    adminNoteAppend = 'Special Leave'
                    break
            }

            // Only update if we have a special note or values to set that aren't dynamic work calculations
            if (adminNoteAppend) {
                const updatePayload: any = {
                    admin_note: existingAttendance.admin_note
                        ? `${existingAttendance.admin_note}; ${adminNoteAppend}`
                        : adminNoteAppend,
                    updated_at: new Date().toISOString()
                }

                if (shiftData.shift_type !== 'half_paid_leave' || (!shiftData.start_time && !shiftData.end_time)) {
                    // For half paid leave with times, we handled work minutes in the first block if attendance exists.
                    // If we are here, we might just be setting the paid leave part if work calc wasn't possible?
                    // Actually simplest is: if we are in this block, we are setting fixed values/notes
                    if (workMinutes > 0 || shiftData.shift_type === 'business_trip') {
                        updatePayload.total_work_minutes = workMinutes
                    }
                    if (paidLeaveMinutes > 0) {
                        updatePayload.paid_leave_minutes = paidLeaveMinutes
                    }
                } else if (shiftData.shift_type === 'half_paid_leave') {
                    // Start/End times exist but maybe no check-in record yet?
                    // Ensure paid leave is set at least
                    updatePayload.paid_leave_minutes = paidLeaveMinutes
                }

                await supabase
                    .from('attendance_days')
                    .update(updatePayload)
                    .eq('id', existingAttendance.id)
            }

        } else {
            // No record exists -> Create one if it's a special shift type that implies attendance
            // (Business trip, paid leave, etc.)
            // Regular work shifts don't create attendance records until check-in

            let workMinutes = 0
            let paidLeaveMinutes = 0
            let adminNote = ''
            let shouldCreate = false

            switch (shiftData.shift_type) {
                case 'business_trip':
                    workMinutes = 480
                    adminNote = 'Business Trip'
                    shouldCreate = true
                    break
                case 'paid_leave':
                    workMinutes = 0
                    const hours = shiftData.paid_leave_hours || 8
                    paidLeaveMinutes = hours * 60
                    adminNote = `Paid Leave (${hours}h)`
                    shouldCreate = true
                    break
                case 'half_paid_leave':
                    paidLeaveMinutes = 240
                    if (shiftData.start_time && shiftData.end_time) {
                        adminNote = 'Half Paid Leave (with work hours)'
                        // Work minutes 0 until check-in
                    } else {
                        adminNote = 'Half Paid Leave'
                    }
                    shouldCreate = true
                    break
                case 'special_leave':
                    adminNote = 'Special Leave'
                    shouldCreate = true
                    break
            }

            if (shouldCreate) {
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
                        status: 'present', // or should this be something else for leave?
                        is_edited: true,
                        admin_note: adminNote
                    })
            }
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

export async function upsertShifts(shifts: { personId: string, data: MasterListShiftData }[]) {
    try {
        const supabase = await createClient()

        console.log('[upsertShifts] Processing', shifts.length, 'shifts')

        // Process in chunks or parallel if too many, but for now map to promises is likely fine for typical batch sizes (20-100)
        // Note: Supabase upsert can take an array, but we have different personIds and dates, so it's a bit complex to construct a single upsert if they are different rows.
        // Actually, 'shifts' table has (person_id, date) uniqueness (likely).
        // If we construct an array of all payload objects, we can do a SINGLE upsert call if the table helps us.
        // However, 'shifts' table PK is usually 'id'. If we don't have IDs, we need to relying on composite key or constraints.
        // Let's assume we might need to do individual upserts or group them.
        // To be safe and reuse logic (like syncShiftToAttendance), let's just iterate server-side.
        // It's still N DB calls, but only 1 HTTP request from client -> server. Much faster network-wise.

        // We can optimize the DB calls later if needed (e.g. by fetching all existing shifts in one query first).

        const results = await Promise.all(shifts.map(s => upsertShift(s.personId, s.data)))

        const failures = results.filter(r => !r.success)
        if (failures.length > 0) {
            console.error('[upsertShifts] Some shifts failed to save:', failures)
            return {
                success: false,
                error: `Failed to save ${failures.length} out of ${shifts.length} shifts.`,
                failures
            }
        }

        revalidatePath('/admin/masterlist')
        return { success: true }
    } catch (error: any) {
        console.error('Error in upsertShifts:', error)
        return { success: false, error: error.message }
    }
}

export async function deleteShifts(shifts: { personId: string, date: string }[]) {
    try {
        const supabase = await createClient()

        console.log('[deleteShifts] Deleting', shifts.length, 'shifts')

        // We can do this in one delete query if we are clever, or just parallel promises.
        // DELETE FROM shifts WHERE (person_id, date) IN ((p1, d1), (p2, d2))...
        // Supabase/PostgREST doesn't support concise localized DELETE for composite keys easily without RPC or complex filters.
        // Parallel server-side calls are fine for reduced latency vs client-side serial.

        const promises = shifts.map(s => deleteShift(s.personId, s.date))
        const results = await Promise.all(promises)

        const failures = results.filter(r => !r.success)
        if (failures.length > 0) {
            return {
                success: false,
                error: `Failed to delete ${failures.length} out of ${shifts.length} shifts.`,
                failures
            }
        }

        revalidatePath('/admin/masterlist')
        return { success: true }
    } catch (error: any) {
        console.error('Error in deleteShifts:', error)
        return { success: false, error: error.message }
    }
}
