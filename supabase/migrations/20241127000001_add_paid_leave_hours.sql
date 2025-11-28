-- Add paid_leave_hours column to shifts table
-- This allows admins to set custom hours for paid leave (e.g., 5, 6, 7, or 8 hours)
-- Half-paid leave remains fixed at 4 hours

ALTER TABLE shifts
ADD COLUMN IF NOT EXISTS paid_leave_hours DECIMAL(4,2) DEFAULT 8.0;

COMMENT ON COLUMN shifts.paid_leave_hours IS 'Number of paid leave hours (for paid_leave type only, default 8.0)';
