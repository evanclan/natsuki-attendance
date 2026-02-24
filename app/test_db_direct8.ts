const isoString = "2026-02-23T23:44:00+00:00" // 08:44 JST on 2/24

const date = new Date(isoString)
const localeStr = date.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' })
console.log("Locale String:", localeStr) // '2/24/2026, 8:44:00 AM'

const jstDate = new Date(localeStr) // Parses '2/24/2026, 8:44:00 AM' assuming LOCAL timezone, not JST!
console.log("Parsed Date toString():", jstDate.toString()) 
console.log("Hours (Local System):", jstDate.getHours()) // If server is UTC, this will be 8, but it represents 8:00 UTC, not 8:00 JST! Wait... if it's 8, the hours * 60 + min = 8 * 60 + 44 = 524 minutes from midnight.

const shiftStartStr = "09:00"
const [hours, minutes] = shiftStartStr.split(':').map(Number)
console.log("Shift Minutes:", hours * 60 + minutes) // 9 * 60 = 540

// 524 <= (540 - 15) ? 
// 524 <= 525 ? TRUE!

// OH. This means that if shift is 09:00, 08:44 is Early!
// BUT EMP002's shift was 08:00 (480 mins). 
// 524 > 480 ? TRUE! So it should have shown "Late"! 
// Let me double check if EMP002 had a modified shift on 2/24, or someone else did.
