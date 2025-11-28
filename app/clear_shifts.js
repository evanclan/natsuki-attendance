const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://xanzugmucsacwzyhgpcn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhhbnp1Z211Y3NhY3d6eWhncGNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MTE4MjMsImV4cCI6MjA3OTE4NzgyM30.ClUKHa-tAjM-4QZVr0cMUTcWkJnIpeeaJiAkuFW8mSk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function clearShifts() {
    console.log('Clearing all shifts...')

    // Delete all rows from 'shifts' table
    // Using gte('id', 0) to match all rows assuming standard auto-incrementing IDs
    const { error, count } = await supabase
        .from('shifts')
        .delete({ count: 'exact' })
        .gte('id', 0)

    if (error) {
        console.error('Error clearing shifts:', error)
    } else {
        console.log(`Successfully cleared ${count} shifts.`)
    }
}

clearShifts()
