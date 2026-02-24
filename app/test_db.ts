import { createClient } from './src/utils/supabase/server'
import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function check() {
    const supabase = await createClient()
    const { data } = await supabase.from('attendance_days').select('date, total_work_minutes, overtime_minutes, check_in_at, check_out_at').order('date', { ascending: false }).limit(5)
    console.log(JSON.stringify(data, null, 2))
}
check()
