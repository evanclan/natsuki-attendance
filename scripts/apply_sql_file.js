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

const filename = process.argv[2];
if (!filename) {
    console.error('Usage: node scripts/apply_sql_file.js <path_to_sql_file>');
    process.exit(1);
}

async function applySql() {
    try {
        const sql = fs.readFileSync(filename, 'utf8');
        console.log(`Applying SQL from ${filename}...`);

        // Try exec_sql
        let response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseServiceKey,
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({ sql })
        });

        if (response.ok) {
            console.log('✓ Applied via exec_sql');
            return;
        }

        console.log('exec_sql failed, trying exec...');
        // Try exec
        response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseServiceKey,
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({ query: sql })
        });

        if (response.ok) {
            console.log('✓ Applied via exec');
            return;
        }

        console.error('Failed to apply SQL. Response:', await response.text());
        process.exit(1);

    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

applySql();
