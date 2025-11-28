-- Manual migration script for locations table
-- Copy and paste this into Supabase SQL Editor

-- Create locations table for managing shift locations
CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  sort_order int,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default locations (only if not exists)
INSERT INTO locations (name, is_default, is_active, sort_order) 
VALUES
  ('taniyama', true, true, 1),
  ('shimoarata', true, true, 2),
  ('hanauta', true, true, 3),
  ('academy', true, true, 4)
ON CONFLICT (name) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_locations_active ON locations(is_active) WHERE is_active = true;

-- Verify the data
SELECT * FROM locations ORDER BY sort_order;
