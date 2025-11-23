-- Create system_events table
create type event_type as enum ('holiday', 'event', 'other');

create table system_events (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  event_date date not null,
  event_type event_type not null default 'event',
  is_holiday boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add RLS policies
alter table system_events enable row level security;

create policy "Enable read access for all users"
on system_events for select
using (true);

create policy "Enable insert for authenticated users only"
on system_events for insert
with check (auth.role() = 'authenticated');

create policy "Enable update for authenticated users only"
on system_events for update
using (auth.role() = 'authenticated');

create policy "Enable delete for authenticated users only"
on system_events for delete
using (auth.role() = 'authenticated');
