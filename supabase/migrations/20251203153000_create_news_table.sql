-- Create news table
create table news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  image_url text,
  target_audience user_role not null, -- 'student' or 'employee'
  is_active boolean default true,
  display_date date default current_date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add RLS policies (optional but good practice, though we might be using service role for now)
alter table news enable row level security;

create policy "Enable read access for all users" on news
  for select using (true);

create policy "Enable insert for authenticated users only" on news
  for insert with check (auth.role() = 'authenticated');

create policy "Enable update for authenticated users only" on news
  for update using (auth.role() = 'authenticated');

create policy "Enable delete for authenticated users only" on news
  for delete using (auth.role() = 'authenticated');
