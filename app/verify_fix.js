
function getTodayJST() {
    const now = new Date()
    // Add 9 hours to get JST time represented as UTC
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
    return jst.toISOString().split('T')[0]
}

function getRange() {
    const now = new Date()
    const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000)
    const jstStartOfDay = new Date(jstNow)
    jstStartOfDay.setUTCHours(0, 0, 0, 0)

    // Convert back to UTC for the query
    const utcStart = new Date(jstStartOfDay.getTime() - 9 * 60 * 60 * 1000)
    const utcEnd = new Date(utcStart.getTime() + 24 * 60 * 60 * 1000)

    return { start: utcStart.toISOString(), end: utcEnd.toISOString() }
}

console.log('Current UTC Time:', new Date().toISOString());
console.log('Calculated JST Date:', getTodayJST());
console.log('JST Day Range (UTC):', getRange());
