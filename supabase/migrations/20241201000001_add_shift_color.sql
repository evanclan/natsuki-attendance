-- Add color column to shifts table
alter table shifts add column if not exists color text;
