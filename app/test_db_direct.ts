import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { calculateDailyStats } from './src/app/actions/kiosk-utils'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function check() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: record, error: e1 } = await supabase.from('attendance_days').select('*').in('status', ['present']).order('created_at', { ascending: false }).limit(1).single()
    if (!record) return console.log("No record to test", e1)

    console.log("Testing with Record ID:", record.id, "Person ID:", record.person_id)

    // Fetch shift WITH the fix
    const { data: shift, error } = await supabase
        .from('shifts')
        .select('shift_type, start_time, end_time')
        .eq('person_id', record.person_id)
        .eq('date', record.date)
        .limit(1)
        .maybeSingle()
        
    console.log("Found Shift:", shift)

    // Run the calculation exactly as actions.ts does
    const calculation = calculateDailyStats(
        record.check_in_at,
        record.check_out_at,
        record.break_start_at,
        record.break_end_at,
        shift,
        record.total_break_minutes
    )

    console.log("\nCalculated Stats:")
    console.log(JSON.stringify(calculation, null, 2))
}

check()
