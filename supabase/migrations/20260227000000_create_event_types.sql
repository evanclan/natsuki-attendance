-- Create system_event_types table for custom calendar event types
create table if not exists system_event_types (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text not null unique,
  color text not null default 'blue',
  is_default boolean default false,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add RLS policies
alter table system_event_types enable row level security;

drop policy if exists "Enable read access for all users" on system_event_types;
create policy "Enable read access for all users"
on system_event_types for select
using (true);

drop policy if exists "Enable insert for authenticated users only" on system_event_types;
create policy "Enable insert for authenticated users only"
on system_event_types for insert
with check (auth.role() = 'authenticated');

drop policy if exists "Enable update for authenticated users only" on system_event_types;
create policy "Enable update for authenticated users only"
on system_event_types for update
using (auth.role() = 'authenticated');

drop policy if exists "Enable delete for authenticated users only" on system_event_types;
create policy "Enable delete for authenticated users only"
on system_event_types for delete
using (auth.role() = 'authenticated');

-- Seed default event types
INSERT INTO system_event_types (name, slug, color, is_default) VALUES
  ('Holiday', 'holiday', 'red', true),
  ('Rest Day', 'rest_day', 'red', true),
  ('Event', 'event', 'blue', true)
ON CONFLICT (slug) DO NOTHING;

-- Convert system_events.event_type from enum to text for dynamic type support
ALTER TABLE system_events ALTER COLUMN event_type TYPE text USING event_type::text;
ALTER TABLE system_events ALTER COLUMN event_type SET DEFAULT 'event';
