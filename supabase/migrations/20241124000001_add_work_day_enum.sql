-- Add work_day to event_type enum
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'work_day';
