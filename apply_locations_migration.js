const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const migrationSQL = `
-- Create locations table for managing shift locations
create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_default boolean default false,
  is_active boolean default true,
  sort_order int,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Insert default locations (only if not exists)
insert into locations (name, is_default, is_active, sort_order) 
select * from (values
  ('taniyama', true, true, 1),
  ('shimoarata', true, true, 2),
  ('hanauta', true, true, 3),
  ('academy', true, true, 4)
) as t(name, is_default, is_active, sort_order)
where not exists (select 1 from locations where name = t.name);

-- Create index for faster lookups
create index if not exists idx_locations_active on locations(is_active) where is_active = true;
`;

(async () => {
    try {
        console.log('Applying locations table migration...')

        // Execute each statement separately
        const statements = migrationSQL.split(';').filter(s => s.trim())

        for (const statement of statements) {
            const trimmed = statement.trim()
            if (!trimmed || trimmed.startsWith('--')) continue

            const { error } = await supabase.rpc('exec_sql', { sql_query: trimmed })
            if (error) {
                console.error('Error executing statement:', error)
                // Try direct query if RPC fails
                const { error: queryError } = await supabase.from('_raw_sql').select(trimmed)
                if (queryError) {
                    console.error('Query error:', queryError)
                }
            }
        }

        // Verify the table was created by trying to fetch from it
        const { data, error } = await supabase
            .from('locations')
            .select('*')
            .limit(1)

        if (error) {
            console.error('Verification failed:', error.message)
            console.log('\n⚠️  Migration may have failed. Please apply it manually in Supabase SQL Editor.')
            console.log('SQL to run:\n')
            console.log(migrationSQL)
        } else {
            console.log('✅ Migration applied successfully!')
            console.log(`Found ${data?.length || 0} locations in table`)
        }

    } catch (err) {
        console.error('Migration error:', err)
        process.exit(1)
    }
})()
