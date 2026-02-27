'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export type SystemEvent = {
    id: string
    title: string
    description?: string | null
    event_date: string
    event_type: string
    is_holiday: boolean
    created_at: string
}

export type EventType = {
    id: string
    name: string
    slug: string
    color: string
    is_default: boolean
    is_active: boolean
    created_at: string
}

export async function getSystemEvents(startDate: string, endDate: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('system_events')
        .select('*')
        .gte('event_date', startDate)
        .lte('event_date', endDate)
        .order('event_date', { ascending: true })

    if (error) {
        console.error('Error fetching system events:', error)
        return { success: false, error: error.message }
    }

    return { success: true, data }
}

export async function createSystemEvent(data: {
    title: string
    description?: string
    event_date: string
    event_type: string
    is_holiday: boolean
}) {
    const supabase = await createClient()

    const { data: newEvent, error } = await supabase
        .from('system_events')
        .insert([data])
        .select()
        .single()

    if (error) {
        console.error('Error creating system event:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/admin/settings/calendar')
    revalidatePath('/admin/shift-actions') // Revalidate where shifts are viewed
    return { success: true, data: newEvent }
}

export async function updateSystemEvent(id: string, data: {
    title?: string
    description?: string
    event_date?: string
    event_type?: string
    is_holiday?: boolean
}) {
    const supabase = await createClient()

    const { data: updatedEvent, error } = await supabase
        .from('system_events')
        .update(data)
        .eq('id', id)
        .select()
        .single()

    if (error) {
        console.error('Error updating system event:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/admin/settings/calendar')
    revalidatePath('/admin/shift-actions')
    return { success: true, data: updatedEvent }
}

export async function deleteSystemEvent(id: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('system_events')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Error deleting system event:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/admin/settings/calendar')
    revalidatePath('/admin/shift-actions')
    return { success: true }
}

// Event Type Management Actions

export async function getEventTypes() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('system_event_types')
        .select('*')
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('name', { ascending: true })

    if (error) {
        console.error('Error fetching event types:', error)
        return { success: false, error: error.message }
    }

    return { success: true, data: data as EventType[] }
}

export async function createEventType(name: string, color: string = 'blue') {
    const supabase = await createClient()

    // Generate slug from name
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

    const { data: newType, error } = await supabase
        .from('system_event_types')
        .insert([{
            name,
            slug,
            color,
            is_default: false,
            is_active: true,
        }])
        .select()
        .single()

    if (error) {
        console.error('Error creating event type:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/admin/settings/calendar')
    return { success: true, data: newType }
}

export async function deleteEventType(id: string) {
    const supabase = await createClient()

    // Check if it's a default type
    const { data: eventType } = await supabase
        .from('system_event_types')
        .select('is_default')
        .eq('id', id)
        .single()

    if (eventType?.is_default) {
        return { success: false, error: 'Cannot delete default event types' }
    }

    const { error } = await supabase
        .from('system_event_types')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Error deleting event type:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/admin/settings/calendar')
    return { success: true }
}

// Location Management Actions

export type Location = {
    id: string
    name: string
    is_default: boolean
    is_active: boolean
    sort_order: number | null
    created_at: string
    updated_at: string
}

export async function getLocations() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

    if (error) {
        console.error('Error fetching locations:', error)
        return { success: false, error: error.message }
    }

    return { success: true, data }
}

export async function createLocation(name: string) {
    const supabase = await createClient()

    // Get the max sort_order to append new location at the end
    const { data: maxData } = await supabase
        .from('locations')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)

    const nextSortOrder = (maxData?.[0]?.sort_order || 0) + 1

    const { data: newLocation, error } = await supabase
        .from('locations')
        .insert([{
            name,
            is_default: false,
            is_active: true,
            sort_order: nextSortOrder
        }])
        .select()
        .single()

    if (error) {
        console.error('Error creating location:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/admin/settings/locations')
    revalidatePath('/admin/masterlist')
    return { success: true, data: newLocation }
}

export async function deleteLocation(id: string) {
    const supabase = await createClient()

    // First check if it's a default location
    const { data: location } = await supabase
        .from('locations')
        .select('is_default')
        .eq('id', id)
        .single()

    if (location?.is_default) {
        return { success: false, error: 'Cannot delete default locations' }
    }

    const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Error deleting location:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/admin/settings/locations')
    revalidatePath('/admin/masterlist')
    return { success: true }
}
