const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './app/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyColumn() {
    try {
        // Try to select the new column
        const { data, error } = await supabase
            .from('attendance_days')
            .select('id, break_exceeded, total_work_minutes, total_break_minutes')
            .limit(5);

        if (error) {
            console.error('❌ Error checking column:', error);
            return;
        }

        console.log('✓ Migration successful! Column break_exceeded exists.');
        console.log('Sample data:', data);

    } catch (err) {
        console.error('Error:', err);
    }
}

verifyColumn();
