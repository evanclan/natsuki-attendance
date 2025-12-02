const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedCategories() {
    console.log('Seeding categories...');

    const categories = [
        { name: 'fulltime', for_role: 'employee', sort_order: 10 },
        { name: 'partime', for_role: 'employee', sort_order: 20 },
    ];

    for (const cat of categories) {
        // Check if exists
        const { data: existing } = await supabase
            .from('categories')
            .select('id')
            .eq('name', cat.name)
            .eq('for_role', cat.for_role)
            .single();

        if (!existing) {
            const { error } = await supabase
                .from('categories')
                .insert(cat);

            if (error) {
                console.error(`Error inserting ${cat.name}:`, error.message);
            } else {
                console.log(`Inserted ${cat.name}`);
            }
        } else {
            console.log(`Category ${cat.name} already exists`);
        }
    }

    console.log('Done.');
}

seedCategories();
