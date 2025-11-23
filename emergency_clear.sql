-- Emergency script to manually clear ALL attendance data from yesterday and today
-- This will give you a completely fresh start

-- First, let's see what dates we have
SELECT DISTINCT date FROM attendance_days ORDER BY date DESC;

-- Delete ALL attendance_days records from Nov 22 and Nov 23
DELETE FROM attendance_days 
WHERE date IN ('2025-11-22', '2025-11-23');

-- Delete ALL attendance_events from Nov 22 onwards
DELETE FROM attendance_events
WHERE occurred_at >= '2025-11-22T00:00:00Z';

-- Verify it's clean
SELECT COUNT(*) as remaining_days FROM attendance_days WHERE date >= '2025-11-22';
SELECT COUNT(*) as remaining_events FROM attendance_events WHERE occurred_at >= '2025-11-22T00:00:00Z';
