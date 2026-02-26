'use server'

import { createClient } from '@/utils/supabase/server'
import { upsertAttendanceRecord } from '@/app/admin/attendance-actions/actions'

export async function getEmployeeList(): Promise<{ success: boolean; data?: Array<{ id: string; code: string; full_name: string }>; error?: string }> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('people')
        .select('id, code, full_name')
        .eq('role', 'employee')
        .eq('status', 'active')
        .order('full_name', { ascending: true })

    if (error) {
        console.error('Error fetching employee list:', error)
        return { success: false, error: error.message }
    }

    return { success: true, data: data || [] }
}

export async function bulkUpsertAttendance(
    personId: string,
    entries: Array<{ date: string; checkIn: string; checkOut: string }>
): Promise<{ total: number; succeeded: number; failed: number; errors: string[] }> {
    const result = {
        total: entries.length,
        succeeded: 0,
        failed: 0,
        errors: [] as string[]
    }

    for (const entry of entries) {
        try {
            const checkInAt = entry.checkIn ? `${entry.date}T${entry.checkIn}:00+09:00` : null
            const checkOutAt = entry.checkOut ? `${entry.date}T${entry.checkOut}:00+09:00` : null

            let status = 'present'
            if (!checkInAt && !checkOutAt) {
                status = 'absent'
            }

            const res = await upsertAttendanceRecord(personId, entry.date, {
                check_in_at: checkInAt,
                check_out_at: checkOutAt,
                status,
                admin_note: 'Bulk entry via Quick Action'
            })

            if (res.success) {
                result.succeeded++
            } else {
                result.failed++
                result.errors.push(`${entry.date}: ${res.error}`)
            }
        } catch (err: any) {
            result.failed++
            result.errors.push(`${entry.date}: ${err.message || 'Unknown error'}`)
        }
    }

    return result
}
