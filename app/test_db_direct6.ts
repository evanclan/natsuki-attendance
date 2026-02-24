import { calculateDailyStats } from './src/app/actions/kiosk-utils'

// Shift for EMP002 on 2/24 is 08:00 - 17:00
// Test user input: Check-in 08:44 (which is 23:44 UTC previous day), Check-out 18:00 (which is 09:00 UTC)

const shift = {
    shift_type: "work",
    start_time: "08:00:00",
    end_time: "17:00:00"
}

// Emulate exactly what the DB stores for 8:44 JST on 2/24 -> 2026-02-23T23:44:00+00:00
const checkIn = "2026-02-23T23:44:00+00:00"
// Emulate exactly what the DB stores for 18:00 JST on 2/24 -> 2026-02-24T09:00:00+00:00
const checkOut = "2026-02-24T09:00:00+00:00"

const result = calculateDailyStats(
    checkIn,
    checkOut,
    null,
    null,
    shift
);

console.log("\nCalculated Stats:")
console.log(JSON.stringify(result, null, 2))
