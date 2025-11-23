-- Debug script to check and manually clear today's attendance data
-- Run this to see what's in the database and clear if needed

-- Check today's date
SELECT current_date as today;

-- Check attendance_events for today
SELECT id, person_id, event_type, occurred_at::date as event_date, occurred_at
FROM attendance_events
WHERE occurred_at::date = current_date
ORDER BY occurred_at DESC;

-- Check attendance_days for today
SELECT id, person_id, date, check_in_at, check_out_at, status
FROM attendance_days
WHERE date = current_date;

-- MANUALLY CLEAR (uncomment to run):
-- DELETE FROM attendance_events WHERE occurred_at::date = current_date;
-- DELETE FROM attendance_days WHERE date = current_date;
