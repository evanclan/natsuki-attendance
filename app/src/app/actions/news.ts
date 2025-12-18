'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { formatLocalDate } from '@/lib/utils'

export type NewsItem = {
    id: string
    title: string
    description: string
    image_url: string | null
    target_audience: 'student' | 'employee'
    is_active: boolean
    display_date: string
    created_at: string
    updated_at: string
}

export type CreateNewsInput = {
    title: string
    description: string
    image_url?: string
    target_audience: 'student' | 'employee'
    is_active?: boolean
    display_date?: string
}

export type UpdateNewsInput = Partial<CreateNewsInput>

export async function getNews(audience: 'student' | 'employee') {
    const supabase = await createClient()
    const today = formatLocalDate(new Date())

    const { data, error } = await supabase
        .from('news')
        .select('*')
        .eq('target_audience', audience)
        .eq('is_active', true)
        .lte('display_date', today)
        .order('display_date', { ascending: false })

    if (error) {
        console.error('Error fetching news:', error)
        return []
    }

    return data as NewsItem[]
}

export async function getAllNews() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('news')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching all news:', error)
        return []
    }

    return data as NewsItem[]
}

export async function createNews(input: CreateNewsInput) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('news')
        .insert([{
            ...input,
            display_date: input.display_date || formatLocalDate(new Date())
        }])
        .select()
        .single()

    if (error) {
        console.error('Error creating news:', error)
        throw new Error('Failed to create news')
    }

    revalidatePath('/admin/settings/news')
    revalidatePath('/kiosk')
    return data as NewsItem
}

export async function updateNews(id: string, input: UpdateNewsInput) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('news')
        .update({
            ...input,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

    if (error) {
        console.error('Error updating news:', error)
        throw new Error('Failed to update news')
    }

    revalidatePath('/admin/settings/news')
    revalidatePath('/kiosk')
    return data as NewsItem
}

export async function deleteNews(id: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('news')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Error deleting news:', error)
        throw new Error('Failed to delete news')
    }

    revalidatePath('/admin/settings/news')
    revalidatePath('/kiosk')
}
