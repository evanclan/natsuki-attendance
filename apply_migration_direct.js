// Apply migration directly using Supabase client
require('dotenv').config({ path: './app/.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyMigration() {
    console.log('Applying migration to add overtime and rounded time columns...\n');

    const sql = `
        ALTER TABLE attendance_days
        ADD COLUMN IF NOT EXISTS overtime_minutes int DEFAULT 0,
        ADD COLUMN IF NOT EXISTS rounded_check_in_at timestamptz,
        ADD COLUMN IF NOT EXISTS rounded_check_out_at timestamptz;
    `;

    try {
        // Execute SQL directly via REST API
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
            // Try alternative method using pg library if available
            console.log('RPC method not available, trying direct execution...');

            // For now, let's just verify if columns exist
            const { data, error } = await supabase
                .from('attendance_days')
                .select('overtime_minutes, rounded_check_in_at, rounded_check_out_at')
                .limit(1);

            if (error) {
                console.error('Columns do not exist. Migration SQL:');
                console.log(sql);
                console.log('\nPlease run this SQL manually in your Supabase SQL Editor.');
                process.exit(1);
            } else {
                console.log('✓ Columns already exist!');
            }
        } else {
            console.log('✓ Migration applied successfully!');
        }
    } catch (error) {
        console.error('Error:', error.message);
        console.log('\nPlease run this SQL manually in Supabase SQL Editor:');
        console.log(sql);
    }
}

applyMigration()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
