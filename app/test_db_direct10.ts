import { calculateDailyStats } from './src/app/actions/kiosk-utils'

// EMP021 shift is Flex Start 09:00 - End 18:00
const shift = {
    shift_type: "flex",
    start_time: "09:00:00",
    end_time: "18:00:00"
}

// 08:44 JST (UTC 23:44 array to prev day)
// Checkout 18:00 JST (09:00 UTC next day)
const checkIn = "2026-02-23T23:44:00+00:00"
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
