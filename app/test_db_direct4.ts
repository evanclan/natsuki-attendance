import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function check() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Checking the specific days the user mentioned in their image:
    // 2/24: Check-in 8:44, Check-out 18:00
    // 2/26: Check-in 8:45, Check-out 18:00
    // 2/27: Check-in 8:46, Check-out 18:00

    const { data: record } = await supabase.from('attendance_days').select('*').eq('date', '2026-02-24').order('created_at', { ascending: false }).limit(1).single()
    console.log("2/24 Record:", record)
    
    if (record) {
        const { data: shift } = await supabase.from('shifts').select('*').eq('person_id', record.person_id).eq('date', '2026-02-24').single()
        console.log("2/24 Shift:", shift)
    }

}

check()
