-- Add overtime tracking and rounded times to attendance_days
-- This migration adds columns to store:
-- 1. overtime_minutes: Minutes worked beyond scheduled shift end time
-- 2. rounded_check_in_at: Check-in time rounded according to business rules
-- 3. rounded_check_out_at: Check-out time rounded according to business rules

ALTER TABLE attendance_days
ADD COLUMN IF NOT EXISTS overtime_minutes int DEFAULT 0,
ADD COLUMN IF NOT EXISTS rounded_check_in_at timestamptz,
ADD COLUMN IF NOT EXISTS rounded_check_out_at timestamptz;

COMMENT ON COLUMN attendance_days.overtime_minutes IS 'Minutes worked beyond scheduled shift end time, rounded to 15-min intervals';
COMMENT ON COLUMN attendance_days.rounded_check_in_at IS 'Check-in time rounded according to business rules (late check-ins rounded UP to 15-min)';
COMMENT ON COLUMN attendance_days.rounded_check_out_at IS 'Check-out time rounded according to business rules (early checkout rounded DOWN, overtime rounded to 15-min)';
