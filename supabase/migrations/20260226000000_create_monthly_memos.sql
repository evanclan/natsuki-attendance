create table if not exists monthly_memos (
  id uuid primary key default gen_random_uuid(),
  person_id uuid references people(id) on delete cascade,
  month_year text not null, -- Format 'YYYY-MM'
  memo_text text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(person_id, month_year)
);

-- RLS Policies
alter table monthly_memos enable row level security;

-- Admin can read/write everything
create policy "Allow full access to monthly_memos"
  on monthly_memos for all
  using (true)
  with check (true);
