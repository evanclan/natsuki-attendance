// Batch update all attendance records missing rounded times
require('dotenv').config({ path: './app/.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

function roundTimeUp15(date) {
    const result = new Date(date);
    const minutes = result.getMinutes();
    const remainder = minutes % 15;
    if (remainder !== 0) {
        result.setMinutes(minutes + (15 - remainder));
    }
    result.setSeconds(0, 0);
    return result;
}
function roundTimeDown15(date) {
    const result = new Date(date);
    const minutes = result.getMinutes();
    const remainder = minutes % 15;
    if (remainder !== 0) {
        result.setMinutes(minutes - remainder);
    }
    result.setSeconds(0, 0);
    return result;
}

function getRoundedCheckIn(checkIn, shiftStart) {
    if (!shiftStart) {
        return roundTimeUp15(checkIn);
    }

    const [h, m] = shiftStart.split(':').map(Number);
    const shiftStartDate = new Date(checkIn);
    shiftStartDate.setHours(h, m, 0, 0);

    if (checkIn <= shiftStartDate) {
        return shiftStartDate;
    }
    return roundTimeUp15(checkIn);
}

async function updateAll() {
    // Get all records without rounded times
    const { data: records } = await supabase
        .from('attendance_days')
        .select('*, people(code, full_name)')
        // .is('rounded_check_in_at', null)
        .not('check_in_at', 'is', null)
        .not('check_out_at', 'is', null);

    if (!records || records.length === 0) {
        console.log('No records to update');
        return;
    }

    console.log(`Found ${records.length} records to update\n`);

    for (const rec of records) {
        // Get shift for this date
        const { data: shift } = await supabase
            .from('shifts')
            .select('shift_type, start_time, end_time')
            .eq('person_id', rec.person_id)
            .eq('date', rec.date)
            .single();

        // Calculate rounded times
        const checkIn = new Date(rec.check_in_at);
        const checkOut = new Date(rec.check_out_at);

        // Shift start/end
        let shiftStart = null;
        let shiftEnd = null;

        if (shift?.start_time) {
            const [h, m] = shift.start_time.split(':').map(Number);
            shiftStart = new Date(checkIn);
            shiftStart.setHours(h, m, 0, 0);
        }

        if (shift?.end_time) {
            const [h, m] = shift.end_time.split(':').map(Number);
            shiftEnd = new Date(checkOut);
            shiftEnd.setHours(h, m, 0, 0);
        }

        // Round Check-in
        let roundedCheckIn;
        if (shiftStart && checkIn <= shiftStart) {
            roundedCheckIn = shiftStart;
        } else {
            roundedCheckIn = roundTimeUp15(checkIn);
        }

        // Round Check-out & Overtime
        let roundedCheckOut;
        let overtimeMinutes = 0;

        if (shiftEnd) {
            if (checkOut <= shiftEnd) {
                // Early/On-time: Round down
                roundedCheckOut = roundTimeDown15(checkOut);
                overtimeMinutes = 0;
            } else {
                // Late: Round down checkout to nearest 15
                // Overtime = RoundedCheckout - ShiftEnd
                const roundedActualCheckOut = roundTimeDown15(checkOut);
                roundedCheckOut = shiftEnd; // Regular work stops at shift end

                const overtimeMs = roundedActualCheckOut.getTime() - shiftEnd.getTime();
                overtimeMinutes = Math.max(0, Math.floor(overtimeMs / 60000));
            }
        } else {
            // No shift end defined, just round down
            roundedCheckOut = roundTimeDown15(checkOut);
            overtimeMinutes = 0;
        }

        // Calculate Regular Work
        let grossMinutes = Math.floor((roundedCheckOut.getTime() - roundedCheckIn.getTime()) / 60000);
        if (grossMinutes < 0) grossMinutes = 0;

        // Break Logic
        const breakMinutes = grossMinutes >= 360 ? 60 : 0;

        // Total Work = Regular + Overtime
        const totalWorkMinutes = Math.max(0, grossMinutes - breakMinutes) + overtimeMinutes;

        console.log(`${rec.people.code} - ${rec.date}`);
        console.log(`  ${checkIn.toLocaleTimeString()} → ${roundedCheckIn.toLocaleTimeString()}`);
        console.log(`  Out: ${checkOut.toLocaleTimeString()} → ${roundedCheckOut.toLocaleTimeString()} (+${overtimeMinutes}m OT)`);
        console.log(`  Work: ${(totalWorkMinutes / 60).toFixed(2)}h`);

        await supabase
            .from('attendance_days')
            .update({
                rounded_check_in_at: roundedCheckIn.toISOString(),
                rounded_check_out_at: roundedCheckOut.toISOString(),
                total_work_minutes: totalWorkMinutes,
                total_break_minutes: breakMinutes,
                overtime_minutes: overtimeMinutes
            })
            .eq('id', rec.id);
    }

    console.log('\n✓ All records updated!');
}

updateAll()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
