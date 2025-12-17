
import { calculateDailyStats } from './app/src/app/actions/kiosk-utils.ts';

const checkInStr = '2025-12-12T08:58:00.000Z'; // 08:58 (assuming ISO/UTC for simplicity, but logic uses local time components extracted via Date object which might be tricky if TZ differs. Let's assume local time matches or I need to be careful with TZ)
// Wait, the utils use `date.getMinutes()`, which uses local time of the server/runner.
// I should construct Dates carefully.

// Let's assume input strings are ISO strings.
// The code uses `new Date(string)`.
// If I use "2025-12-12T08:58:00" (no Z), it might be treated as local.

// User said 12/12 Friday.
const dateStr = '2025-12-12';
const checkIn = new Date(`${dateStr}T08:58:00`);
const checkOut = new Date(`${dateStr}T18:10:00`);

const shift = {
    shift_type: 'work',
    start_time: '09:00',
    end_time: '18:00'
};

console.log('Testing with:');
console.log('CheckIn:', checkIn.toISOString());
console.log('CheckOut:', checkOut.toISOString());
console.log('Shift:', shift);

// Mocking imports is hard in a simple script if I can't just run it. 
// I'll copy the relevant functions into the script to be self-contained for testing.

function roundTimeUp15(date: Date): Date {
    const result = new Date(date)
    const minutes = result.getMinutes()
    const remainder = minutes % 15

    if (remainder !== 0) {
        const minutesToAdd = 15 - remainder
        result.setMinutes(minutes + minutesToAdd)
    }

    result.setSeconds(0, 0)
    return result
}

function roundTimeDown15(date: Date): Date {
    const result = new Date(date)
    const minutes = result.getMinutes()
    const remainder = minutes % 15

    if (remainder !== 0) {
        result.setMinutes(minutes - remainder)
    }

    result.setSeconds(0, 0)
    return result
}

function getRoundedCheckIn(
    checkInTime: Date,
    shiftStartTime: string | undefined,
    checkInDate: Date
): Date {
    if (!shiftStartTime) {
        return roundTimeUp15(checkInTime)
    }

    const [hours, minutes] = shiftStartTime.split(':').map(Number)
    const shiftStart = new Date(checkInDate)
    shiftStart.setHours(hours, minutes, 0, 0)

    if (checkInTime <= shiftStart) {
        return shiftStart
    } else {
        return roundTimeUp15(checkInTime)
    }
}

function getRoundedCheckOut(
    checkOutTime: Date,
    shiftEndTime: string | undefined,
    checkOutDate: Date
): { roundedCheckOut: Date; overtimeMinutes: number } {
    if (!shiftEndTime) {
        return {
            roundedCheckOut: roundTimeDown15(checkOutTime),
            overtimeMinutes: 0
        }
    }

    const [hours, minutes] = shiftEndTime.split(':').map(Number)
    const shiftEnd = new Date(checkOutDate)
    shiftEnd.setHours(hours, minutes, 0, 0)

    if (checkOutTime <= shiftEnd) {
        return {
            roundedCheckOut: roundTimeDown15(checkOutTime),
            overtimeMinutes: 0
        }
    } else {
        const roundedCheckOut = roundTimeDown15(checkOutTime)
        const overtimeMs = roundedCheckOut.getTime() - shiftEnd.getTime()
        const overtimeMinutes = Math.max(0, Math.floor(overtimeMs / 60000))

        return {
            roundedCheckOut: shiftEnd,
            overtimeMinutes: overtimeMinutes
        }
    }
}

function calculateDailyStats_Copied(
    checkInAt: string,
    checkOutAt: string,
    shift: any
) {
    const checkIn = new Date(checkInAt)
    const checkOut = new Date(checkOutAt)

    const roundedCheckIn = getRoundedCheckIn(
        checkIn,
        shift?.start_time,
        checkIn
    )

    const { roundedCheckOut, overtimeMinutes } = getRoundedCheckOut(
        checkOut,
        shift?.end_time,
        checkOut
    )

    console.log('Rounded CheckIn:', roundedCheckIn.toISOString());
    console.log('Rounded CheckOut (Internal):', roundedCheckOut.toISOString());
    console.log('Overtime Minutes:', overtimeMinutes);

    let grossMinutes = Math.floor((roundedCheckOut.getTime() - roundedCheckIn.getTime()) / 60000)
    if (grossMinutes < 0) grossMinutes = 0

    console.log('Gross Minutes:', grossMinutes);

    let applicableBreakMinutes = 0
    if (grossMinutes >= 360) {
        applicableBreakMinutes = 60
    }

    console.log('Break Minutes:', applicableBreakMinutes);

    const totalWorkMinutes = Math.max(0, grossMinutes - applicableBreakMinutes) + overtimeMinutes

    console.log('Total Work Minutes:', totalWorkMinutes);
    console.log('Total Work Hours:', totalWorkMinutes / 60);
}

calculateDailyStats_Copied(
    checkIn.toISOString(),
    checkOut.toISOString(),
    shift
);
