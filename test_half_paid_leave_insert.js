// Test scenario for half paid leave with work hours
// Run with: node test_half_paid_leave_insert.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zndypnuznhaxsqcfcphs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuZHlwbnV6bmhheHNxY2ZjcGhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIyMjU3MzEsImV4cCI6MjA0NzgwMTczMX0.OT_ECkGDhw4L3Fk1fHr-k9wTiWNJnP0rWxjUVMRmcJE';

async function insertTestAttendance() {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get person_id for EMP002 (Sarah Johnson)
    const { data: person, error: personError } = await supabase
        .from('people')
        .select('id')
        .eq('code', 'EMP002')
        .single();

    if (personError) {
        console.error('Error fetching person:', personError);
        return;
    }

    console.log('Person ID:', person.id);

    // Insert attendance record with check-in at 12:55 PM and check-out at 4:05 PM
    const checkInTime = new Date('2025-11-29T12:55:00+09:00').toISOString();
    const checkOutTime = new Date('2025-11-29T16:05:00+09:00').toISOString();

    const { data: attendance, error: attendanceError } = await supabase
        .from('attendance_days')
        .upsert({
            person_id: person.id,
            date: '2025-11-29',
            check_in_at: checkInTime,
            check_out_at: checkOutTime,
            status: 'present',
            total_work_minutes: 0, // Will be calculated by trigger
            total_break_minutes: 0,
            paid_leave_minutes: 0, // Will be calculated
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'person_id,date'
        })
        .select();

    if (attendanceError) {
        console.error('Error inserting attendance:', attendanceError);
        return;
    }

    console.log('Inserted attendance:', attendance);

    // Fetch the attendance with shift data to verify
    const { data: result, error: fetchError } = await supabase
        .from('attendance_days')
        .select(`
            *,
            people!inner(code, full_name),
            shifts(shift_type, start_time, end_time)
        `)
        .eq('person_id', person.id)
        .eq('date', '2025-11-29')
        .single();

    if (fetchError) {
        console.error('Error fetching result:', fetchError);
        return;
    }

    console.log('\n=== Test Result ===');
    console.log('Employee:', result.people.code, '-', result.people.full_name);
    console.log('Date:', result.date);
    console.log('Shift Type:', result.shifts?.shift_type);
    console.log('Shift Times:', result.shifts?.start_time, '-', result.shifts?.end_time);
    console.log('Check In:', result.check_in_at);
    console.log('Check Out:', result.check_out_at);
    console.log('Work Minutes:', result.total_work_minutes, '=', (result.total_work_minutes / 60).toFixed(2), 'hours');
    console.log('Paid Leave Minutes:', result.paid_leave_minutes, '=', (result.paid_leave_minutes / 60).toFixed(2), 'hours');
    console.log('\nExpected: Work Hours = 3h, Paid Leave = 4h');
}

insertTestAttendance().catch(console.error);
