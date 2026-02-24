import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function check() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Let's find EMP002's person ID explicitly, since they are the one testing
    const { data: person } = await supabase.from('people').select('id, code').eq('code', 'EMP002').single()
    console.log("Person EMP002:", person)

    if (person) {
        // Fetch their shifts for ANY time natively to see if they just don't have shifts
        const { data: shifts } = await supabase.from('shifts').select('*').eq('person_id', person.id)
        console.log(`Found ${shifts?.length || 0} shifts Total for EMP002`)
        console.log("Sample shifts:", shifts?.slice(0, 3))
    }
}

check()
