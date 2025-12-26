-- Add 'work_no_break' to shift_type enum
ALTER TYPE shift_type ADD VALUE IF NOT EXISTS 'work_no_break';
