const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
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

async function applyMigration() {
    try {
        console.log('Applying news table migration...');

        const migrationPath = path.join(__dirname, 'supabase/migrations/20251203153000_create_news_table.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        // Split by semicolon to execute statements individually if needed, 
        // but Supabase RPC usually handles blocks. 
        // However, for safety with pg extensions or complex blocks, simple split might be fragile.
        // Let's try executing the whole block first.

        const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

        // If exec_sql RPC doesn't exist (it's a custom function often added), 
        // we might need to use the direct SQL API if enabled or just raw query if the client supports it (it doesn't usually).
        // The previous script used a direct fetch to /rest/v1/rpc/exec which implies a custom function or extension.
        // Let's try the fetch method from the previous script as it seemed to be the preferred way.

        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseServiceKey,
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                sql_query: sql
            })
        });

        if (!response.ok) {
            // Fallback: try without RPC if it's just a standard query, but Supabase JS client doesn't do raw SQL easily.
            // Let's try the 'exec' function name seen in apply_migration.js
            const response2 = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseServiceKey,
                    'Authorization': `Bearer ${supabaseServiceKey}`,
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({
                    query: sql
                })
            });

            if (!response2.ok) {
                const text = await response2.text();
                throw new Error(`Migration failed: ${text}`);
            }
        }

        console.log('✓ Migration applied successfully');

    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

applyMigration();
