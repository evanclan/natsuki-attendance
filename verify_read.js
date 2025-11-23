const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'app/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
    console.log('Attempting to read from attendance_events...');
    const { data, error } = await supabase.from('attendance_events').select('count', { count: 'exact', head: true });

    if (error) {
        console.error('Read failed:', error);
    } else {
        console.log('Read successful. Count:', data);
    }
}

run();
