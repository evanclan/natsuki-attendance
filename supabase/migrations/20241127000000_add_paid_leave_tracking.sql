-- Add paid_leave_minutes column to track paid leave separately from work hours
-- This ensures paid/half-paid leave (8h/4h) doesn't count as working hours
-- but is still recorded for payroll and reporting purposes

ALTER TABLE attendance_days
ADD COLUMN IF NOT EXISTS paid_leave_minutes INTEGER DEFAULT 0;

COMMENT ON COLUMN attendance_days.paid_leave_minutes IS 'Minutes of paid/half-paid leave (not counted as work hours, tracked for payroll)';
