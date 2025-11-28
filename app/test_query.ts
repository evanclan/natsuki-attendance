
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xanzugmucsacwzyhgpcn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhhbnp1Z211Y3NhY3d6eWhncGNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MTE4MjMsImV4cCI6MjA3OTE4NzgyM30.ClUKHa-tAjM-4QZVr0cMUTcWkJnIpeeaJiAkuFW8mSk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
    const now = new Date()
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
    const today = jst.toISOString().split('T')[0]
    console.log('Today (JST):', today)

    // Test 1: Current Query Logic
    const { data: data1, error: error1 } = await supabase
        .from('people')
        .select(`
            id, 
            full_name, 
            attendance_today:attendance_days(
                status,
                date
            )
        `)
        .eq('role', 'student')
        .eq('attendance_days.date', today)

    if (error1) console.error('Error 1:', error1)
    console.log('Query 1 (With Filter) Count:', data1?.length)
    if (data1 && data1.length > 0) {
        console.log('Sample 1:', JSON.stringify(data1[0], null, 2))
    }

    // Test 2: Query WITHOUT filter (Left Join)
    const { data: data2, error: error2 } = await supabase
        .from('people')
        .select(`
            id, 
            full_name, 
            attendance_today:attendance_days(
                status,
                date
            )
        `)
        .eq('role', 'student')

    if (error2) console.error('Error 2:', error2)
    console.log('Query 2 (No Filter) Count:', data2?.length)
    if (data2 && data2.length > 0) {
        // Find someone with attendance
        const withAttendance = data2.find(p => p.attendance_today && p.attendance_today.length > 0)
        if (withAttendance) {
            console.log('Sample 2 (With Attendance):', JSON.stringify(withAttendance, null, 2))
        } else {
            console.log('Sample 2 (No Attendance):', JSON.stringify(data2[0], null, 2))
        }
    }
    // Test 3: Recent Logs Query (Simulated)
    // We'll manually run the same query logic as the server action to verify it returns 0 for old logs

    // Calculate start of today in UTC
    const jstStartOfDay = new Date(jst)
    jstStartOfDay.setUTCHours(0, 0, 0, 0)
    const utcStart = new Date(jstStartOfDay.getTime() - 9 * 60 * 60 * 1000)

    console.log('Filtering logs after (UTC):', utcStart.toISOString())

    const { data: logs, error: logsError } = await supabase
        .from('attendance_events')
        .select(`
            id,
            occurred_at
        `)
        .gte('occurred_at', utcStart.toISOString())
        .order('occurred_at', { ascending: false })
        .limit(20)

    if (logsError) console.error('Logs Error:', logsError)
    console.log('Recent Logs Count (Today Only):', logs?.length)
    if (logs && logs.length > 0) {
        console.log('Latest Log:', logs[0])
    }
}

test()
