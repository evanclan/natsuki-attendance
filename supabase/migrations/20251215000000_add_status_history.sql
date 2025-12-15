-- Create person_status_history table
create table if not exists person_status_history (
  id bigint primary key generated always as identity,
  person_id uuid references people(id) on delete cascade not null,
  status user_status not null,
  valid_from date not null,
  valid_until date, -- null means "forever" or "until next change"
  note text,
  created_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

-- Index for efficient querying
create index if not exists idx_person_status_history_lookup 
on person_status_history(person_id, valid_from, valid_until);

-- Seed data for existing users
-- We use a CTE to avoid duplicates if run multiple times (though 'if not exists' helps, seeding logic needs care)
do $$
begin
  if not exists (select 1 from person_status_history limit 1) then
    -- Insert 'active' periods for currently active people
    insert into person_status_history (person_id, status, valid_from, valid_until, note)
    select 
      id, 
      'active', 
      coalesce(registration_date, '2024-01-01'), 
      null,
      'Initial migration'
    from people 
    where status = 'active';

    -- Insert periods for currently inactive people
    -- We assume they were active from registration until updated_at
    insert into person_status_history (person_id, status, valid_from, valid_until, note)
    select 
      id, 
      'active', 
      coalesce(registration_date, '2024-01-01'), 
      date(updated_at),
      'Initial migration (inferred)'
    from people 
    where status = 'inactive';

    -- Insert 'inactive' period for currently inactive people starting from updated_at
    insert into person_status_history (person_id, status, valid_from, valid_until, note)
    select 
      id, 
      'inactive', 
      date(updated_at), 
      null,
      'Initial migration (current status)'
    from people 
    where status = 'inactive';
  end if;
end $$;

-- Function to get active people within a date range
create or replace function get_active_people_in_range(range_start date, range_end date)
returns setof people
language plpgsql
security definer
as $$
begin
  return query
  select distinct p.*
  from people p
  join person_status_history psh on p.id = psh.person_id
  where psh.status = 'active'
    and psh.valid_from <= range_end
    and (psh.valid_until is null or psh.valid_until >= range_start);
end;
$$;
