'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getDeadlineSetting() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'preferred_rest_deadline_day')
        .single()

    if (error) {
        console.error('Error fetching deadline setting:', error)
        // Return default of 21 if setting not found or error
        return { success: false, data: 21, error: error.message }
    }

    // Value is stored as JSONB, so it might be a number or string
    const day = Number(data.value) || 21
    return { success: true, data: day }
}

export async function updateDeadlineSetting(day: number) {
    const supabase = await createClient()

    if (day < 1 || day > 28) {
        return { success: false, error: 'Day must be between 1 and 28' }
    }

    const { error } = await supabase
        .from('app_settings')
        .upsert({
            key: 'preferred_rest_deadline_day',
            value: day, // optimized: supabase handles casting to jsonb
            description: 'Day of the month (1-28) when preferred rest submission closes'
        })

    if (error) {
        console.error('Error updating deadline setting:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/admin/settings/deadline')
    revalidatePath('/kiosk/employee/setdayoff')
    return { success: true }
}
