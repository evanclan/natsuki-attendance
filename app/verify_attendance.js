const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://xanzugmucsacwzyhgpcn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhhbnp1Z211Y3NhY3d6eWhncGNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MTE4MjMsImV4cCI6MjA3OTE4NzgyM30.ClUKHa-tAjM-4QZVr0cMUTcWkJnIpeeaJiAkuFW8mSk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyAttendance() {
    console.log('Verifying attendance logs...')

    // Count days
    const { count: dayCount, error: dayError } = await supabase
        .from('attendance_days')
        .select('*', { count: 'exact', head: true })

    if (dayError) {
        console.error('Error counting days:', dayError)
    } else {
        console.log(`Total Attendance Days: ${dayCount}`)
    }

    // Count events
    const { count: eventCount, error: eventError } = await supabase
        .from('attendance_events')
        .select('*', { count: 'exact', head: true })

    if (eventError) {
        console.error('Error counting events:', eventError)
    } else {
        console.log(`Total Attendance Events: ${eventCount}`)
    }
}

verifyAttendance()
