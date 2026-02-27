'use server'

import { createClient } from '@/utils/supabase/server'
import { formatLocalDate } from '@/lib/utils'

/**
 * Supabase enforces a server-side max of 1000 rows per request.
 * This helper paginates through all rows using .range() to ensure
 * no data is silently dropped.
 */
async function fetchAllRows(
    supabase: any,
    table: string,
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
            .select('*')
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

export async function getAllEmployeesAttendance(year: number, month: number) {
    try {
        const supabase = await createClient()

        // Calculate the first and last day of the month
        const startDate = new Date(year, month, 1)
        const endDate = new Date(year, month + 1, 0)
        const startDateStr = formatLocalDate(startDate)
        const endDateStr = formatLocalDate(endDate)

        // 1. Fetch all people (employees and students) with categories
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
        // IMPORTANT: Supabase enforces a server-side max of 1000 rows per request.
        // With many employees+students, monthly attendance easily exceeds 1000 rows.
        // We use paginated fetching to ensure ALL records are returned.
        const attendance = await fetchAllRows(supabase, 'attendance_days', 'date', startDateStr, endDateStr)

        // 3. Fetch shifts for the month (can also exceed 1000 rows)
        const shifts = await fetchAllRows(supabase, 'shifts', 'date', startDateStr, endDateStr)

        // 4. Fetch system events for the month (typically small, no pagination needed)
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
