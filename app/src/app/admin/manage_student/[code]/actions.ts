'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { addStatusPeriod } from '@/actions/status_history'

export async function updateStudentDetails(code: string, data: {
    full_name: string
    japanese_name: string
    category_id: string | null
    category_ids?: string[] // New field
    registration_date: string
    status: string
}) {
    const supabase = await createClient()

    // Determine primary category (first of the list or the single one)
    let primaryCategoryId = data.category_id
    if (data.category_ids && data.category_ids.length > 0) {
        primaryCategoryId = data.category_ids[0]
    }

    // Get current status before update to check for changes
    const { data: currentData } = await supabase
        .from('people')
        .select('status')
        .eq('code', code)
        .single()

    const { data: person, error } = await supabase
        .from('people')
        .update({
            full_name: data.full_name,
            japanese_name: data.japanese_name,
            category_id: primaryCategoryId,
            registration_date: data.registration_date,
            status: data.status,
            updated_at: new Date().toISOString()
        })
        .eq('code', code)
        .select()
        .single()

    if (error) {
        return { success: false, error: error.message }
    }

    // If status changed, add a history record
    if (currentData && currentData.status !== data.status) {
        const today = new Date().toISOString().split('T')[0]

        await addStatusPeriod({
            person_id: person.id,
            status: data.status as 'active' | 'inactive',
            valid_from: today,
            valid_until: null,
            note: 'Changed via profile settings'
        })
    }

    // Update person_categories
    // Delete existing
    await supabase.from('person_categories').delete().eq('person_id', person.id)

    // Insert new
    if (data.category_ids && data.category_ids.length > 0) {
        const categoryInserts = data.category_ids.map(catId => ({
            person_id: person.id,
            category_id: catId
        }))

        const { error: catError } = await supabase
            .from('person_categories')
            .insert(categoryInserts)

        if (catError) console.error('Error updating categories:', catError)
    } else if (data.category_id) {
        // Fallback legacy support
        const { error: catError } = await supabase
            .from('person_categories')
            .insert({
                person_id: person.id,
                category_id: data.category_id
            })
        if (catError) console.error('Error updating legacy category:', catError)
    }

    revalidatePath('/admin/manage_student')
    revalidatePath(`/admin/manage_student/${code}`)

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
