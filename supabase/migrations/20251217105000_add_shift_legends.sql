create table if not exists shift_legends (
  id uuid default gen_random_uuid() primary key,
  from_location text not null,
  to_location text not null,
  color text not null,
  created_at timestamptz default now()
);

-- Add RLS policies (assuming public access for authenticated users or similar, matching general pattern if needed, but for now open for admin usage is implied by context)
alter table shift_legends enable row level security;

create policy "Enable read access for authenticated users" on shift_legends
  for select using (auth.role() = 'authenticated');

create policy "Enable insert access for authenticated users" on shift_legends
  for insert with check (auth.role() = 'authenticated');

create policy "Enable update access for authenticated users" on shift_legends
  for update using (auth.role() = 'authenticated');

create policy "Enable delete access for authenticated users" on shift_legends
  for delete using (auth.role() = 'authenticated');
