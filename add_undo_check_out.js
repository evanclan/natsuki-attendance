// Apply undo_check_out migration directly using Supabase client
require('dotenv').config({ path: './app/.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyMigration() {
    console.log('Applying migration to add undo_check_out to enum...\n');

    const sql = `
        ALTER TYPE attendance_event_type ADD VALUE IF NOT EXISTS 'undo_check_out';
    `;

    try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
                'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sql })
        });

        if (!response.ok) {
            console.log('RPC method not available or failed. Checking if enum value works by creating a dummy event...');
            // Fallback: we cannot easily check if enum value exists without querying pg_enum which requires permissions.
            // But we can just try to insert?
            // Actually, let's just assume failure means "Run SQL manually".
            console.error('RPC failed. You might need to run this SQL manually in Supabase Dashboard -> SQL Editor:');
            console.log(sql);

            // Try to log the error text
            const text = await response.text();
            console.error('Response:', text);
        } else {
            console.log('✓ Migration applied successfully!');
        }
    } catch (error) {
        console.error('Error:', error.message);
        console.log('\nPlease run this SQL manually:');
        console.log(sql);
    }
}

applyMigration()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
