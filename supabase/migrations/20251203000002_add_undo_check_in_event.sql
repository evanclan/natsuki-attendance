-- Add 'undo_check_in' to the attendance_event_type enum
ALTER TYPE attendance_event_type ADD VALUE IF NOT EXISTS 'undo_check_in';
