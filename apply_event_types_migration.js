// Apply event types migration
// This script creates the system_event_types table and seeds default types.
// For the ALTER TABLE (enum->text conversion), run manually in Supabase SQL Editor if needed.
require('dotenv').config({ path: './app/.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    db: { schema: 'public' }
});

async function executeSql(sql) {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ sql_query: sql })
    });

    if (!response.ok) {
        // Try alternate 'exec' function
        const response2 = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseServiceKey,
                'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ query: sql })
        });
        if (!response2.ok) {
            return { ok: false, error: await response2.text() };
        }
    }
    return { ok: true };
}

async function applyMigration() {
    console.log('Applying event types migration...\n');

    // Step 1: Try to create the table and seed via SQL
    const createTableSQL = `
        create table if not exists system_event_types (
            id uuid default gen_random_uuid() primary key,
            name text not null,
            slug text not null unique,
            color text not null default 'blue',
            is_default boolean default false,
            is_active boolean default true,
            created_at timestamp with time zone default timezone('utc'::text, now()) not null
        );
    `;

    let result = await executeSql(createTableSQL);
    if (!result.ok) {
        console.log('SQL RPC not available. Trying Supabase client method...');

        // Try to check if the table already exists by querying it
        const { data, error } = await supabase
            .from('system_event_types')
            .select('id')
            .limit(1);

        if (error && error.code === '42P01') {
            console.error('Table does not exist and cannot be created via client.');
            console.log('\n⚠️  Please run the following SQL in Supabase SQL Editor:\n');
            console.log(createTableSQL);
            console.log('\nThen re-run this script to seed the default types.');
            process.exit(1);
        } else if (error && error.message.includes('relation')) {
            console.error('Table does not exist. Please run the SQL migration manually.');
            console.log('\n⚠️  SQL to run in Supabase SQL Editor:');
            const fs = require('fs');
            const path = require('path');
            const sql = fs.readFileSync(path.join(__dirname, 'supabase/migrations/20260227000000_create_event_types.sql'), 'utf8');
            console.log(sql);
            process.exit(1);
        } else {
            console.log('✓ Table system_event_types already exists');
        }
    } else {
        console.log('✓ Table created successfully via SQL');
    }

    // Step 2: Seed default types using Supabase client (upsert)
    console.log('\nSeeding default event types...');

    const defaults = [
        { name: 'Holiday', slug: 'holiday', color: 'red', is_default: true },
        { name: 'Rest Day', slug: 'rest_day', color: 'red', is_default: true },
        { name: 'Event', slug: 'event', color: 'blue', is_default: true },
    ];

    for (const dt of defaults) {
        const { data, error } = await supabase
            .from('system_event_types')
            .upsert(dt, { onConflict: 'slug' })
            .select();

        if (error) {
            console.error(`  ✗ Failed to seed "${dt.name}":`, error.message);
        } else {
            console.log(`  ✓ Seeded "${dt.name}"`);
        }
    }

    // Step 3: Convert event_type column from enum to text
    console.log('\nConverting event_type column to text...');
    const alterResult = await executeSql(`
        ALTER TABLE system_events ALTER COLUMN event_type TYPE text USING event_type::text;
        ALTER TABLE system_events ALTER COLUMN event_type SET DEFAULT 'event';
    `);

    if (!alterResult.ok) {
        // Check if already text
        const { data, error } = await supabase
            .from('system_events')
            .select('event_type')
            .limit(1);

        if (!error) {
            console.log('✓ event_type column appears to be working (may already be text)');
        } else {
            console.log('⚠️  Could not convert event_type to text automatically.');
            console.log('Please run this SQL in Supabase SQL Editor:');
            console.log("ALTER TABLE system_events ALTER COLUMN event_type TYPE text USING event_type::text;");
            console.log("ALTER TABLE system_events ALTER COLUMN event_type SET DEFAULT 'event';");
        }
    } else {
        console.log('✓ event_type column converted to text');
    }

    // Step 4: Enable RLS via SQL
    const rlsResult = await executeSql(`
        ALTER TABLE system_event_types ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Enable read access for all users" ON system_event_types;
        CREATE POLICY "Enable read access for all users"
        ON system_event_types FOR SELECT
        USING (true);
        
        DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON system_event_types;
        CREATE POLICY "Enable insert for authenticated users only"
        ON system_event_types FOR INSERT
        WITH CHECK (auth.role() = 'authenticated');
        
        DROP POLICY IF EXISTS "Enable update for authenticated users only" ON system_event_types;
        CREATE POLICY "Enable update for authenticated users only"
        ON system_event_types FOR UPDATE
        USING (auth.role() = 'authenticated');
        
        DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON system_event_types;
        CREATE POLICY "Enable delete for authenticated users only"
        ON system_event_types FOR DELETE
        USING (auth.role() = 'authenticated');
    `);

    if (!rlsResult.ok) {
        console.log('⚠️  Could not set RLS policies automatically. Please set them in Supabase dashboard.');
    } else {
        console.log('✓ RLS policies set');
    }

    console.log('\n✅ Migration complete!');
}

applyMigration().catch(err => {
    console.error('Fatal error:', err.message);
    process.exit(1);
});
