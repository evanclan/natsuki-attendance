'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export type Person = {
    id: string
    full_name: string
    japanese_name: string | null
    categories: string[]
    role: 'student' | 'employee'
    code: string
    attendance_today: {
        check_in_at: string | null
        check_out_at: string | null
        break_start_at: string | null
        break_end_at: string | null
        status: string
    } | null
}

export type AttendanceLog = {
    id: number
    person_id: string
    event_type: string
    occurred_at: string
    people: {
        full_name: string
    } | { full_name: string }[] | null
}

// Helper to get today's date in JST (UTC+9)
// This ensures that the "day" aligns with the user's wall clock in Japan
function getTodayJST() {
    const now = new Date()
    // Add 9 hours to get JST time represented as UTC
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
    return jst.toISOString().split('T')[0]
}

export async function getPeople(role: 'student' | 'employee') {
    // Use admin client to bypass RLS on person_categories
    const { createAdminClient } = await import('@/utils/supabase/admin')
    const supabase = createAdminClient()
    const today = getTodayJST()

    // Parallel separate queries to ensure "Left Join" behavior
    // 1. Get all active people for the role
    const peopleQuery = supabase
        .from('people')
        .select(`
            id, 
            full_name, 
            japanese_name,
            person_categories (
                categories (
                    name
                )
            ),
            role, 
            code
        `)
        .eq('role', role)
        .eq('status', 'active')
        .order('full_name')

    // 2. Get attendance records for today (only fetching necessary fields)
    const attendanceQuery = supabase
        .from('attendance_days')
        .select(`
            person_id,
            check_in_at,
            check_out_at,
            break_start_at,
            break_end_at,
            status
        `)
        .eq('date', today)

    // Execute in parallel
    const [peopleRes, attendanceRes] = await Promise.all([peopleQuery, attendanceQuery])

    if (peopleRes.error) {
        console.error('Error fetching people:', peopleRes.error)
        return []
    }

    if (attendanceRes.error) {
        // Log but don't fail everything; just assume no attendance
        console.error('Error fetching attendance:', attendanceRes.error)
    }

    const attendanceMap = new Map()
    if (attendanceRes.data) {
        attendanceRes.data.forEach((record: any) => {
            attendanceMap.set(record.person_id, record)
        })
    }

    // Transform and merge
    const people = peopleRes.data.map((p: any) => {
        let categories: string[] = []
        if (p.person_categories && Array.isArray(p.person_categories)) {
            // Map the nested structure: person_categories -> categories -> name
            // Filter out nulls/undefined if any link is broken
            categories = p.person_categories
                .map((pc: any) => pc.categories?.name)
                .filter((name: any) => typeof name === 'string')
        }

        return {
            ...p,
            categories,
            attendance_today: attendanceMap.get(p.id) || null
        }
    })

    return people as Person[]
}

export async function getRecentLogs(role?: 'student' | 'employee') {
    const supabase = await createClient()

    const today = getTodayJST()

    // Calculate start of today in UTC to filter logs
    // Today JST 00:00 = Yesterday UTC 15:00
    const now = new Date()
    const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000)
    const jstStartOfDay = new Date(jstNow)
    jstStartOfDay.setUTCHours(0, 0, 0, 0)

    // Convert back to UTC for the query
    const utcStart = new Date(jstStartOfDay.getTime() - 9 * 60 * 60 * 1000)

    let query = supabase
        .from('attendance_events')
        .select(`
      id,
      person_id,
      event_type,
      occurred_at,
      people!inner (
        full_name,
        role
      )
    `)
        .gte('occurred_at', utcStart.toISOString())
        .order('occurred_at', { ascending: false })
        .limit(20)

    if (role) {
        query = query.eq('people.role', role)
    }

    const { data, error } = await query

    if (error) {
        console.error('Error fetching logs:', error)
        return []
    }

    return data as AttendanceLog[]
}

// Import shared calculation utility
import { calculateDailyStats } from './kiosk-utils'



export async function logAttendance(personId: string, eventType: string) {
    const supabase = await createClient()
    const today = getTodayJST()

    // 1. Insert event
    const { error: eventError } = await supabase
        .from('attendance_events')
        .insert({
            person_id: personId,
            event_type: eventType,
            source: 'kiosk'
        })

    if (eventError) {
        console.error('Error logging event:', eventError)
        return { success: false, error: eventError.message }
    }

    // 2. Update attendance_days
    // Check if day exists
    const { data: existingDay, error: dayError } = await supabase
        .from('attendance_days')
        .select('*')
        .eq('person_id', personId)
        .eq('date', today)
        .single()

    if (dayError && dayError.code !== 'PGRST116') {
        console.error('Error checking attendance day:', dayError)
    }

    // Fetch assigned shift for today
    const { data: shift } = await supabase
        .from('shifts')
        .select('shift_type, start_time, end_time')
        .eq('person_id', personId)
        .eq('date', today)
        .single()

    const updates: any = {
        updated_at: new Date().toISOString()
    }

    if (eventType === 'check_in') {
        updates.check_in_at = new Date().toISOString()
        updates.status = 'present'
    } else if (eventType === 'check_out') {
        updates.check_out_at = new Date().toISOString()

        // Calculate work hours and break time when checking out
        if (existingDay && existingDay.check_in_at) {
            const calculation = calculateDailyStats(
                existingDay.check_in_at,
                updates.check_out_at,
                existingDay.break_start_at,
                existingDay.break_end_at,
                shift
            )

            updates.total_work_minutes = calculation.total_work_minutes
            updates.total_break_minutes = calculation.total_break_minutes
            updates.break_exceeded = calculation.break_exceeded
            updates.overtime_minutes = calculation.overtime_minutes
            updates.paid_leave_minutes = calculation.paid_leave_minutes
            updates.rounded_check_in_at = calculation.rounded_check_in_at
            updates.rounded_check_out_at = calculation.rounded_check_out_at

            // Add admin note if break exceeded
            if (calculation.break_exceeded) {
                const currentNote = existingDay.admin_note || ''
                const breakNote = 'Exceeded break time (>60 min)'
                updates.admin_note = currentNote
                    ? `${currentNote}; ${breakNote}`
                    : breakNote
            }
        }
    } else if (eventType === 'break_start') {
        updates.break_start_at = new Date().toISOString()
    } else if (eventType === 'break_end') {
        updates.break_end_at = new Date().toISOString()
    } else if (eventType === 'mark_absent') {
        updates.status = 'absent'
    }

    if (existingDay) {
        const { error: updateError } = await supabase
            .from('attendance_days')
            .update(updates)
            .eq('id', existingDay.id)

        if (updateError) {
            console.error('Error updating attendance day:', updateError)
            return { success: false, error: updateError.message }
        }
    } else {
        // Create new day if it doesn't exist
        const { error: insertError } = await supabase
            .from('attendance_days')
            .insert({
                person_id: personId,
                date: today,
                ...updates
            })

        if (insertError) {
            console.error('Error creating attendance day:', insertError)
            return { success: false, error: insertError.message }
        }
    }

    revalidatePath('/kiosk')
    revalidatePath('/kiosk/employee')

    return { success: true, timestamp: Date.now() }
}


export async function clearDailyLogs() {
    // Use admin client to bypass RLS policies
    const { createAdminClient } = await import('@/utils/supabase/admin')
    const supabase = createAdminClient()

    const today = getTodayJST()

    // 1. Delete events for today (JST day)
    // We need to calculate the UTC range for "Today JST"
    // Today JST 00:00 = Yesterday UTC 15:00
    // Today JST 23:59 = Today UTC 14:59

    const now = new Date()
    const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000)
    const jstStartOfDay = new Date(jstNow)
    jstStartOfDay.setUTCHours(0, 0, 0, 0)

    // Convert back to UTC for the query
    const utcStart = new Date(jstStartOfDay.getTime() - 9 * 60 * 60 * 1000)
    const utcEnd = new Date(utcStart.getTime() + 24 * 60 * 60 * 1000)

    const { error: eventsError, count: eventsCount } = await supabase
        .from('attendance_events')
        .delete({ count: 'exact' })
        .gte('occurred_at', utcStart.toISOString())
        .lt('occurred_at', utcEnd.toISOString())

    if (eventsError) {
        console.error('Error clearing events:', eventsError)
        return { success: false, error: 'Failed to clear events: ' + eventsError.message }
    }

    // 2. Delete attendance days for today
    const { error: daysError, count: daysCount } = await supabase
        .from('attendance_days')
        .delete({ count: 'exact' })
        .eq('date', today)

    if (daysError) {
        console.error('Error clearing attendance days:', daysError)
        return { success: false, error: 'Failed to clear daily summary: ' + daysError.message }
    }

    console.log(`Cleared ${daysCount ?? 0} attendance days and ${eventsCount ?? 0} events for ${today}`)

    revalidatePath('/kiosk')
    revalidatePath('/kiosk/employee')

    if ((daysCount === 0 || daysCount === null) && (eventsCount === 0 || eventsCount === null)) {
        return { success: true, message: `No logs found for today (${today})` }
    }

    return { success: true, message: `Cleared ${daysCount ?? 0} attendance records and ${eventsCount ?? 0} events` }
}

export async function clearAllRecentData() {
    // Use admin client to bypass RLS policies
    const { createAdminClient } = await import('@/utils/supabase/admin')
    const supabase = createAdminClient()

    const todayStr = getTodayJST()

    const now = new Date()
    const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000)
    const jstYesterday = new Date(jstNow)
    jstYesterday.setDate(jstYesterday.getDate() - 1)
    const yesterdayStr = jstYesterday.toISOString().split('T')[0]

    console.log(`Clearing data for ${yesterdayStr} and ${todayStr}`)

    // Delete attendance days for yesterday and today
    const { error: daysError, count: daysCount } = await supabase
        .from('attendance_days')
        .delete({ count: 'exact' })
        .in('date', [yesterdayStr, todayStr])

    if (daysError) {
        console.error('Error clearing attendance days:', daysError)
        return { success: false, error: daysError.message }
    }

    // Delete events for yesterday and today
    // Yesterday JST 00:00 = DayBeforeYesterday UTC 15:00

    const jstYesterdayStart = new Date(jstYesterday)
    jstYesterdayStart.setUTCHours(0, 0, 0, 0)

    const utcStart = new Date(jstYesterdayStart.getTime() - 9 * 60 * 60 * 1000)

    const { error: eventsError, count: eventsCount } = await supabase
        .from('attendance_events')
        .delete({ count: 'exact' })
        .gte('occurred_at', utcStart.toISOString())

    if (eventsError) {
        console.error('Error clearing events:', eventsError)
        return { success: false, error: eventsError.message }
    }

    console.log(`Cleared ${daysCount ?? 0} attendance days and ${eventsCount ?? 0} events for ${yesterdayStr} and ${todayStr}`)

    revalidatePath('/kiosk')
    revalidatePath('/kiosk/employee')
    return { success: true, message: `Cleared all recent data: ${daysCount ?? 0} attendance records and ${eventsCount ?? 0} events from yesterday and today` }
}

export async function undoAbsent(personId: string) {
    const supabase = await createClient()
    const today = getTodayJST()

    // 1. Log the undo event for audit trail
    const { error: eventError } = await supabase
        .from('attendance_events')
        .insert({
            person_id: personId,
            event_type: 'undo_absent',
            source: 'kiosk'
        })

    if (eventError) {
        console.error('Error logging undo event:', eventError)
        return { success: false, error: eventError.message }
    }

    // 2. Delete or reset the attendance_days record for today
    const { error: deleteError } = await supabase
        .from('attendance_days')
        .delete()
        .eq('person_id', personId)
        .eq('date', today)
        .eq('status', 'absent')

    if (deleteError) {
        console.error('Error undoing absent:', deleteError)
        return { success: false, error: deleteError.message }
    }

    revalidatePath('/kiosk')
    revalidatePath('/kiosk/employee')
    return { success: true }
}

export async function undoCheckIn(personId: string) {
    const supabase = await createClient()
    const today = getTodayJST()

    // 1. Log the undo event for audit trail
    const { error: eventError } = await supabase
        .from('attendance_events')
        .insert({
            person_id: personId,
            event_type: 'undo_check_in',
            source: 'kiosk'
        })

    if (eventError) {
        console.error('Error logging undo event:', eventError)
        return { success: false, error: eventError.message }
    }

    // 2. Delete the attendance_days record for today
    // ONLY if it looks like a fresh check-in (no check-out, no break)
    // We use delete() with match criteria
    const { error: deleteError } = await supabase
        .from('attendance_days')
        .delete()
        .eq('person_id', personId)
        .eq('date', today)
        .is('check_out_at', null)
        .is('break_start_at', null)
        .is('break_end_at', null)

    if (deleteError) {
        console.error('Error undoing check-in:', deleteError)
        return { success: false, error: deleteError.message }
    }

    revalidatePath('/kiosk')
    revalidatePath('/kiosk/employee')
    return { success: true }
}

export async function undoCheckOut(personId: string) {
    const supabase = await createClient()
    const today = getTodayJST()

    // 1. Log the undo event for audit trail
    const { error: eventError } = await supabase
        .from('attendance_events')
        .insert({
            person_id: personId,
            event_type: 'undo_check_out',
            source: 'kiosk'
        })

    if (eventError) {
        console.error('Error logging undo event:', eventError)
        return { success: false, error: eventError.message }
    }

    // 2. Update the attendance_days record for today
    // Reset check_out_at and calculated stats to null, set status back to 'present'
    const { error: updateError } = await supabase
        .from('attendance_days')
        .update({
            check_out_at: null,
            total_work_minutes: null,
            total_break_minutes: null,
            break_exceeded: null,
            overtime_minutes: null,
            paid_leave_minutes: null,
            rounded_check_in_at: null,
            rounded_check_out_at: null,
            status: 'present',
            updated_at: new Date().toISOString()
        })
        .eq('person_id', personId)
        .eq('date', today)

    if (updateError) {
        console.error('Error undoing check-out:', updateError)
        return { success: false, error: updateError.message }
    }

    revalidatePath('/kiosk')
    revalidatePath('/kiosk/employee')
    return { success: true }
}

export async function getAllEmployees() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('people')
        .select('id, full_name, code')
        .eq('role', 'employee')
        .eq('status', 'active')
        .order('full_name')

    if (error) {
        console.error('Error fetching employees:', error)
        return []
    }

    return data as { id: string; full_name: string; code: string }[]
}

export async function setPreferredRest(personId: string, date: string, memo?: string) {
    const { upsertShift } = await import('@/app/admin/masterlist/actions')

    // Check if there's already a shift on this day
    // The requirement says "click a day... hit save... name written on that day"
    // And "saved as a status 'Preferred Rest' on the master shift"

    // We'll use upsertShift to set the status.
    // Note: This overrides any existing shift.
    // Since this is for "next month" usually, it's likely empty.

    // However, if the user clicks again, maybe they want to unset it?
    // The requirement doesn't explicitly say "toggle", but "user pick their name... click a day... hit save".
    // Let's implement "set to Preferred Rest".

    const result = await upsertShift(personId, {
        date,
        shift_type: 'preferred_rest',
        memo: memo || '',
        // No times for preferred rest
    })

    if (result.success) {
        revalidatePath('/kiosk/employee/setdayoff')
        return { success: true }
    } else {
        return { success: false, error: result.error }
    }
}

export async function deletePreferredRest(personId: string, date: string) {
    const { deleteShift } = await import('@/app/admin/masterlist/actions')

    const result = await deleteShift(personId, date)

    if (result.success) {
        revalidatePath('/kiosk/employee/setdayoff')
        return { success: true }
    } else {
        return { success: false, error: result.error }
    }
}

export async function bulkCheckIn(personIds: string[]) {
    const supabase = await createClient()
    const today = getTodayJST()

    // We'll iterate and log attendance for each person.
    // Ideally, we could do a bulk insert, but logAttendance handles complex logic
    // (creating attendance_days if needed, updating status, etc.)
    // For a kiosk with < 50 people, sequential calls are acceptable for MVP.
    // We can optimize later if needed.

    const results = await Promise.all(
        personIds.map(async (id) => {
            return await logAttendance(id, 'check_in')
        })
    )

    const failures = results.filter((r) => !r.success)

    if (failures.length > 0) {
        console.error('Some bulk check-ins failed', failures)
        return { success: false, error: 'Some check-ins failed', details: failures }
    }

    revalidatePath('/kiosk')
    revalidatePath('/kiosk/employee')
    return { success: true }
}
