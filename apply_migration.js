const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './app/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    db: { schema: 'public' }
});

async function addColumn() {
    try {
        console.log('Attempting to add break_exceeded column...');

        // Use fetch to make direct SQL request to Supabase
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseServiceKey,
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                query: 'ALTER TABLE attendance_days ADD COLUMN IF NOT EXISTS break_exceeded BOOLEAN DEFAULT FALSE'
            })
        });

        if (!response.ok) {
            console.log('Direct RPC failed, trying alternative method...');

            // Alternative: Create a test record to trigger schema reload
            const { data: testData, error: testError } = await supabase
                .from('attendance_days')
                .select('*')
                .limit(1)
                .single();

            console.log('Please run the following SQL manually in Supabase SQL Editor:');
            console.log('\nALTER TABLE attendance_days ADD COLUMN IF NOT EXISTS break_exceeded BOOLEAN DEFAULT FALSE;');
            console.log('');

        } else {
            console.log('✓ Column added successfully');
        }

    } catch (err) {
        console.error('Error:', err.message);
        console.log('\n⚠️  Please run the following SQL manually in Supabase SQL Editor:\n');
        console.log('ALTER TABLE attendance_days ADD COLUMN IF NOT EXISTS break_exceeded BOOLEAN DEFAULT FALSE;\n');
    }
}

addColumn();
