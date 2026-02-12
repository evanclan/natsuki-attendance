-- Create locations table for managing shift locations
-- Create locations table for managing shift locations
create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_default boolean default false,
  is_active boolean default true,
  sort_order int,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Insert default locations
insert into locations (name, is_default, is_active, sort_order) values
  ('Taniyama', true, true, 1),
  ('Shimoarata', true, true, 2),
  ('Hanauta', true, true, 3),
  ('Academy', true, true, 4)
on conflict (name) do nothing;

-- Create index for faster lookups
create index if not exists idx_locations_active on locations(is_active) where is_active = true;
