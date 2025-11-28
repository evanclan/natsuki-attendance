// Add special_leave to shift_type enum in the database
// Run with: node add_special_leave_enum.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zndypnuznhaxsqcfcphs.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuZHlwbnV6bmhheHNxY2ZjcGhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjIyNTczMSwiZXhwIjoyMDQ3ODAxNzMxfQ.s-rtL0RZE_jhdeOE8hv7HEVoXwLaITrEP4Q0NbT-fAg';

async function addSpecialLeaveEnum() {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Adding special_leave to shift_type enum...\n');

    try {
        // Execute raw SQL to add the enum value
        const { data, error } = await supabase.rpc('exec_sql', {
            sql: "ALTER TYPE shift_type ADD VALUE IF NOT EXISTS 'special_leave';"
        });

        if (error) {
            // If the function doesn't exist, try direct execution
            console.log('exec_sql function not available, trying alternative method...\n');

            // Use Supabase's direct SQL execution
            const { error: directError } = await supabase
                .from('_supabase_migrations')
                .select('*')
                .limit(1); // Just to test connection

            if (!directError) {
                console.log('⚠️  Cannot execute raw SQL directly through Supabase client.');
                console.log('Please run this SQL manually in your Supabase SQL Editor:\n');
                console.log('ALTER TYPE shift_type ADD VALUE IF NOT EXISTS \'special_leave\';');
                console.log('\nOr use the Supabase CLI:');
                console.log('npx supabase db push\n');
            }
        } else {
            console.log('✅ Successfully added special_leave to shift_type enum!');
        }
    } catch (err) {
        console.error('Error:', err.message);
        console.log('\n📝 Manual steps to add special_leave:');
        console.log('1. Go to your Supabase project dashboard');
        console.log('2. Navigate to SQL Editor');
        console.log('3. Run this SQL:');
        console.log("   ALTER TYPE shift_type ADD VALUE IF NOT EXISTS 'special_leave';");
        console.log('4. Refresh your app\n');
    }
}

addSpecialLeaveEnum().catch(console.error);
