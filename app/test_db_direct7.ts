const getMinutesFromMidnightJST = (isoString: string) => {
    const date = new Date(isoString)
    const jstDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }))
    return jstDate.getHours() * 60 + jstDate.getMinutes()
}

// EMP002, 2/24 Check-in is 2026-02-24T01:30:47.224+00:00 (which is 10:30 JST)
console.log("10:30 JST check_in_at:", getMinutesFromMidnightJST("2026-02-24T01:30:47.224+00:00"))

// Wait, the user screenshot showed 8:44 JST arriving 15m before 9:00 shift. 
// If EMP002's shift is 8:00, then the screenshot must have been another person or another day!
