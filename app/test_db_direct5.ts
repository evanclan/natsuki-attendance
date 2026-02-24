import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function check() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Wait... if EMP002 DOES have a shift on 2/24 but my earlier query failed? 
    // Let's check shifts for EMP002 on 2/24 explicitly again, maybe I had a typo.
    const { data: person } = await supabase.from('people').select('id, code').eq('code', 'EMP002').single()
    const { data: shifts } = await supabase.from('shifts').select('*').eq('person_id', person?.id).in('date', ['2026-02-24', '2026-02-26', '2026-02-25'])
    console.log("Shifts on 24/25/26:", shifts)
}

check()
