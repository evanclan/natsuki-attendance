'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { formatLocalDate } from '@/lib/utils'

export type CategoryPeriod = {
    id: number
    person_id: string
    valid_from: string
    valid_until: string | null
    note: string | null
    created_at: string
    categories: { id: string; name: string }[]
}

/**
 * Fetch all category history records for a person, with their categories.
 */
export async function getCategoryHistory(personId: string) {
    const supabase = await createClient()

    // Fetch all periods
    const { data: periods, error } = await supabase
        .from('person_category_history')
        .select('*')
        .eq('person_id', personId)
        .order('valid_from', { ascending: false })

    if (error) {
        return { success: false, error: error.message }
    }

    if (!periods || periods.length === 0) {
        return { success: true, data: [] as CategoryPeriod[] }
    }

    // Fetch categories for all periods in one query
    const periodIds = periods.map(p => p.id)
    const { data: periodCategories, error: catError } = await supabase
        .from('person_category_history_categories')
        .select('history_id, category_id, categories(id, name)')
        .in('history_id', periodIds)

    if (catError) {
        console.error('Error fetching period categories:', catError)
    }

    // Build a map: history_id -> category[]
    const catMap: Record<number, { id: string; name: string }[]> = {}
    for (const pc of periodCategories || []) {
        if (!catMap[pc.history_id]) catMap[pc.history_id] = []
        const cat = pc.categories as any
        if (cat) {
            catMap[pc.history_id].push({ id: cat.id, name: cat.name })
        }
    }

    // Merge
    const result: CategoryPeriod[] = periods.map(p => ({
        ...p,
        categories: catMap[p.id] || []
    }))

    return { success: true, data: result }
}

/**
 * Add a new category period.
 * Auto-closes any existing open-ended periods (valid_until = null) for this person.
 */
export async function addCategoryPeriod(data: {
    person_id: string
    category_ids: string[]
    valid_from: string
    valid_until: string | null
    note: string | null
}) {
    const supabase = await createClient()

    // 1. Close any existing open-ended periods that started before or on the new one
    const { data: openPeriods } = await supabase
        .from('person_category_history')
        .select('id, valid_from')
        .eq('person_id', data.person_id)
        .is('valid_until', null)
        .lte('valid_from', data.valid_from)
        .order('valid_from', { ascending: false })

    if (openPeriods && openPeriods.length > 0) {
        // Close them the day before the new period starts
        const newStart = new Date(data.valid_from)
        newStart.setDate(newStart.getDate() - 1)
        const closeDate = formatLocalDate(newStart)

        for (const openPeriod of openPeriods) {
            // Ensure closeDate is not before valid_from
            if (closeDate >= openPeriod.valid_from) {
                await supabase
                    .from('person_category_history')
                    .update({ valid_until: closeDate })
                    .eq('id', openPeriod.id)
            }
        }
    }

    // 2. Insert new period
    const { data: newPeriod, error } = await supabase
        .from('person_category_history')
        .insert({
            person_id: data.person_id,
            valid_from: data.valid_from,
            valid_until: data.valid_until,
            note: data.note
        })
        .select()
        .single()

    if (error) {
        console.error('Error adding category period:', error)
        return { success: false, error: error.message }
    }

    // 3. Insert category links
    if (data.category_ids.length > 0) {
        const inserts = data.category_ids.map(catId => ({
            history_id: newPeriod.id,
            category_id: catId
        }))

        const { error: linkError } = await supabase
            .from('person_category_history_categories')
            .insert(inserts)

        if (linkError) {
            console.error('Error linking categories to period:', linkError)
            return { success: false, error: linkError.message }
        }
    }

    // 4. Sync current categories
    await syncCurrentCategories(data.person_id)

    revalidatePath('/admin/manage_student')

    return { success: true }
}

/**
 * Update an existing category period's dates, note, and categories.
 */
export async function updateCategoryPeriod(id: number, personId: string, data: {
    category_ids: string[]
    valid_from: string
    valid_until: string | null
    note: string | null
}) {
    const supabase = await createClient()

    // Update the period dates/note
    const { error } = await supabase
        .from('person_category_history')
        .update({
            valid_from: data.valid_from,
            valid_until: data.valid_until,
            note: data.note
        })
        .eq('id', id)

    if (error) {
        console.error('Error updating category period:', error)
        return { success: false, error: error.message }
    }

    // Replace category links: delete existing and insert new
    await supabase
        .from('person_category_history_categories')
        .delete()
        .eq('history_id', id)

    if (data.category_ids.length > 0) {
        const inserts = data.category_ids.map(catId => ({
            history_id: id,
            category_id: catId
        }))

        const { error: linkError } = await supabase
            .from('person_category_history_categories')
            .insert(inserts)

        if (linkError) {
            console.error('Error re-linking categories:', linkError)
            return { success: false, error: linkError.message }
        }
    }

    await syncCurrentCategories(personId)

    revalidatePath('/admin/manage_student')

    return { success: true }
}

/**
 * Delete a category period and its category links.
 */
export async function deleteCategoryPeriod(id: number, personId: string) {
    const supabase = await createClient()

    // CASCADE will handle the join table entries
    const { error } = await supabase
        .from('person_category_history')
        .delete()
        .eq('id', id)

    if (error) {
        return { success: false, error: error.message }
    }

    await syncCurrentCategories(personId)

    return { success: true }
}

/**
 * Sync the person_categories table based on which category period
 * covers today's date. This keeps the existing system working without changes.
 */
export async function syncCurrentCategories(personId: string) {
    const supabase = await createClient()
    const today = formatLocalDate(new Date())

    // Find the period that covers today
    const { data: currentPeriod } = await supabase
        .from('person_category_history')
        .select('id')
        .eq('person_id', personId)
        .lte('valid_from', today)
        .or(`valid_until.is.null,valid_until.gte.${today}`)
        .order('valid_from', { ascending: false })
        .limit(1)
        .single()

    // Delete all existing person_categories for this person
    await supabase
        .from('person_categories')
        .delete()
        .eq('person_id', personId)

    if (currentPeriod) {
        // Get the categories for the current period
        const { data: periodCats } = await supabase
            .from('person_category_history_categories')
            .select('category_id')
            .eq('history_id', currentPeriod.id)

        if (periodCats && periodCats.length > 0) {
            const inserts = periodCats.map(pc => ({
                person_id: personId,
                category_id: pc.category_id
            }))

            await supabase
                .from('person_categories')
                .insert(inserts)

            // Also update the legacy category_id on people table (first category)
            await supabase
                .from('people')
                .update({ category_id: periodCats[0].category_id })
                .eq('id', personId)
        }
    }
}

/**
 * Sync categories for ALL students. Used by the daily cron job.
 */
export async function syncAllStudentCategories() {
    const supabase = await createClient()

    // Get today in JST
    const now = new Date()
    const jstOffset = 9 * 60 * 60 * 1000
    const jstDate = new Date(now.getTime() + jstOffset)
    const today = jstDate.toISOString().split('T')[0]

    // Get all students who have category history
    const { data: students } = await supabase
        .from('people')
        .select('id')
        .eq('role', 'student')

    if (!students) return { synced: 0, changes: [] }

    const changes: { personId: string; oldCats: string[]; newCats: string[] }[] = []

    for (const student of students) {
        // Check if this student has any category history
        const { data: historyCheck } = await supabase
            .from('person_category_history')
            .select('id')
            .eq('person_id', student.id)
            .limit(1)

        if (!historyCheck || historyCheck.length === 0) continue

        // Get current person_categories before sync
        const { data: oldCats } = await supabase
            .from('person_categories')
            .select('category_id, categories(name)')
            .eq('person_id', student.id)

        const oldCatNames = (oldCats || []).map((c: any) => c.categories?.name || '').filter(Boolean)

        // Find the period that covers today
        const { data: currentPeriod } = await supabase
            .from('person_category_history')
            .select('id')
            .eq('person_id', student.id)
            .lte('valid_from', today)
            .or(`valid_until.is.null,valid_until.gte.${today}`)
            .order('valid_from', { ascending: false })
            .limit(1)
            .single()

        // Delete current person_categories
        await supabase
            .from('person_categories')
            .delete()
            .eq('person_id', student.id)

        if (currentPeriod) {
            const { data: periodCats } = await supabase
                .from('person_category_history_categories')
                .select('category_id, categories(name)')
                .eq('history_id', currentPeriod.id)

            if (periodCats && periodCats.length > 0) {
                const inserts = periodCats.map((pc: any) => ({
                    person_id: student.id,
                    category_id: pc.category_id
                }))

                await supabase
                    .from('person_categories')
                    .insert(inserts)

                await supabase
                    .from('people')
                    .update({ category_id: periodCats[0].category_id })
                    .eq('id', student.id)

                const newCatNames = periodCats.map((c: any) => c.categories?.name || '').filter(Boolean)

                // Check if categories actually changed
                const oldSorted = [...oldCatNames].sort().join(',')
                const newSorted = [...newCatNames].sort().join(',')
                if (oldSorted !== newSorted) {
                    changes.push({
                        personId: student.id,
                        oldCats: oldCatNames,
                        newCats: newCatNames
                    })
                }
            }
        }
    }

    return { synced: students.length, changes }
}
