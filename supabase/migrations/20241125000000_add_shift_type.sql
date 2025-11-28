-- Create shift_type enum
create type shift_type as enum ('work', 'rest', 'absent');

-- Add shift_type column to shifts table
alter table shifts 
add column shift_type shift_type default 'work';

-- Add comment to explain the column
comment on column shifts.shift_type is 'Type of shift: work, rest, or absent';
