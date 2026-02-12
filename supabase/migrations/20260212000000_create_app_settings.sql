create table if not exists app_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamp with time zone default now(),
  updated_by uuid references auth.users(id)
);

alter table app_settings enable row level security;

create policy "Allow public read access" on app_settings for select using (true);
create policy "Allow authenticated update access" on app_settings for update using (auth.role() = 'authenticated');
create policy "Allow authenticated insert access" on app_settings for insert with check (auth.role() = 'authenticated');

-- Insert default deadline setting if not exists
insert into app_settings (key, value, description)
values ('preferred_rest_deadline_day', '21'::jsonb, 'Day of the month (1-28) when preferred rest submission closes')
on conflict (key) do nothing;
