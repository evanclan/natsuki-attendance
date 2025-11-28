-- Add break_exceeded flag to attendance_days table
alter table attendance_days
add column if not exists break_exceeded boolean default false;

-- Add comment for documentation
comment on column attendance_days.break_exceeded is 'Flag indicating if employee exceeded their 60-minute break allowance';
