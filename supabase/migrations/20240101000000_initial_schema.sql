-- Enable UUID extension
create extension if not exists "pgcrypto";

-- 3.1 Postgres enums
create type user_role as enum ('employee', 'student');
create type user_status as enum ('active', 'inactive');
create type attendance_status as enum ('present', 'absent', 'late', 'half_day', 'off');
create type attendance_event_type as enum ('check_in', 'check_out', 'break_start', 'break_end', 'mark_absent', 'admin_edit');
create type event_source as enum ('kiosk', 'admin', 'api');

-- 3.2 Tables

-- Table: categories
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  for_role user_role,
  sort_order int,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: people
create table people (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  full_name text not null,
  role user_role not null,
  category_id uuid references categories(id),
  registration_date date default current_date,
  status user_status default 'active',
  memo text,
  auth_user_id uuid unique references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: attendance_days
create table attendance_days (
  id bigserial primary key,
  person_id uuid references people(id) on delete cascade,
  date date not null,
  check_in_at timestamptz,
  check_out_at timestamptz,
  break_start_at timestamptz,
  break_end_at timestamptz,
  total_work_minutes int,
  total_break_minutes int default 60,
  status attendance_status default 'present',
  is_edited boolean default false,
  admin_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(person_id, date)
);

-- Table: attendance_events
create table attendance_events (
  id bigserial primary key,
  person_id uuid references people(id) on delete cascade,
  attendance_day_id bigint references attendance_days(id),
  event_type attendance_event_type not null,
  occurred_at timestamptz default now(),
  source event_source default 'kiosk',
  created_by uuid references auth.users(id),
  payload jsonb,
  note text
);

-- Table: shifts
create table shifts (
  id bigserial primary key,
  person_id uuid references people(id) on delete cascade,
  date date not null,
  start_time time,
  end_time time,
  shift_name text,
  memo text,
  location text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(person_id, date)
);
