-- Create shift_type enum
do $$ begin
  if not exists (select 1 from pg_type where typname = 'shift_type') then
    create type shift_type as enum ('work', 'rest', 'absent');
  end if;
end $$;

-- Add shift_type column to shifts table
alter table shifts 
add column if not exists shift_type shift_type default 'work';

-- Add comment to explain the column
comment on column shifts.shift_type is 'Type of shift: work, rest, or absent';
