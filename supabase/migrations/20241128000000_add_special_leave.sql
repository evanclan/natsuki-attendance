-- Add special_leave to shift_type enum
-- Run this migration to allow special leave shifts in the database

ALTER TYPE shift_type ADD VALUE IF NOT EXISTS 'special_leave';
