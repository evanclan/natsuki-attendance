import { updateAttendanceRecord } from './src/app/admin/attendance-actions/actions'
import { createClient } from './src/utils/supabase/server'
import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function check() {
    const supabase = await createClient()

    // 1. Get an existing attendance record to test with
    const { data: record } = await supabase.from('attendance_days').select('*').in('status', ['present']).limit(1).single()
    if (!record) return console.log("No record to test")

    console.log("Testing with Record ID:", record.id, "Person ID:", record.person_id)

    // Simulate an edit from the UI
    const payload = {
        check_in_at: "2026-02-24T00:44:00+00:00", // 9:44 JST
        check_out_at: "2026-02-24T10:00:00+00:00", // 19:00 JST
        break_start_at: null,
        break_end_at: null,
        status: "present"
    }

    // Attempt update
    const res = await updateAttendanceRecord(record.id, record.person_id, payload)
    console.log("Update Result:", res)

    // Verify DB
    const { data: updated } = await supabase.from('attendance_days').select('overtime_minutes').eq('id', record.id).single()
    console.log("DB Overtime Mins:", updated?.overtime_minutes)
}

check()
