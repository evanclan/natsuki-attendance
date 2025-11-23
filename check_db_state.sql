-- Check current database state for debugging
-- Run this in Supabase SQL Editor to see what's in the database

-- Check today's attendance_days records
SELECT 
    p.full_name,
    ad.date,
    ad.check_in_at,
    ad.check_out_at,
    ad.status
FROM attendance_days ad
JOIN people p ON ad.person_id = p.id
WHERE ad.date = CURRENT_DATE
ORDER BY p.full_name;

-- Check recent attendance_events (last 20)
SELECT 
    p.full_name,
    ae.event_type,
    ae.occurred_at,
    ae.source
FROM attendance_events ae
JOIN people p ON ae.person_id = p.id
WHERE ae.occurred_at::date = CURRENT_DATE
ORDER BY ae.occurred_at DESC
LIMIT 20;

-- Count records for today
SELECT 
    (SELECT COUNT(*) FROM attendance_days WHERE date = CURRENT_DATE) as days_count,
    (SELECT COUNT(*) FROM attendance_events WHERE occurred_at::date = CURRENT_DATE) as events_count;
