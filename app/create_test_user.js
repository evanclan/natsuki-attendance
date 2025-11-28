// Script to create a test admin user in Supabase
// Run with: node create_test_user.js

const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY // You'll need to add this to .env.local

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables!')
    console.log('Please add SUPABASE_SERVICE_ROLE_KEY to your .env.local file')
    console.log('You can find it in: Supabase Dashboard > Settings > API > service_role key')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

async function createTestUser() {
    console.log('🔄 Creating test admin user...')

    const { data, error } = await supabase.auth.admin.createUser({
        email: 'test@sample.com',
        password: 'admin123',
        email_confirm: true
    })

    if (error) {
        console.error('❌ Error creating user:', error.message)
        return
    }

    console.log('✅ Test user created successfully!')
    console.log('📧 Email:', data.user.email)
    console.log('🆔 User ID:', data.user.id)
    console.log('\nYou can now login with:')
    console.log('  Email: test@sample.com')
    console.log('  Password: admin123')
}

createTestUser()
