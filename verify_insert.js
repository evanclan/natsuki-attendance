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
    console.log('Attempting to insert a test event...');

    const testEvent = {
        title: 'Test Event',
        description: 'Verifying schema cache',
        event_date: new Date().toISOString().split('T')[0],
        event_type: 'event',
        is_holiday: false
    };

    const { data, error } = await supabase
        .from('system_events')
        .insert([testEvent])
        .select()
        .single();

    if (error) {
        console.error('Insert failed:', error);
        process.exit(1);
    }

    console.log('Insert successful:', data);

    // Clean up
    await supabase.from('system_events').delete().eq('id', data.id);
    console.log('Cleaned up test event.');
}

run();
