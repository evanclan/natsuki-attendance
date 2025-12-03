// Apply japanese_name migration directly using Supabase client
require('dotenv').config({ path: './app/.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyMigration() {
    console.log('Applying migration to add japanese_name column...\n');

    const sql = `
        ALTER TABLE people
        ADD COLUMN IF NOT EXISTS japanese_name text;
    `;

    try {
        // Execute SQL directly via REST API
        // Note: This RPC call might not exist or work depending on project setup, 
        // but based on previous script it seems to be a pattern.
        // If it fails, we'll try to just check if it worked (maybe user runs it manually?)
        // But actually, the previous script had a fallback to just check.
        // Let's try to use the same pattern.

        // Actually, let's try to use the 'rpc' if there is a generic exec_sql function exposed.
        // If not, we might need to rely on the user or use a different method.
        // But since I have the service role key, I might be able to just use it?
        // Supabase-js doesn't allow arbitrary SQL execution unless there's an RPC for it.

        // Let's try the fetch method from the previous script.
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
            console.log('RPC method not available or failed. Checking if column exists...');

            // Check if column exists by selecting it
            const { data, error } = await supabase
                .from('people')
                .select('japanese_name')
                .limit(1);

            if (error) {
                console.error('Column does not exist. Please run this SQL manually:');
                console.log(sql);
                process.exit(1);
            } else {
                console.log('✓ Column already exists!');
            }
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
