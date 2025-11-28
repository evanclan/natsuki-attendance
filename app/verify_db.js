const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://xanzugmucsacwzyhgpcn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhhbnp1Z211Y3NhY3d6eWhncGNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MTE4MjMsImV4cCI6MjA3OTE4NzgyM30.ClUKHa-tAjM-4QZVr0cMUTcWkJnIpeeaJiAkuFW8mSk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function verify() {
    console.log('Querying people table...')
    const { data, error } = await supabase
        .from('people')
        .select('role')

    if (error) {
        console.error('Error querying Supabase:', error)
        return
    }

    if (!data) {
        console.log('No data returned.')
        return
    }

    const employees = data.filter(p => p.role === 'employee').length
    const students = data.filter(p => p.role === 'student').length

    console.log(`Employees: ${employees}`)
    console.log(`Students: ${students}`)
}

verify()
