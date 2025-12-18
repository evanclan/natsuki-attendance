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
        console.log('Attempting to add display_order column...');

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
                query: 'ALTER TABLE people ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0'
            })
        });

        if (!response.ok) {
            console.log('Direct RPC failed, trying alternative method...');
            // Alternative: Create a test record to trigger schema reload via side effect or just log manual instruction
            // But RPC exec is standard for Supabase if enabled.
            const errorText = await response.text();
            console.error('Failed:', errorText);

        } else {
            console.log('✓ Column added successfully');
        }

    } catch (err) {
        console.error('Error:', err.message);
    }
}

addColumn();
