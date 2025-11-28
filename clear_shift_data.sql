-- Clear all shift and attendance data to start fresh
-- This will delete ALL shifts and attendance records but keep people/employees

-- OPTION 1: Delete EVERYTHING (all months)
-- Uncomment these lines to delete all data:

-- DELETE FROM attendance_events;
-- DELETE FROM attendance_days;
-- DELETE FROM shifts;

-- OPTION 2: Delete only November 2025 data (recommended)
-- This keeps your older data intact

-- Delete attendance events for November 2025
DELETE FROM attendance_events
WHERE occurred_at >= '2025-11-01' AND occurred_at < '2025-12-01';

-- Delete attendance days for November 2025
DELETE FROM attendance_days
WHERE date >= '2025-11-01' AND date < '2025-12-01';

-- Delete shifts for November 2025
DELETE FROM shifts
WHERE date >= '2025-11-01' AND date < '2025-12-01';

-- Verify deletion
SELECT 'Attendance Days Remaining' as table_name, COUNT(*) as count FROM attendance_days
UNION ALL
SELECT 'Shifts Remaining', COUNT(*) FROM shifts
UNION ALL
SELECT 'Attendance Events Remaining', COUNT(*) FROM attendance_events;

-- Show remaining November data (should be 0 for Option 2)
SELECT 'November Attendance Days' as table_name, COUNT(*) as count 
FROM attendance_days 
WHERE date >= '2025-11-01' AND date < '2025-12-01'
UNION ALL
SELECT 'November Shifts', COUNT(*) 
FROM shifts 
WHERE date >= '2025-11-01' AND date < '2025-12-01';
