'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export type Person = {
    id: string
    full_name: string
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
    const supabase = await createClient()
    const today = getTodayJST()

    const { data, error } = await supabase
        .from('people')
        .select(`
      id, 
      full_name, 
      role, 
      code,
      attendance_today:attendance_days(
        check_in_at,
        check_out_at,
        break_start_at,
        break_end_at,
        status
      )
    `)
        .eq('role', role)
        .eq('status', 'active')
        .eq('attendance_days.date', today)
        .order('full_name')

    if (error) {
        console.error('Error fetching people:', error)
        return []
    }

    // Transform data to handle array return from join (even though it's 1:1 per day)
    const people = data.map((p: any) => ({
        ...p,
        attendance_today: p.attendance_today?.[0] || null
    }))

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

    // Delete attendance days for today first (to avoid foreign key constraints)
    const { error: daysError, count: daysCount } = await supabase
        .from('attendance_days')
        .delete({ count: 'exact' })
        .eq('date', today)

    if (daysError) {
        console.error('Error clearing attendance days:', daysError)
        return { success: false, error: daysError.message }
    }

    // Delete events for today (JST day)
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
        return { success: false, error: eventsError.message }
    }

    console.log(`Cleared ${daysCount ?? 0} attendance days and ${eventsCount ?? 0} events for ${today}`)

    revalidatePath('/kiosk')
    revalidatePath('/kiosk/employee')
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
