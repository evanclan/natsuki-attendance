-- Add 'other_branch' to shift_type enum
-- Person is working at another school that day; their hours are recorded by that
-- school, so for this system the day behaves exactly like a 'rest'.
ALTER TYPE shift_type ADD VALUE IF NOT EXISTS 'other_branch';
