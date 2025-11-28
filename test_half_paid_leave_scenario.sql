-- Test scenario: Simulate kiosk check-in for half paid leave
-- Employee: Sarah Johnson (EMP002)
-- Date: November 29, 2025
-- Shift: 1:00 PM - 4:00 PM (13:00-16:00)
-- Actual check-in: 12:55 PM, check-out: 4:05 PM (12:55:00-16:05:00)
-- Expected result: Work Hours = 3h, Paid Leave = 4h

-- First, get the person_id for Sarah Johnson
DO $$
DECLARE
    v_person_id text;
    v_date date := '2025-11-29';
    v_check_in timestamptz := '2025-11-29 12:55:00+09:00';
    v_check_out timestamptz := '2025-11-29 16:05:00+09:00';
BEGIN
    -- Get person_id for EMP002
    SELECT id INTO v_person_id FROM people WHERE code = 'EMP002';
    
    -- Insert or update attendance record
    INSERT INTO attendance_days (
        person_id,
        date,
        check_in_at,
        check_out_at,
        status,
        created_at,
        updated_at
    ) VALUES (
        v_person_id,
        v_date,
        v_check_in,
        v_check_out,
        'present',
        NOW(),
        NOW()
    )
    ON CONFLICT (person_id, date) 
    DO UPDATE SET
        check_in_at = v_check_in,
        check_out_at = v_check_out,
        status = 'present',
        updated_at = NOW();
    
    RAISE NOTICE 'Inserted/Updated attendance for % on %', v_person_id, v_date;
END $$;

-- Now query to see what was created
SELECT 
    p.code,
    p.full_name,
    ad.date,
    ad.check_in_at AT TIME ZONE 'Asia/Tokyo' as check_in_jst,
    ad.check_out_at AT TIME ZONE 'Asia/Tokyo' as check_out_jst,
    ad.total_work_minutes,
    ad.paid_leave_minutes,
    ad.total_break_minutes,
    s.shift_type,
    s.start_time,
    s.end_time
FROM attendance_days ad
JOIN people p ON ad.person_id = p.id
LEFT JOIN shifts s ON s.person_id = ad.person_id AND s.date = ad.date
WHERE p.code = 'EMP002' AND ad.date = '2025-11-29';
