# Creating a Test Admin User in Supabase

## Method 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://xanzugmucsacwzyhgpcn.supabase.co
2. Navigate to **Authentication** → **Users**
3. Click **Add User** button
4. Fill in the form:
   - **Email**: test@sample.com
   - **Password**: admin123
   - **Auto Confirm User**: Check this box (important!)
5. Click **Create User**

## Method 2: Using SQL (Alternative)

If you prefer SQL, you can run this in the Supabase SQL Editor:

```sql
-- This creates a user with the specified email and password
-- Note: The password will be hashed automatically
SELECT auth.users 
FROM auth.users 
WHERE email = 'test@sample.com';

-- If no user exists, you need to use the Supabase Dashboard
-- as the auth.users table requires special functions to insert properly
```

**Important Notes:**
- The Supabase Auth table uses special triggers and functions that require the dashboard or admin SDK
- Direct SQL inserts to `auth.users` are not recommended and may not work properly
- The easiest method is using the Supabase Dashboard

## Method 3: Using Supabase CLI (Advanced)

If you have the Supabase CLI installed and linked to your project:

```bash
# This would require admin access via service role key
# Not recommended for test users
```

## After Creating the User

Once the test user is created, you can:
1. Navigate to http://localhost:3000/login
2. Enter credentials:
   - Email: test@sample.com
   - Password: admin123
3. Click "Sign In"
4. You should be redirected to the admin dashboard

## Testing Authentication Flow

Test these scenarios:
1. ✅ Access `/kiosk` without login → Should work
2. ✅ Access `/admin` without login → Should redirect to `/login`
3. ✅ Login with test credentials → Should redirect to `/admin`
4. ✅ Access `/admin` while logged in → Should work
5. ✅ Click logout → Should redirect to `/login`
6. ✅ Access `/login` while logged in → Should redirect to `/admin`
