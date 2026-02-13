-- Add 'custom_leave' to shift_type enum
ALTER TYPE shift_type ADD VALUE IF NOT EXISTS 'custom_leave';
