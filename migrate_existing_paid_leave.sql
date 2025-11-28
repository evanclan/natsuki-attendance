-- Comprehensive query to find ALL paid leave records that need updating
-- This checks both by admin_note and by checking the shifts table

-- First, let's see what we're dealing with
SELECT 
    ad.id,
    ad.date,
    p.full_name,
    p.code,
    s.shift_type,
    ad.total_work_minutes,
    ad.paid_leave_minutes,
    ad.admin_note
FROM attendance_days ad
JOIN people p ON ad.person_id = p.id
LEFT JOIN shifts s ON s.person_id = ad.person_id AND s.date = ad.date
WHERE s.shift_type IN ('paid_leave', 'half_paid_leave')
ORDER BY ad.date DESC;

-- Now update ALL records where shift is paid_leave
UPDATE attendance_days ad
SET 
    paid_leave_minutes = 480,
    total_work_minutes = 0,
    admin_note = CASE 
        WHEN ad.admin_note IS NULL OR ad.admin_note = '' THEN 'Paid Leave'
        WHEN ad.admin_note NOT LIKE '%Paid Leave%' THEN ad.admin_note || '; Paid Leave'
        ELSE ad.admin_note
    END
FROM shifts s
WHERE s.person_id = ad.person_id 
  AND s.date = ad.date
  AND s.shift_type = 'paid_leave'
  AND (ad.paid_leave_minutes IS NULL OR ad.paid_leave_minutes = 0);

-- Update ALL records where shift is half_paid_leave
UPDATE attendance_days ad
SET 
    paid_leave_minutes = 240,
    total_work_minutes = 0,
    admin_note = CASE 
        WHEN ad.admin_note IS NULL OR ad.admin_note = '' THEN 'Half Paid Leave'
        WHEN ad.admin_note NOT LIKE '%Half Paid Leave%' THEN ad.admin_note || '; Half Paid Leave'
        ELSE ad.admin_note
    END
FROM shifts s
WHERE s.person_id = ad.person_id 
  AND s.date = ad.date
  AND s.shift_type = 'half_paid_leave'
  AND (ad.paid_leave_minutes IS NULL OR ad.paid_leave_minutes = 0);

-- Verify the results - should show all paid leave records correctly
SELECT 
    ad.date,
    p.full_name,
    p.code,
    s.shift_type,
    ad.total_work_minutes as work_mins,
    ad.paid_leave_minutes as paid_leave_mins,
    ad.admin_note
FROM attendance_days ad
JOIN people p ON ad.person_id = p.id
LEFT JOIN shifts s ON s.person_id = ad.person_id AND s.date = ad.date
WHERE s.shift_type IN ('paid_leave', 'half_paid_leave')
ORDER BY p.code, ad.date;
