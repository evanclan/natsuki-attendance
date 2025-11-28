-- Create locations table for managing shift locations
create table locations (
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
  ('taniyama', true, true, 1),
  ('shimoarata', true, true, 2),
  ('hanauta', true, true, 3),
  ('academy', true, true, 4);

-- Create index for faster lookups
create index idx_locations_active on locations(is_active) where is_active = true;
