require('dotenv').config({ path: './app/.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCategories() {
    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('for_role', 'employee');

    if (error) console.error(error);
    else console.log(data);
}

checkCategories();
