// Update category name from Satasaurus to Satursaurus
require('dotenv').config({ path: './app/.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateCategoryName() {
    console.log('Updating category name from "Satasaurus" to "Satursaurus"...');

    // Update the category name
    const { data, error } = await supabase
        .from('categories')
        .update({ name: 'Satursaurus' })
        .eq('name', 'Satasaurus')
        .eq('for_role', 'student')
        .select();

    if (error) {
        console.error('❌ Error updating category:', error);
        process.exit(1);
    }

    if (data && data.length > 0) {
        console.log(`✅ Successfully updated ${data.length} category record(s)`);
        console.log('Updated category:', data);
    } else {
        console.log('ℹ️  No records found with name "Satasaurus". Category may already be updated or does not exist.');
    }

    // Also update any "Satasaurus Class" variant
    const { data: data2, error: error2 } = await supabase
        .from('categories')
        .update({ name: 'Satursaurus Class' })
        .eq('name', 'Satasaurus Class')
        .eq('for_role', 'student')
        .select();

    if (error2) {
        console.error('❌ Error updating "Satasaurus Class":', error2);
    } else if (data2 && data2.length > 0) {
        console.log(`✅ Successfully updated ${data2.length} "Satasaurus Class" record(s)`);
    }
}

updateCategoryName()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('❌ Script failed:', err);
        process.exit(1);
    });
