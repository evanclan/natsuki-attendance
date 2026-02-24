import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function check() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: person } = await supabase.from('people').select('id, code').eq('code', 'EMP021').single()
    console.log("Person EMP021:", person)

    if (person) {
        const { data: shifts } = await supabase.from('shifts').select('*').eq('person_id', person.id).in('date', ['2026-02-24', '2026-02-26', '2026-02-27'])
        console.log(`Found ${shifts?.length || 0} shifts Total for EMP021 on these dates`)
        console.log("Shifts:", shifts)
        
        const { data: attendance } = await supabase.from('attendance_days').select('*').eq('person_id', person.id).in('date', ['2026-02-24', '2026-02-26', '2026-02-27'])
        console.log("Attendance:", attendance)
    }
}

check()
