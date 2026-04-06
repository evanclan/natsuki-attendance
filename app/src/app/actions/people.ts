'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export interface CreatePersonData {
    full_name: string
    role: 'employee' | 'student'
    category_id: string | null // Keep for legacy/primary support if needed, or we might ignore it in favor of list
    category_ids?: string[] // New field
    job_type?: string
    registration_date: string
}

export async function createPerson(data: CreatePersonData) {
    const supabase = await createClient()

    // Generate new code
    const prefix = data.role === 'employee' ? 'EMP' : 'STU'

    // Get the latest code for this role
    const { data: latest } = await supabase
        .from('people')
        .select('code')
        .eq('role', data.role)
        .like('code', `${prefix}%`)
        .order('code', { ascending: false })
        .limit(1)
        .single()

    let newCode = `${prefix}001`

    if (latest && latest.code) {
        const currentNum = parseInt(latest.code.replace(prefix, ''))
        if (!isNaN(currentNum)) {
            newCode = `${prefix}${String(currentNum + 1).padStart(3, '0')}`
        }
    }

    // Determine primary category (first of the list or the single one)
    let primaryCategoryId = data.category_id
    if (data.category_ids && data.category_ids.length > 0) {
        primaryCategoryId = data.category_ids[0]
    }

    const { data: person, error } = await supabase
        .from('people')
        .insert({
            code: newCode,
            full_name: data.full_name,
            role: data.role,
            category_id: primaryCategoryId, // stored for legacy/easy access
            job_type: data.job_type || null,
            registration_date: data.registration_date,
            status: 'active'
        })
        .select()
        .single()

    if (error) {
        return { success: false, error: error.message }
    }

    // Insert into person_categories
    if (data.category_ids && data.category_ids.length > 0) {
        const categoryInserts = data.category_ids.map(catId => ({
            person_id: person.id,
            category_id: catId
        }))

        const { error: catError } = await supabase
            .from('person_categories')
            .insert(categoryInserts)

        if (catError) {
            console.error('Error inserting categories:', catError)
            // We don't fail the whole request, but logging it is good.
            // Ideally we might want to transaction this, but Supabase HTTP operations are separate.
        }
    } else if (data.category_id) {
        // Fallback if only single ID provided
        const { error: catError } = await supabase
            .from('person_categories')
            .insert({
                person_id: person.id,
                category_id: data.category_id
            })

        if (catError) console.error('Error inserting legacy category:', catError)
    }

    // Insert initial status history
    const { error: statusError } = await supabase
        .from('person_status_history')
        .insert({
            person_id: person.id,
            status: 'active',
            valid_from: data.registration_date,
            valid_until: null,
            note: 'Initial creation'
        })

    if (statusError) {
        console.error('Error inserting status history:', statusError)
        // We don't fail, but this is critical for masterlist
    }

    // Insert initial category history for students
    if (data.role === 'student') {
        const categoryIdsToRecord = data.category_ids && data.category_ids.length > 0
            ? data.category_ids
            : (data.category_id ? [data.category_id] : [])

        if (categoryIdsToRecord.length > 0) {
            const { data: historyPeriod, error: histError } = await supabase
                .from('person_category_history')
                .insert({
                    person_id: person.id,
                    valid_from: data.registration_date,
                    valid_until: null,
                    note: 'Initial creation'
                })
                .select()
                .single()

            if (histError) {
                console.error('Error inserting category history:', histError)
            } else if (historyPeriod) {
                const histCatInserts = categoryIdsToRecord.map(catId => ({
                    history_id: historyPeriod.id,
                    category_id: catId
                }))

                const { error: histCatError } = await supabase
                    .from('person_category_history_categories')
                    .insert(histCatInserts)

                if (histCatError) {
                    console.error('Error inserting category history categories:', histCatError)
                }
            }
        }
    }

    revalidatePath('/admin/manage_employee')
    revalidatePath('/admin/manage_student')

    return { success: true }
}

export async function getAvailableCategories(role: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .eq('for_role', role)
        .eq('is_active', true)
        .order('sort_order')

    if (error) {
        return []
    }

    return data || []
}

export async function deletePerson(id: string) {
    const supabase = await createClient()

    // First fetch the person to return their name for confirmation
    const { data: person, error: fetchError } = await supabase
        .from('people')
        .select('id, full_name, code')
        .eq('id', id)
        .single()

    if (fetchError || !person) {
        return { success: false, error: 'Person not found' }
    }

    // Hard delete: permanently remove the person.
    // All related records (attendance, shifts, person_categories,
    // status_history, monthly_memos, category_history) are automatically
    // deleted via ON DELETE CASCADE constraints.
    const { error: deleteError } = await supabase
        .from('people')
        .delete()
        .eq('id', id)

    if (deleteError) {
        return { success: false, error: deleteError.message }
    }

    revalidatePath('/admin/manage_employee')
    revalidatePath('/admin/manage_student')

    return { success: true }
}
