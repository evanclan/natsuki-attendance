import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xanzugmucsacwzyhgpcn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhhbnp1Z211Y3NhY3d6eWhncGNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MTE4MjMsImV4cCI6MjA3OTE4NzgyM30.ClUKHa-tAjM-4QZVr0cMUTcWkJnIpeeaJiAkuFW8mSk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
    const { data: cols, error: colsError } = await supabase
        .from('people')
        .select('*')
        .limit(1)

    console.log('Columns:', cols ? Object.keys(cols[0]) : colsError)

    const { data: emps, error } = await supabase
        .from('people')
        .select('*')
        .eq('role', 'employee')
        

    if (error) console.error('Error:', error)
    console.log('Employees Check:');
    emps?.forEach(e => console.log(e.id, e.employee_code, e.full_name, e.order_number, e.sort_order, e.created_at))
}

test()
