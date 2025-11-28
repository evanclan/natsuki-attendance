// Recalculate existing attendance records with new rounding logic
require('dotenv').config({ path: './app/.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Import the rounding utilities
function roundTimeUp15(date) {
    const result = new Date(date);
    const minutes = result.getMinutes();
    const remainder = minutes % 15;

    if (remainder !== 0) {
        const minutesToAdd = 15 - remainder;
        result.setMinutes(minutes + minutesToAdd);
    }

    result.setSeconds(0, 0);
    return result;
}

function getRoundedCheckIn(checkInTime, shiftStartTime, checkInDate) {
    if (!shiftStartTime) {
        return roundTimeUp15(checkInTime);
    }

    const [hours, minutes] = shiftStartTime.split(':').map(Number);
    const shiftStart = new Date(checkInDate);
    shiftStart.setHours(hours, minutes, 0, 0);

    if (checkInTime <= shiftStart) {
        return shiftStart;
    } else {
        return roundTimeUp15(checkInTime);
    }
}

async function recalculateRecord(personCode, dateStr) {
    console.log(`\nRecalculating record for ${personCode} on ${dateStr}...`);

    // Get person
    const { data: person, error: personError } = await supabase
        .from('people')
        .select('id, full_name')
        .eq('code', personCode)
        .single();

    if (personError || !person) {
        console.error('Person not found:', personError);
        return;
    }

    console.log(`Found: ${person.full_name}`);

    // Get attendance record
    const { data: attendance, error: attError } = await supabase
        .from('attendance_days')
        .select('*')
        .eq('person_id', person.id)
        .eq('date', dateStr)
        .single();

    if (attError || !attendance) {
        console.error('Attendance record not found:', attError);
        return;
    }

    console.log('\nCurrent record:');
    console.log('  Raw check-in:', attendance.check_in_at);
    console.log('  Raw check-out:', attendance.check_out_at);
    console.log('  Total work minutes:', attendance.total_work_minutes);
    console.log('  Total work hours:', (attendance.total_work_minutes / 60).toFixed(2));

    // Get shift
    const { data: shift } = await supabase
        .from('shifts')
        .select('shift_type, start_time, end_time')
        .eq('person_id', person.id)
        .eq('date', dateStr)
        .single();

    if (shift) {
        console.log('\nShift info:');
        console.log('  Type:', shift.shift_type);
        console.log('  Start:', shift.start_time);
        console.log('  End:', shift.end_time);
    }

    // Calculate rounded times
    const checkIn = new Date(attendance.check_in_at);
    const checkOut = new Date(attendance.check_out_at);

    const roundedCheckIn = getRoundedCheckIn(
        checkIn,
        shift?.start_time,
        checkIn
    );

    // For check-out, if before shift end, use actual time (no early checkout rounding in this case since it's 6pm = shift end)
    const roundedCheckOut = checkOut;

    // Calculate work time
    const grossMinutes = Math.floor((roundedCheckOut.getTime() - roundedCheckIn.getTime()) / 60000);
    const breakMinutes = grossMinutes >= 360 ? 60 : 0;
    const totalWorkMinutes = Math.max(0, grossMinutes - breakMinutes);

    console.log('\nNEW calculation:');
    console.log('  Rounded check-in:', roundedCheckIn.toISOString());
    console.log('  Rounded check-out:', roundedCheckOut.toISOString());
    console.log('  Gross minutes:', grossMinutes);
    console.log('  Break minutes:', breakMinutes);
    console.log('  Total work minutes:', totalWorkMinutes);
    console.log('  Total work hours:', (totalWorkMinutes / 60).toFixed(2));

    // Update the record
    const { error: updateError } = await supabase
        .from('attendance_days')
        .update({
            rounded_check_in_at: roundedCheckIn.toISOString(),
            rounded_check_out_at: roundedCheckOut.toISOString(),
            total_work_minutes: totalWorkMinutes,
            total_break_minutes: breakMinutes
        })
        .eq('id', attendance.id);

    if (updateError) {
        console.error('\nError updating:', updateError);
    } else {
        console.log('\n✓ Record updated successfully!');
    }
}

// Recalculate for John Smith on Nov 3
recalculateRecord('EMP001', '2024-11-03')
    .then(() => {
        console.log('\nDone!');
        process.exit(0);
    })
    .catch(error => {
        console.error('Error:', error);
        process.exit(1);
    });
