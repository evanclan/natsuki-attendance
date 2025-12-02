-- Create system_events table
do $$ begin
  if not exists (select 1 from pg_type where typname = 'event_type') then
    create type event_type as enum ('holiday', 'event', 'other');
  end if;
end $$;

create table if not exists system_events (
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

drop policy if exists "Enable read access for all users" on system_events;
create policy "Enable read access for all users"
on system_events for select
using (true);

drop policy if exists "Enable insert for authenticated users only" on system_events;
create policy "Enable insert for authenticated users only"
on system_events for insert
with check (auth.role() = 'authenticated');

drop policy if exists "Enable update for authenticated users only" on system_events;
create policy "Enable update for authenticated users only"
on system_events for update
using (auth.role() = 'authenticated');

drop policy if exists "Enable delete for authenticated users only" on system_events;
create policy "Enable delete for authenticated users only"
on system_events for delete
using (auth.role() = 'authenticated');
