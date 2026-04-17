import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xanzugmucsacwzyhgpcn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhhbnp1Z211Y3NhY3d6eWhncGNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MTE4MjMsImV4cCI6MjA3OTE4NzgyM30.ClUKHa-tAjM-4QZVr0cMUTcWkJnIpeeaJiAkuFW8mSk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
    const { data: emps, error } = await supabase
        .from('people')
        .select('*')
        .eq('role', 'employee')
        .order('display_order', { ascending: true })

    if (error) console.error('Error:', error)
    console.log('Employees Check (Sorted by display_order):');
    emps?.forEach(e => console.log(e.code, e.full_name, e.display_order))
}

test()
