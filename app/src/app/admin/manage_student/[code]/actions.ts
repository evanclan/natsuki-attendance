'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateStudentDetails(code: string, data: {
    full_name: string
    japanese_name?: string
    category_id: string | null
    registration_date: string
    status: string
}) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('people')
        .update({
            full_name: data.full_name,
            japanese_name: data.japanese_name,
            category_id: data.category_id,
            registration_date: data.registration_date,
            status: data.status,
            updated_at: new Date().toISOString()
        })
        .eq('code', code)

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath(`/admin/manage_student/${code}`)
    revalidatePath('/admin/manage_student')

    return { success: true }
}

export async function updateStudentMemo(code: string, memo: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('people')
        .update({
            memo: memo,
            updated_at: new Date().toISOString()
        })
        .eq('code', code)

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath(`/admin/manage_student/${code}`)

    return { success: true }
}
