
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load env from app/.env.local
dotenv.config({ path: path.resolve(__dirname, '../app/.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function clearDatabase() {
    console.log('Clearing database...')

    // Delete in order to respect foreign keys
    const tables = [
        'attendance_days',
        'shifts',
        'system_events',
        'people'
    ]

    for (const table of tables) {
        console.log(`Deleting from ${table}...`)
        const { error } = await supabase.from(table).delete().neq('id', 0) // neq id 0 is a hack to delete all rows if no better way
        // Actually .delete().neq('id', -1) or similar is better. Or .delete().gte('id', 0) if id is int.
        // For UUIDs, we can use .neq('id', '00000000-0000-0000-0000-000000000000')
        // Or just .not('id', 'is', null)

        // Supabase delete requires a filter.
        // Let's try .neq('id', 0) for int ids, or .neq('id', '00000000-0000-0000-0000-000000000000') for uuids.
        // Inspecting people table showed UUIDs.

        // Let's use a safer "delete all" approach if possible, or just a condition that is always true.
        // .gt('created_at', '1970-01-01') might work if created_at exists.

        // Let's try fetching all IDs and deleting them if bulk delete isn't easy.
        // But bulk delete with a broad condition is better.

        let deleteQuery = supabase.from(table).delete()

        if (table === 'attendance_days' || table === 'shifts') {
            deleteQuery = deleteQuery.gt('id', 0)
        } else {
            deleteQuery = deleteQuery.neq('id', '00000000-0000-0000-0000-000000000000')
        }

        const { error: deleteError } = await deleteQuery

        if (deleteError) {
            console.error(`Error deleting from ${table}:`, deleteError.message)
        } else {
            console.log(`Cleared ${table}`)
        }
    }

    console.log('Database cleared.')
}

clearDatabase()
