'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export type ShiftLegend = {
    id: string
    from_location: string
    to_location: string
    color: string
    created_at: string
}

export async function getLegends() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('shift_legends')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching legends:', error)
        return { success: false, error: error.message }
    }

    return { success: true, data }
}

export async function createLegend(data: {
    from_location: string
    to_location: string
    color: string
}) {
    const supabase = await createClient()

    const { data: newLegend, error } = await supabase
        .from('shift_legends')
        .insert([data])
        .select()
        .single()

    if (error) {
        console.error('Error creating legend:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/admin/settings/legends')
    return { success: true, data: newLegend }
}

export async function updateLegend(id: string, data: {
    from_location?: string
    to_location?: string
    color?: string
}) {
    const supabase = await createClient()

    const { data: updatedLegend, error } = await supabase
        .from('shift_legends')
        .update(data)
        .eq('id', id)
        .select()
        .single()

    if (error) {
        console.error('Error updating legend:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/admin/settings/legends')
    return { success: true, data: updatedLegend }
}

export async function deleteLegend(id: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('shift_legends')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Error deleting legend:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/admin/settings/legends')
    return { success: true }
}
