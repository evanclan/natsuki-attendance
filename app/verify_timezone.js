
const utcDate = new Date().toISOString().split('T')[0];
const localDate = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
const timezoneOffset = new Date().getTimezoneOffset();

console.log('UTC Date (System uses this):', utcDate);
console.log('Local Date (User expects this):', localDate);
console.log('Timezone Offset (minutes):', timezoneOffset);
console.log('Current ISO String:', new Date().toISOString());
console.log('Current Local String:', new Date().toString());
