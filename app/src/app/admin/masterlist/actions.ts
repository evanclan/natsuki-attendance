'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { formatLocalDate } from '@/lib/utils'

/**
 * Supabase enforces a server-side max of 1000 rows per request.
 * This helper paginates through all rows using .range() to ensure
 * no data is silently dropped.
 */
async function fetchAllRows(
    supabase: any,
    table: string,
    selectColumns: string,
    dateColumn: string,
    startDateStr: string,
    endDateStr: string,
    pageSize: number = 1000
): Promise<any[]> {
    let allRows: any[] = []
    let from = 0
    let hasMore = true

    while (hasMore) {
        const { data, error } = await supabase
            .from(table)
            .select(selectColumns)
            .gte(dateColumn, startDateStr)
            .lte(dateColumn, endDateStr)
            .order('id')
            .range(from, from + pageSize - 1)

        if (error) throw error
        if (!data || data.length === 0) {
            hasMore = false
        } else {
            allRows = allRows.concat(data)
            if (data.length < pageSize) {
                hasMore = false
            } else {
                from += pageSize
            }
        }
    }
    return allRows
}

export type ShiftType = 'work' | 'rest' | 'absent' | 'paid_leave' | 'half_paid_leave' | 'business_trip' | 'flex' | 'special_leave' | 'preferred_rest' | 'present' | 'sick_absent' | 'planned_absent' | 'family_reason' | 'other_reason' | 'work_no_break' | 'user_note' | 'custom_leave'

export type MasterListShiftData = {
    date: string
    shift_type: ShiftType
    shift_name?: string | null
    start_time?: string | null
    end_time?: string | null
    location?: string | null
    paid_leave_hours?: number | null
    memo?: string | null
    color?: string | null
    force_break?: boolean | null
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
            .select('id, full_name, code, role, job_type, display_order, status, person_categories(categories(name))')
            .order('role', { ascending: true })
            .order('display_order', { ascending: true })
            .order('code', { ascending: true })

        if (peopleError) throw peopleError

        // 2. Fetch shifts for the month (can exceed 1000 rows with many employees)
        const shifts = await fetchAllRows(supabase, 'shifts', '*', 'date', startDateStr, endDateStr)

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

        // 4. Fetch attendance days for the month (can exceed 1000 rows)
        const attendance = await fetchAllRows(supabase, 'attendance_days', 'person_id, date, total_work_minutes, paid_leave_minutes', 'date', startDateStr, endDateStr)

        return {
            success: true,
            data: {
                people: ((people as any[])?.map((p: any) => ({
                    ...p,
                    categories: p.person_categories?.map((pc: any) => pc.categories) || []
                })) as any[])?.sort((a: any, b: any) => {
                    // 1. Sort by Role (Employees first)
                    // Assuming 'employee' role string, or just preserve relative order if they are different groups.
                    // But to be safe, explicit check:
                    const isEmpA = a.role === 'employee' || a.role === 'admin' || a.role === 'manager'; // broadly non-student
                    const isEmpB = b.role === 'employee' || b.role === 'admin' || b.role === 'manager';

                    // Actually, let's just use strict 'student' check.
                    const isStudentA = a.role === 'student';
                    const isStudentB = b.role === 'student';

                    if (!isStudentA && isStudentB) return -1;
                    if (isStudentA && !isStudentB) return 1;

                    // 2. If both are Employees (non-students), sort by display_order
                    if (!isStudentA && !isStudentB) {
                        return (a.display_order ?? 9999) - (b.display_order ?? 9999);
                    }

                    // 3. If both are Students, apply Category Priority
                    const getCategoryRank = (p: any) => {
                        const cats = p.categories || [];
                        // Academy: Rank 0
                        if (cats.some((c: any) => c.name?.toLowerCase().includes('academy'))) return 0;
                        // C-Lab: Rank 1
                        if (cats.some((c: any) => c.name?.toLowerCase().includes('c-lab'))) return 1;
                        // Ex: Rank 2
                        if (cats.some((c: any) => c.name?.toLowerCase() === 'ex')) return 2;
                        // Others: Rank 3
                        return 3;
                    };

                    const rankA = getCategoryRank(a);
                    const rankB = getCategoryRank(b);

                    if (rankA !== rankB) return rankA - rankB;

                    // 4. If same Category Rank, sort Alphabetically by full_name
                    return (a.full_name || '').localeCompare(b.full_name || '');
                }) || [],
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

        // Sync/recalculate attendance record to match the updated shift
        await syncShiftToAttendance(personId, shiftData)

        revalidatePath('/admin/masterlist')
        revalidatePath('/admin/manage_employee')
        return { success: true, data: result.data }
    } catch (error: any) {
        console.error('Error in upsertShift:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Strip away any auto-generated shift notes, preserving custom manual admin notes.
 */
function cleanAdminNote(note: string | null | undefined): string | null {
    if (!note) return null

    const patterns = [
        /Shift changed to [^;]*/gi,
        /Paid Leave \(\d+h\)/gi,
        /Half Paid Leave/gi,
        /Business Trip/gi,
        /Special Leave/gi,
        /Custom Leave \(\d+h\)/gi
    ]

    let cleaned = note
    for (const pattern of patterns) {
        cleaned = cleaned.replace(pattern, '')
    }

    cleaned = cleaned
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .join('; ')

    return cleaned.length > 0 ? cleaned : null
}

/**
 * Sync shift adjustments to attendance records to keep reports correct
 */
async function syncShiftToAttendance(personId: string, shiftData: MasterListShiftData) {
    try {
        const supabase = await createClient()

        // Check if attendance record already exists
        const { data: existingAttendance } = await supabase
            .from('attendance_days')
            .select('id, check_in_at, check_out_at, break_start_at, break_end_at, total_work_minutes, paid_leave_minutes, admin_note, is_edited')
            .eq('person_id', personId)
            .eq('date', shiftData.date)
            .single()

        if (existingAttendance) {
            // Record exists (from kiosk check-in/out or previous edits)

            // 1. If it has check-in and check-out times, recalculate stats using the shared business rules utility
            if (existingAttendance.check_in_at && existingAttendance.check_out_at) {
                // Import helper dynamically to avoid circular deps if any
                const { calculateDailyStats } = await import('@/app/actions/kiosk-utils')

                const shiftForCalc = {
                    shift_type: shiftData.shift_type,
                    start_time: shiftData.start_time || undefined,
                    end_time: shiftData.end_time || undefined,
                    paid_leave_hours: shiftData.paid_leave_hours || undefined,
                    force_break: shiftData.force_break || undefined
                }

                const stats = calculateDailyStats(
                    existingAttendance.check_in_at,
                    existingAttendance.check_out_at,
                    existingAttendance.break_start_at,
                    existingAttendance.break_end_at,
                    shiftForCalc
                )

                // If transitioning to a non-special shift, clean the admin_note!
                const isSpecialShift = [
                    'paid_leave',
                    'half_paid_leave',
                    'custom_leave',
                    'business_trip',
                    'special_leave'
                ].includes(shiftData.shift_type?.toLowerCase() || '')

                let cleanedNote = existingAttendance.admin_note
                let isEdited = existingAttendance.is_edited
                
                if (!isSpecialShift) {
                    cleanedNote = cleanAdminNote(existingAttendance.admin_note)
                    isEdited = cleanedNote !== null
                } else {
                    const shiftTypeLower = shiftData.shift_type?.toLowerCase()
                    let adminNoteAppend = ''
                    if (shiftTypeLower === 'paid_leave') {
                        adminNoteAppend = `Paid Leave (${shiftData.paid_leave_hours ?? 8}h)`
                    } else if (shiftTypeLower === 'half_paid_leave') {
                        adminNoteAppend = 'Half Paid Leave'
                    } else if (shiftTypeLower === 'custom_leave') {
                        adminNoteAppend = `Custom Leave (${shiftData.paid_leave_hours ?? 0}h)`
                    } else if (shiftTypeLower === 'business_trip') {
                        adminNoteAppend = 'Business Trip'
                    } else if (shiftTypeLower === 'special_leave') {
                        adminNoteAppend = 'Special Leave'
                    }

                    if (adminNoteAppend) {
                        const baseNote = cleanAdminNote(existingAttendance.admin_note)
                        cleanedNote = baseNote 
                            ? `${baseNote}; Shift changed to ${adminNoteAppend}`
                            : `Shift changed to ${adminNoteAppend}`
                        isEdited = true
                    }
                }

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
                        admin_note: cleanedNote,
                        is_edited: isEdited,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existingAttendance.id)

                return // Recalculation done
            }

            // 2. If it does NOT have check-in/out times:
            const shiftTypeLower = shiftData.shift_type?.toLowerCase()
            const isSpecialShift = [
                'paid_leave',
                'half_paid_leave',
                'custom_leave',
                'business_trip',
                'special_leave'
            ].includes(shiftTypeLower)

            if (isSpecialShift) {
                let workMinutes = 0
                let paidLeaveMinutes = 0
                let status = 'present'
                let adminNoteAppend = ''

                if (shiftTypeLower === 'paid_leave') {
                    const hours = shiftData.paid_leave_hours ?? 8
                    paidLeaveMinutes = hours * 60
                    status = 'present'
                    adminNoteAppend = `Paid Leave (${hours}h)`
                } else if (shiftTypeLower === 'half_paid_leave') {
                    paidLeaveMinutes = 240
                    status = 'present'
                    adminNoteAppend = 'Half Paid Leave'
                } else if (shiftTypeLower === 'custom_leave') {
                    const customHours = shiftData.paid_leave_hours ?? 0
                    paidLeaveMinutes = customHours * 60
                    status = 'present'
                    adminNoteAppend = `Custom Leave (${customHours}h)`
                } else if (shiftTypeLower === 'business_trip') {
                    workMinutes = 480
                    status = 'present'
                    adminNoteAppend = 'Business Trip'
                } else if (shiftTypeLower === 'special_leave') {
                    status = 'present'
                    adminNoteAppend = 'Special Leave'
                }

                const baseNote = cleanAdminNote(existingAttendance.admin_note)
                const newNote = baseNote 
                    ? `${baseNote}; Shift changed to ${adminNoteAppend}`
                    : `Shift changed to ${adminNoteAppend}`

                await supabase
                    .from('attendance_days')
                    .update({
                        total_work_minutes: workMinutes,
                        total_break_minutes: 0,
                        break_exceeded: false,
                        overtime_minutes: 0,
                        paid_leave_minutes: paidLeaveMinutes,
                        status: status,
                        admin_note: newNote,
                        is_edited: true,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existingAttendance.id)
            } else {
                // If it is NOT a special shift type and has no check-in/out times, we can safely delete it
                // to remove any auto-generated paid leave/business trip records
                await supabase
                    .from('attendance_events')
                    .update({ attendance_day_id: null })
                    .eq('attendance_day_id', existingAttendance.id)

                await supabase
                    .from('attendance_days')
                    .delete()
                    .eq('id', existingAttendance.id)
            }

        } else {
            // No record exists -> Create one if it's a special shift type that implies attendance details
            // Regular work/rest shifts don't create attendance records until check-in
            let workMinutes = 0
            let paidLeaveMinutes = 0
            let adminNote = ''
            let shouldCreate = false

            const shiftTypeLower = shiftData.shift_type?.toLowerCase()

            if (shiftTypeLower === 'paid_leave') {
                const hours = shiftData.paid_leave_hours ?? 8
                paidLeaveMinutes = hours * 60
                adminNote = `Paid Leave (${hours}h)`
                shouldCreate = true
            } else if (shiftTypeLower === 'half_paid_leave') {
                paidLeaveMinutes = 240
                if (shiftData.start_time && shiftData.end_time) {
                    adminNote = 'Half Paid Leave (with work hours)'
                } else {
                    adminNote = 'Half Paid Leave'
                }
                shouldCreate = true
            } else if (shiftTypeLower === 'custom_leave') {
                const cHours = shiftData.paid_leave_hours ?? 0
                paidLeaveMinutes = cHours * 60
                if (shiftData.start_time && shiftData.end_time) {
                    adminNote = `Custom Leave (${cHours}h) + Work`
                } else {
                    adminNote = `Custom Leave (${cHours}h)`
                }
                shouldCreate = true
            } else if (shiftTypeLower === 'business_trip') {
                workMinutes = 480
                adminNote = 'Business Trip'
                shouldCreate = true
            } else if (shiftTypeLower === 'special_leave') {
                adminNote = 'Special Leave'
                shouldCreate = true
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
                        status: 'present',
                        is_edited: true,
                        admin_note: adminNote
                    })
            }
        }
    } catch (error) {
        console.error('Error syncing shift to attendance:', error)
    }
}

export async function deleteShift(personId: string, date: string) {

    try {
        const supabase = await createClient()

        // 1. Delete the shift
        const { error: deleteShiftError } = await supabase
            .from('shifts')
            .delete()
            .eq('person_id', personId)
            .eq('date', date)

        if (deleteShiftError) throw deleteShiftError

        // 2. Handle corresponding attendance record cleanup
        const { data: attendance } = await supabase
            .from('attendance_days')
            .select('id, check_in_at, check_out_at, break_start_at, break_end_at, total_break_minutes, admin_note')
            .eq('person_id', personId)
            .eq('date', date)
            .limit(1)
            .maybeSingle()

        if (attendance) {
            const cleanedNote = cleanAdminNote(attendance.admin_note)
            const isEdited = cleanedNote !== null

            if (attendance.check_in_at || attendance.check_out_at) {
                // If there are check-in/out times, keep the record but recalculate stats without a shift
                const { calculateDailyStats } = await import('@/app/actions/kiosk-utils')
                
                if (attendance.check_in_at && attendance.check_out_at) {
                    const stats = calculateDailyStats(
                        attendance.check_in_at,
                        attendance.check_out_at,
                        attendance.break_start_at,
                        attendance.break_end_at,
                        null // No shift
                    )

                    await supabase
                        .from('attendance_days')
                        .update({
                            total_work_minutes: stats.total_work_minutes,
                            total_break_minutes: stats.total_break_minutes,
                            break_exceeded: stats.break_exceeded,
                            overtime_minutes: stats.overtime_minutes,
                            paid_leave_minutes: 0, // Reset paid leave
                            rounded_check_in_at: stats.rounded_check_in_at,
                            rounded_check_out_at: stats.rounded_check_out_at,
                            status: 'present',
                            admin_note: cleanedNote,
                            is_edited: isEdited,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', attendance.id)
                } else {
                    // Only check-in or only check-out: just clear paid_leave_minutes and set status
                    await supabase
                        .from('attendance_days')
                        .update({
                            paid_leave_minutes: 0,
                            total_work_minutes: 0,
                            status: attendance.check_in_at ? 'present' : 'absent',
                            admin_note: cleanedNote,
                            is_edited: isEdited,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', attendance.id)
                }
            } else {
                // If there are no check-in/out times, we can safely delete the attendance record
                await supabase
                    .from('attendance_events')
                    .update({ attendance_day_id: null })
                    .eq('attendance_day_id', attendance.id)

                await supabase
                    .from('attendance_days')
                    .delete()
                    .eq('id', attendance.id)
            }
        }

        revalidatePath('/admin/masterlist')
        revalidatePath('/admin/manage_employee')
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
