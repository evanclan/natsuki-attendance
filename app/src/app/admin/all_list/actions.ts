'use server'

import { createClient } from '@/utils/supabase/server'
import { formatLocalDate } from '@/lib/utils'

export async function getAllEmployeesAttendance(year: number, month: number) {
    try {
        const supabase = await createClient()

        // Calculate the first and last day of the month
        const startDate = new Date(year, month, 1)
        const endDate = new Date(year, month + 1, 0)
        const startDateStr = formatLocalDate(startDate)
        const endDateStr = formatLocalDate(endDate)

        // 1. Fetch all people (employees and students) with categories
        // We use the same RPC or query as masterlist to ensure consistent opportunities for sorting
        // Actually, let's use the RPC 'get_active_people_in_range' if available, as MasterList uses it.
        // It provides 'person_categories' which is needed for proper sorting.

        const { data: people, error: peopleError } = await supabase
            .rpc('get_active_people_in_range', {
                range_start: startDateStr,
                range_end: endDateStr
            })
            .select('id, full_name, code, role, job_type, display_order, status, person_categories(categories(name))')
            .eq('status', 'active')
            .order('role', { ascending: true })
            .order('display_order', { ascending: true })
            .order('code', { ascending: true })

        if (peopleError) throw peopleError

        // Process people into employees and students, applying the MasterList sorting logic
        const sortedPeople = ((people as any[])?.map((p: any) => ({
            ...p,
            categories: p.person_categories?.map((pc: any) => pc.categories) || []
        })) as any[])?.sort((a: any, b: any) => {
            // 1. Sort by Role (Employees first)
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
        }) || []

        const employees = sortedPeople.filter(p => p.role === 'employee')
        const students = sortedPeople.filter(p => p.role === 'student')

        // 2. Fetch attendance records for the month
        const { data: attendance, error: attendanceError } = await supabase
            .from('attendance_days')
            .select('*')
            .gte('date', startDateStr)
            .lte('date', endDateStr)

        if (attendanceError) throw attendanceError

        // 3. Fetch shifts for the month (New addition for styling/status)
        const { data: shifts, error: shiftsError } = await supabase
            .from('shifts')
            .select('*')
            .gte('date', startDateStr)
            .lte('date', endDateStr)

        if (shiftsError) throw shiftsError

        // 4. Fetch system events for the month
        const { data: events, error: eventsError } = await supabase
            .from('system_events')
            .select('*')
            .gte('event_date', startDateStr)
            .lte('event_date', endDateStr)

        if (eventsError) throw eventsError

        return {
            success: true,
            data: {
                employees,
                students,
                attendance: attendance || [],
                shifts: shifts || [],
                events: events || []
            }
        }
    } catch (error: any) {
        console.error('Error in getAllEmployeesAttendance:', error)
        return { success: false, error: error.message }
    }
}
