'use server'

import { createClient } from '@/utils/supabase/server'

export async function getAllEmployeesAttendance(year: number, month: number) {
    try {
        const supabase = await createClient()

        // Calculate the first and last day of the month
        const startDate = new Date(year, month, 1)
        const endDate = new Date(year, month + 1, 0)
        const startDateStr = startDate.toISOString().split('T')[0]
        const endDateStr = endDate.toISOString().split('T')[0]

        // 1. Fetch all active employees (not students)
        const { data: employees, error: employeesError } = await supabase
            .from('people')
            .select('id, full_name, code, role')
            .eq('status', 'active')
            .eq('role', 'employee')
            .order('code', { ascending: true })

        if (employeesError) throw employeesError

        // 2. Fetch attendance records for the month
        const { data: attendance, error: attendanceError } = await supabase
            .from('attendance_days')
            .select('*')
            .gte('date', startDateStr)
            .lte('date', endDateStr)

        if (attendanceError) throw attendanceError

        // 3. Fetch system events for the month
        const { data: events, error: eventsError } = await supabase
            .from('system_events')
            .select('*')
            .gte('event_date', startDateStr)
            .lte('event_date', endDateStr)

        if (eventsError) throw eventsError

        return {
            success: true,
            data: {
                employees: employees || [],
                attendance: attendance || [],
                events: events || []
            }
        }
    } catch (error: any) {
        console.error('Error in getAllEmployeesAttendance:', error)
        return { success: false, error: error.message }
    }
}
