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
    const { data: person } = await supabase.from('people').select('*').eq('code', 'EMP002').single()
    console.log("Person EMP002 profile:", person)
    
    // Also check global settings table
    const { data: settings } = await supabase.from('app_settings').select('setting_key, setting_value')
    console.log("App Settings:", settings)
}

check()
