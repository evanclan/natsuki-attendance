-- Add new values to shift_type enum
-- We cannot directly ALTER TYPE ... ADD VALUE inside a transaction block in some Postgres versions/configurations easily without committing.
-- However, Supabase migrations run in transactions.
-- The standard way is: ALTER TYPE shift_type ADD VALUE 'paid_leave';
-- But if we want to be safe and idempotent-ish or if we want to do it all at once:

ALTER TYPE shift_type ADD VALUE IF NOT EXISTS 'paid_leave';
ALTER TYPE shift_type ADD VALUE IF NOT EXISTS 'half_paid_leave';
ALTER TYPE shift_type ADD VALUE IF NOT EXISTS 'business_trip';
ALTER TYPE shift_type ADD VALUE IF NOT EXISTS 'flex';
