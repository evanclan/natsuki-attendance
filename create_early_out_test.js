require('dotenv').config({ path: './app/.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createEarlyOutTest() {
    const date = '2025-11-26';
    const personCode = 'TEST001';

    // 1. Get Person ID
    const { data: person } = await supabase
        .from('people')
        .select('id')
        .eq('code', personCode)
        .single();

    if (!person) {
        console.error('Person not found');
        return;
    }

    // 2. Create/Update Shift (9:00 - 18:00)
    const { error: shiftError } = await supabase
        .from('shifts')
        .upsert({
            person_id: person.id,
            date: date,
            shift_type: 'work',
            start_time: '09:00',
            end_time: '18:00'
        }, { onConflict: 'person_id, date' });

    if (shiftError) console.error('Shift error:', shiftError);

    // 3. Create Attendance (Check-out 17:50)
    // 17:50 is 5:50 PM.
    // 17:50 rounded down is 17:45.
    // Early out logic should trigger because 17:50 < 18:00.

    // Use explicit timezone to avoid confusion
    const checkIn = `${date}T09:00:00+09:00`;
    const checkOut = `${date}T17:50:00+09:00`;

    const { error: attError } = await supabase
        .from('attendance_days')
        .upsert({
            person_id: person.id,
            date: date,
            check_in_at: checkIn,
            check_out_at: checkOut,
            // Pre-calculate rounded times for display (though system should recalculate)
            rounded_check_in_at: checkIn,
            rounded_check_out_at: `${date}T17:45:00+09:00`, // Rounded down
            total_work_minutes: 465, // 9:00-17:45 = 8h45m - 1h break = 7h45m = 465m
            total_break_minutes: 60,
            overtime_minutes: 0
        }, { onConflict: 'person_id, date' });

    if (attError) console.error('Attendance error:', attError);

    console.log('Created early out test record for TEST001 on', date);
}

createEarlyOutTest();
