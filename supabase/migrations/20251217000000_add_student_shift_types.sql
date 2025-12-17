-- Add new values to shift_type enum
ALTER TYPE shift_type ADD VALUE IF NOT EXISTS 'present';
ALTER TYPE shift_type ADD VALUE IF NOT EXISTS 'sick_absent';
ALTER TYPE shift_type ADD VALUE IF NOT EXISTS 'planned_absent';
ALTER TYPE shift_type ADD VALUE IF NOT EXISTS 'family_reason';
ALTER TYPE shift_type ADD VALUE IF NOT EXISTS 'other_reason';
