const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'app/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
    console.log('Checking shifts table structure...');

    // Try to insert a dummy record with shift_type to see if it errors
    // We'll use a transaction or just delete it immediately if it works, 
    // but actually just selecting it should be enough if we can inspect the error.

    // First, let's try to select the column from an existing record if any
    const { data: existing, error: selectError } = await supabase
        .from('shifts')
        .select('id, shift_type')
        .limit(1);

    if (selectError) {
        console.error('Error selecting shift_type:', selectError.message);
        if (selectError.message.includes('Could not find the \'shift_type\' column')) {
            console.log('CONFIRMED: The API does not see the column yet.');
        }
    } else {
        console.log('Success! The API can see the shift_type column.');
        console.log('Data sample:', existing);
    }
}

run();
