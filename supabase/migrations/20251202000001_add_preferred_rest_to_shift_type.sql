-- Add 'preferred_rest' to shift_type enum
ALTER TYPE shift_type ADD VALUE IF NOT EXISTS 'preferred_rest';
