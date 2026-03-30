'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { formatLocalDate } from '@/lib/utils'

export type StatusPeriod = {
    id: number
    person_id: string
    status: 'active' | 'inactive'
    valid_from: string
    valid_until: string | null
    note: string | null
    created_at: string
}

export async function getStatusHistory(personId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('person_status_history')
        .select('*')
        .eq('person_id', personId)
        .order('valid_from', { ascending: false })

    if (error) {
        return { success: false, error: error.message }
    }

    return { success: true, data: data as StatusPeriod[] }
}

export async function addStatusPeriod(data: {
    person_id: string
    status: 'active' | 'inactive'
    valid_from: string
    valid_until: string | null
    note: string | null
}) {
    const supabase = await createClient()

    // 1. Find ALL existing open periods (valid_until is null) that started before this one
    // We want to close them all to prevent stale open-ended records.
    const { data: openPeriods } = await supabase
        .from('person_status_history')
        .select('id, valid_from')
        .eq('person_id', data.person_id)
        .is('valid_until', null)
        .lte('valid_from', data.valid_from) // Started on or before the new one
        .order('valid_from', { ascending: false })

    if (openPeriods && openPeriods.length > 0) {
        // Close them the day before the new period starts
        const newStart = new Date(data.valid_from)
        newStart.setDate(newStart.getDate() - 1)
        const closeDate = formatLocalDate(newStart)

        for (const openPeriod of openPeriods) {
            // Ensure closeDate is not before valid_from (sanity check)
            if (closeDate >= openPeriod.valid_from) {
                await supabase
                    .from('person_status_history')
                    .update({ valid_until: closeDate })
                    .eq('id', openPeriod.id)
            }
        }
    }

    const { error } = await supabase
        .from('person_status_history')
        .insert({
            person_id: data.person_id,
            status: data.status,
            valid_from: data.valid_from,
            valid_until: data.valid_until,
            note: data.note
        })

    if (error) {
        console.error('Error adding status period:', error)
        return { success: false, error: error.message }
    }

    // Also update the person's current status if this new period covers "now"
    // For simplicity, we might just let the UI handle the "current status" display logic,
    // or trigger a sync. But the 'active' status on 'people' table is now somewhat redundant 
    // or needs to be kept in sync.
    // Let's invoke a helper to sync current status based on today's date.
    await syncCurrentStatus(data.person_id)

    revalidatePath('/admin/manage_employee')
    revalidatePath('/admin/manage_student')

    // Attempt to revalidate generic paths if we can't guess the code
    // revalidatePath(`/admin/manage_employee/${data.person_id}`) 

    return { success: true }
}

export async function deleteStatusPeriod(id: number, personId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('person_status_history')
        .delete()
        .eq('id', id)

    if (error) {
        return { success: false, error: error.message }
    }

    await syncCurrentStatus(personId)

    return { success: true }
}

export async function updateStatusPeriod(id: number, personId: string, data: {
    status: 'active' | 'inactive'
    valid_from: string
    valid_until: string | null
    note: string | null
}) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('person_status_history')
        .update({
            status: data.status,
            valid_from: data.valid_from,
            valid_until: data.valid_until,
            note: data.note
        })
        .eq('id', id)

    if (error) {
        console.error('Error updating status period:', error)
        return { success: false, error: error.message }
    }

    await syncCurrentStatus(personId)

    revalidatePath('/admin/manage_employee')
    revalidatePath('/admin/manage_student')

    return { success: true }
}

async function syncCurrentStatus(personId: string) {
    const supabase = await createClient()
    const today = formatLocalDate(new Date())

    // Find the period that covers today
    const { data, error } = await supabase
        .from('person_status_history')
        .select('status')
        .eq('person_id', personId)
        .lte('valid_from', today)
        .or(`valid_until.is.null,valid_until.gte.${today}`)
        .order('valid_from', { ascending: false })
        .limit(1)
        .single()

    // If no period covers today, what should be the status? Inactive?
    // Or maybe the latest period determines it?
    // Let's assume inactive if no active period covers today.

    let newStatus = 'inactive'
    if (data) {
        newStatus = data.status
    }

    // Update the person record
    await supabase
        .from('people')
        .update({ status: newStatus })
        .eq('id', personId)
}
