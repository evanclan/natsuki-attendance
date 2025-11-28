// Clear all shift data for fresh testing
// Run with: node clear_shifts.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zndypnuznhaxsqcfcphs.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuZHlwbnV6bmhheHNxY2ZjcGhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjIyNTczMSwiZXhwIjoyMDQ3ODAxNzMxfQ.s-rtL0RZE_jhdeOE8hv7HEVoXwLaITrEP4Q0NbT-fAg';

async function clearShiftData() {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Clearing all shift data...\n');

    // Delete all shifts
    const { data: shifts, error: shiftError } = await supabase
        .from('shifts')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (using impossible condition to match all)

    if (shiftError) {
        console.error('Error deleting shifts:', shiftError);
    } else {
        console.log('✅ All shifts deleted successfully');
    }

    // Optional: Also clear attendance days if needed
    console.log('\nDo you want to clear attendance_days too? (Currently only clearing shifts)');
    console.log('To also clear attendance, uncomment the code below.\n');

    /*
    const { data: attendance, error: attendanceError } = await supabase
        .from('attendance_days')
        .delete()
        .neq('id', 0);
    
    if (attendanceError) {
        console.error('Error deleting attendance:', attendanceError);
    } else {
        console.log('✅ All attendance records deleted successfully');
    }
    */

    // Verify
    const { count: shiftCount } = await supabase
        .from('shifts')
        .select('*', { count: 'exact', head: true });

    console.log(`\nRemaining shifts: ${shiftCount || 0}`);
    console.log('✅ Shift data cleared. You can now create fresh test data.');
}

clearShiftData().catch(console.error);
