'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getCategories() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('for_role', 'employee')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })

    if (error) {
        console.error('Error fetching categories:', error)
        return []
    }

    return data
}

export async function createCategory(name: string) {
    const supabase = await createClient()

    // Get max sort order
    const { data: maxOrderData } = await supabase
        .from('categories')
        .select('sort_order')
        .eq('for_role', 'employee')
        .order('sort_order', { ascending: false })
        .limit(1)
        .single()

    const nextOrder = (maxOrderData?.sort_order || 0) + 10

    const { error } = await supabase
        .from('categories')
        .insert({
            name,
            for_role: 'employee',
            sort_order: nextOrder,
            is_active: true
        })

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath('/admin/settings/categories')
    revalidatePath('/admin/manage_employee/[code]', 'page')
    return { success: true }
}

export async function deleteCategory(id: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath('/admin/settings/categories')
    revalidatePath('/admin/manage_employee/[code]', 'page')
    return { success: true }
}

export async function updateCategory(id: string, name: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('categories')
        .update({ name })
        .eq('id', id)

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath('/admin/settings/categories')
    revalidatePath('/admin/manage_employee/[code]', 'page')
    return { success: true }
}
