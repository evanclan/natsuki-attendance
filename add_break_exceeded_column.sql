-- Run this SQL in Supabase SQL Editor to add the break_exceeded column
ALTER TABLE attendance_days ADD COLUMN IF NOT EXISTS break_exceeded BOOLEAN DEFAULT FALSE;

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'attendance_days' 
AND column_name = 'break_exceeded';
