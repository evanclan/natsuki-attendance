import { createClient } from './src/utils/supabase/server'
import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function check() {
    const supabase = await createClient()

    // Assuming we're modifying Feb 24th, 2026 for the first person in DB
    const { data: record } = await supabase.from('attendance_days').select('*').in('status', ['present']).limit(1).single()
    if (!record) return console.log("No record to test")

    console.log("Testing with Record ID:", record.id, "Person ID:", record.person_id, "Date:", record.date)

    // Fetch shift
    const { data: shift, error } = await supabase
        .from('shifts')
        .select('shift_type, start_time, end_time')
        .eq('person_id', record.person_id)
        .eq('date', record.date)
        .single()
        
    console.log("Shift Fetch Error:", error?.message)
    console.log("Found Shift:", shift)
}

check()
