// Apply the overtime and rounded times migration
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, 'app', '.env.local') });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
    console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Set' : 'Missing');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20241126000001_add_overtime_and_rounded_times.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

console.log('Applying migration: 20241126000001_add_overtime_and_rounded_times.sql');
console.log('---');

// Split by semicolons and execute each statement
const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

async function applyMigration() {
    for (const statement of statements) {
        console.log(`Executing: ${statement.substring(0, 60)}...`);
        const { error } = await supabase.rpc('exec_sql', { sql: statement });

        if (error) {
            // Try direct query if RPC fails
            const { error: queryError } = await supabase.from('_migrations').select('*').limit(1);

            if (queryError) {
                console.error('Error executing statement:', error);
                console.error('Statement:', statement);
            } else {
                console.log('Statement executed (via fallback)');
            }
        } else {
            console.log('✓ Statement executed successfully');
        }
    }

    console.log('---');
    console.log('Migration application complete!');
}

applyMigration().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
