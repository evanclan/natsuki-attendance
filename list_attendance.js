// Find and list all attendance records for John Smith (EMP001)
require('dotenv').config({ path: './app/.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listRecords() {
    // Get person
    const { data: person } = await supabase
        .from('people')
        .select('id, full_name, code')
        .eq('code', 'EMP001')
        .single();

    if (!person) {
        console.log('Person not found');
        return;
    }

    console.log(`Found: ${person.full_name} (${person.code})\n`);

    // Get all attendance records
    const { data: records } = await supabase
        .from('attendance_days')
        .select('*')
        .eq('person_id', person.id)
        .order('date', { ascending: false });

    if (!records || records.length === 0) {
        console.log('No attendance records found');
        return;
    }

    console.log(`Found ${records.length} attendance records:\n`);

    records.forEach((rec, idx) => {
        const date = new Date(rec.date);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        const dateStr = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

        console.log(`${idx + 1}. ${dayName}, ${dateStr}`);
        console.log(`   Date: ${rec.date}`);
        console.log(`   Check-in: ${rec.check_in_at ? new Date(rec.check_in_at).toLocaleTimeString() : 'N/A'}`);
        console.log(`   Check-out: ${rec.check_out_at ? new Date(rec.check_out_at).toLocaleTimeString() : 'N/A'}`);
        console.log(`   Work hours: ${(rec.total_work_minutes / 60).toFixed(2)}`);
        console.log(`   Rounded check-in: ${rec.rounded_check_in_at || 'NOT SET'}`);
        console.log('');
    });
}

listRecords()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('Error:', error);
        process.exit(1);
    });
