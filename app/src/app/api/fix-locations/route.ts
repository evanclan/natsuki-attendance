import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    const supabase = await createClient()

    try {
        const results = []

        // 3. Check system_events table
        const { data: events, error: eventError } = await supabase
            .from('system_events')
            .select('id, title, description')
            .or('title.ilike.%taniyama%,title.ilike.%shimoarata%,description.ilike.%taniyama%,description.ilike.%shimoarata%')
            .limit(100)

        if (!eventError && events) {
            for (const event of events) {
                let updated = false
                const updates: any = {}

                // Check title
                if (event.title && (event.title.includes('taniyama') || event.title.includes('shimoarata'))) {
                    updates.title = event.title
                        .replace(/taniyama/g, 'Taniyama')
                        .replace(/shimoarata/g, 'Shimoarata')
                        .replace(/hanauta/g, 'Hanauta')
                        .replace(/academy/g, 'Academy')
                    updated = true
                }

                // Check description
                if (event.description && (event.description.includes('taniyama') || event.description.includes('shimoarata'))) {
                    updates.description = event.description
                        .replace(/taniyama/g, 'Taniyama')
                        .replace(/shimoarata/g, 'Shimoarata')
                        .replace(/hanauta/g, 'Hanauta')
                        .replace(/academy/g, 'Academy')
                    updated = true
                }

                if (updated) {
                    const { error: updateEventError } = await supabase
                        .from('system_events')
                        .update(updates)
                        .eq('id', event.id)

                    results.push({
                        table: 'system_events',
                        id: event.id,
                        updates,
                        status: updateEventError ? 'failed' : 'success',
                        error: updateEventError?.message
                    })
                }
            }
        }

        return NextResponse.json({
            success: true,
            results
        })

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 })
    }
}
