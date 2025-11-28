const { createClient } = require('@supabase/supabase-js')

// Use the same credentials as before (from .env.local)
const supabaseUrl = 'https://xanzugmucsacwzyhgpcn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhhbnp1Z211Y3NhY3d6eWhncGNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MTE4MjMsImV4cCI6MjA3OTE4NzgyM30.ClUKHa-tAjM-4QZVr0cMUTcWkJnIpeeaJiAkuFW8mSk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function seedAttendance() {
    console.log('Fetching users...')
    const { data: people, error: peopleError } = await supabase
        .from('people')
        .select('id, full_name')

    if (peopleError) {
        console.error('Error fetching people:', peopleError)
        return
    }

    console.log(`Found ${people.length} users. Generating logs...`)

    const dates = [
        new Date(Date.now() - 1000 * 60 * 60 * 24 * 1), // Yesterday
        new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
        new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
    ]

    for (const person of people) {
        console.log(`Processing ${person.full_name}...`)

        for (const dateObj of dates) {
            const dateStr = dateObj.toISOString().split('T')[0]

            // Create timestamps for 9 AM to 5 PM
            const checkInTime = new Date(dateStr + 'T09:00:00Z')
            const checkOutTime = new Date(dateStr + 'T17:00:00Z')

            // 1. Insert Attendance Day
            const { data: dayData, error: dayError } = await supabase
                .from('attendance_days')
                .insert({
                    person_id: person.id,
                    date: dateStr,
                    check_in_at: checkInTime.toISOString(),
                    check_out_at: checkOutTime.toISOString(),
                    status: 'present',
                    total_work_minutes: 480 - 60, // 8 hours - 1 hour break
                    total_break_minutes: 60
                })
                .select()
                .single()

            if (dayError) {
                console.error(`Error creating day for ${person.full_name} on ${dateStr}:`, dayError.message)
                continue
            }

            const dayId = dayData.id

            // 2. Insert Check-in Event
            const { error: event1Error } = await supabase
                .from('attendance_events')
                .insert({
                    person_id: person.id,
                    attendance_day_id: dayId,
                    event_type: 'check_in',
                    occurred_at: checkInTime.toISOString(),
                    source: 'kiosk'
                })

            if (event1Error) console.error('Error inserting check-in event:', event1Error.message)

            // 3. Insert Check-out Event
            const { error: event2Error } = await supabase
                .from('attendance_events')
                .insert({
                    person_id: person.id,
                    attendance_day_id: dayId,
                    event_type: 'check_out',
                    occurred_at: checkOutTime.toISOString(),
                    source: 'kiosk'
                })

            if (event2Error) console.error('Error inserting check-out event:', event2Error.message)
        }
    }

    console.log('Seeding complete!')
}

seedAttendance()
