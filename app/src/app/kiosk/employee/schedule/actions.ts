'use server'

import { createAdminClient } from '@/utils/supabase/admin'

export type DailyScheduleData = {
    date: string
    events: any[]
    shifts: Record<string, any> // person_id -> shift
    people: any[]
}

export async function getTodaySchedule(date?: string) {
    try {
        const supabase = createAdminClient()

        // Use provided date or current date (Japan time as per user context usually, but server time is safe for now)
        // Ideally we should handle timezone, but let's stick to simple YYYY-MM-DD

        let targetDate = date
        if (!targetDate) {
            // Default to today
            // Note: In production this should probably depend on timezone config
            // For now using simple ISO date part
            // Default to today in Japan timezone
            targetDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' })
        }

        console.log('[getTodaySchedule] Service Role Key Present:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
        console.log('[getTodaySchedule] targetDate:', targetDate)

        // 1. Fetch active people
        // We can use the same RPC as masterlist 'get_active_people_in_range'
        // passing start = end = targetDate
        const { data: people, error: peopleError } = await supabase
            .rpc('get_active_people_in_range', {
                range_start: targetDate,
                range_end: targetDate
            })
            .select('id, full_name, role, job_type')
            .eq('role', 'employee')
            .order('role', { ascending: true }) // Maybe sort by name or role? User said "iterate it dynamically"
            .order('full_name', { ascending: true })

        if (peopleError) {
            console.error('[getTodaySchedule] People Error:', peopleError)
            throw peopleError
        }
        console.log('[getTodaySchedule] Active People found:', (people as any[])?.length, (people as any[])?.map(p => p.full_name))

        // 2. Fetch shifts for the day - NO FILTER to debug
        const { data: allShifts, error: shiftsError } = await supabase
            .from('shifts')
            .select('*')

        console.log('[getTodaySchedule] All shifts in DB:', allShifts?.length)
        console.log('[getTodaySchedule] Sample dates:', allShifts?.slice(0, 5).map(s => ({ date: s.date, typeof: typeof s.date })))

        const shifts = allShifts?.filter(s => s.date === targetDate)

        if (shiftsError) {
            console.error('[getTodaySchedule] Shifts Error:', shiftsError)
            throw shiftsError
        }
        console.log('[getTodaySchedule] Shifts found for targetDate:', shifts?.length, shifts)

        // Create a map for easier lookup
        const shiftsMap: Record<string, any> = {}
        if (shifts) {
            shifts.forEach((s: any) => {
                shiftsMap[s.person_id] = s
            })
        }

        // 3. Fetch system event for the day
        const { data: events, error: eventsError } = await supabase
            .from('system_events')
            .select('*')
            .eq('event_date', targetDate)

        if (eventsError) throw eventsError

        return {
            success: true,
            data: {
                date: targetDate,
                events: events || [],
                shifts: shiftsMap,
                people: people || []
            } as DailyScheduleData
        }

    } catch (error: any) {
        console.error('Error in getTodaySchedule:', error)
        return { success: false, error: error.message }
    }
}
