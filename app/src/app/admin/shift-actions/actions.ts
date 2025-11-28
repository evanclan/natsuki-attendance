'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export type ShiftData = {
    date: string
    shift_type?: string
    shift_name?: string
    start_time?: string
    end_time?: string
    location?: string
    memo?: string
}

export async function createShift(personId: string, shiftData: ShiftData) {
    try {
        const supabase = await createClient()

        // Check if a shift already exists for this person on this date
        const { data: existingShift } = await supabase
            .from('shifts')
            .select('id')
            .eq('person_id', personId)
            .eq('date', shiftData.date)
            .single()

        if (existingShift) {
            // Update existing shift instead
            return await updateShift(existingShift.id, shiftData)
        }

        // Create new shift
        const { data, error } = await supabase
            .from('shifts')
            .insert({
                person_id: personId,
                date: shiftData.date,
                shift_type: shiftData.shift_type || 'work',
                shift_name: shiftData.shift_name,
                start_time: shiftData.start_time,
                end_time: shiftData.end_time,
                location: shiftData.location,
                memo: shiftData.memo,
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating shift:', error)
            return { success: false, error: error.message }
        }

        revalidatePath('/admin')
        return { success: true, data }
    } catch (error) {
        console.error('Error in createShift:', error)
        return { success: false, error: 'Failed to create shift' }
    }
}

export async function updateShift(shiftId: number, shiftData: ShiftData) {
    try {
        const supabase = await createClient()

        const { data, error } = await supabase
            .from('shifts')
            .update({
                shift_type: shiftData.shift_type,
                shift_name: shiftData.shift_name,
                start_time: shiftData.start_time,
                end_time: shiftData.end_time,
                location: shiftData.location,
                memo: shiftData.memo,
                updated_at: new Date().toISOString(),
            })
            .eq('id', shiftId)
            .select()
            .single()

        if (error) {
            console.error('Error updating shift:', error)
            return { success: false, error: error.message }
        }

        revalidatePath('/admin')
        return { success: true, data }
    } catch (error) {
        console.error('Error in updateShift:', error)
        return { success: false, error: 'Failed to update shift' }
    }
}

export async function deleteShift(shiftId: number) {
    try {
        const supabase = await createClient()

        const { error } = await supabase
            .from('shifts')
            .delete()
            .eq('id', shiftId)

        if (error) {
            console.error('Error deleting shift:', error)
            return { success: false, error: error.message }
        }

        revalidatePath('/admin')
        return { success: true }
    } catch (error) {
        console.error('Error in deleteShift:', error)
        return { success: false, error: 'Failed to delete shift' }
    }
}

export async function getShiftsByPerson(personId: string, year: number, month: number) {
    try {
        const supabase = await createClient()

        // Calculate the first and last day of the month
        const startDate = new Date(year, month, 1)
        const endDate = new Date(year, month + 1, 0)

        const { data, error } = await supabase
            .from('shifts')
            .select('*')
            .eq('person_id', personId)
            .gte('date', startDate.toISOString().split('T')[0])
            .lte('date', endDate.toISOString().split('T')[0])
            .order('date', { ascending: true })

        if (error) {
            console.error('Error fetching shifts:', error)
            return { success: false, error: error.message, data: [] }
        }

        return { success: true, data: data || [] }
    } catch (error) {
        console.error('Error in getShiftsByPerson:', error)
        return { success: false, error: 'Failed to fetch shifts', data: [] }
    }
}

export async function getShiftByPersonAndDate(personId: string, date: string) {
    try {
        const supabase = await createClient()

        const { data, error } = await supabase
            .from('shifts')
            .select('*')
            .eq('person_id', personId)
            .eq('date', date)
            .single()

        if (error) {
            // Not found is not an error in this case
            if (error.code === 'PGRST116') {
                return { success: true, data: null }
            }
            console.error('Error fetching shift:', error)
            return { success: false, error: error.message, data: null }
        }

        return { success: true, data }
    } catch (error) {
        console.error('Error in getShiftByPersonAndDate:', error)
        return { success: false, error: 'Failed to fetch shift', data: null }
    }
}
