const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'app/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
    console.log('Creating system_events table...');

    // We can't run raw SQL easily with supabase-js client unless we use rpc or just use the table methods if it exists.
    // But since the error is "table not found", we can't use table methods.
    // We will try to use the postgres connection if available, or just use the `rpc` if there is a `exec_sql` function (common in some setups), 
    // but standard supabase doesn't have it enabled by default.

    // However, the user has `emergency_clear.sql`. I can try to run that via a command if `psql` is available.
    // Let's check if `psql` is available.

    console.log('Checking if table exists...');
    const { data, error } = await supabase.from('system_events').select('count', { count: 'exact', head: true });

    if (error) {
        console.error('Error checking table:', error);
        if (error.code === '42P01') { // undefined_table
            console.log('Table does not exist. Please run the migration manually or restart the Supabase local instance.');
        }
    } else {
        console.log('Table exists!');

        // If table exists but schema cache is stale, we can try to reload it.
        // Usually restarting the server helps, or making a request that forces a refresh.
        console.log('Table exists. The error might be due to schema cache.');
    }
}

run();
