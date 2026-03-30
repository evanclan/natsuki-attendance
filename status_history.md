# Status History — System Documentation

## Overview

Status History determines whether a student or employee is **active** or **inactive** in the system. It controls **visibility** — inactive people are hidden from the masterlist and all list tables for months they are no longer active, but **all data is retained** (attendance, shifts, etc. are never deleted).

## How It Works

### Database Table: `person_status_history`

| Column | Type | Description |
|---|---|---|
| `id` | bigint | Primary key |
| `person_id` | uuid | FK → `people.id` |
| `status` | `'active'` \| `'inactive'` | Status for this period |
| `valid_from` | date | Start date of this period |
| `valid_until` | date \| null | End date. **null = "Present" (ongoing)** |
| `note` | text | Optional reason |
| `created_at` | timestamptz | Auto-set |

### Key Rule: One Active Period at a Time

Each person should have **at most one open-ended record** (`valid_until = null`). When a new period is added, all existing open-ended periods are automatically closed.

### Date-Range Filtering (RPC)

The Postgres function `get_active_people_in_range(range_start, range_end)` returns people who have an **active** status period overlapping the given date range:

```sql
WHERE psh.status = 'active'
  AND psh.valid_from <= range_end
  AND (psh.valid_until IS NULL OR psh.valid_until >= range_start)
```

**Example**: If Simon is active from Dec 3 until March 31:
- March masterlist (March 1–31) → **Simon appears** ✅
- April masterlist (April 1–30) → **Simon is hidden** ✅

## Where Status Filtering Is Used

| Page / Feature | File | How it filters |
|---|---|---|
| Master Shift List | `app/src/app/admin/masterlist/actions.ts` | `get_active_people_in_range` RPC with month start/end |
| All List | `app/src/app/admin/all_list/actions.ts` | Same RPC |
| Kiosk Schedule | `app/src/app/kiosk/employee/schedule/actions.ts` | Same RPC with single-day range |

> **Important**: These pages do NOT filter by `people.status`. They rely entirely on the RPC which checks `person_status_history` date ranges.

## Automatic Status Sync (Cron)

**Endpoint**: `/api/cron/sync-status`
**Schedule**: Daily at 6:00 AM JST (via GitHub Actions in `wakeup.yml`)

What it does:
1. **Cleans up stale records** — If a person has duplicate open-ended periods, removes or closes the extras
2. **Syncs `people.status`** — For each person, checks what `person_status_history` says for today and updates `people.status` to match

This ensures that when someone's `valid_until` date passes, their `people.status` flips to `inactive` automatically.

## Key Files

| File | Purpose |
|---|---|
| `app/src/actions/status_history.ts` | Server actions: `getStatusHistory`, `addStatusPeriod`, `updateStatusPeriod`, `deleteStatusPeriod`, `syncCurrentStatus` |
| `app/src/components/admin/StatusHistoryManager.tsx` | UI component on employee/student detail pages |
| `app/src/app/api/cron/sync-status/route.ts` | Daily cron endpoint |
| `supabase/migrations/20251215000000_add_status_history.sql` | DB migration + RPC function |

## Common Scenarios

### 1. Employee doesn't know when they'll stop
- Set **From** = registration date, **Until** = empty (Present)
- They appear in all months from registration onward

### 2. Employee/student has a fixed end date
- Set **From** = registration date, **Until** = last working date (e.g., March 31)
- They automatically disappear from April masterlist onward
- You can edit this anytime via the pencil icon in Status History

### 3. Employee retires / student leaves
- Option A: Edit existing active period → set **Until** to their last date
- Option B: The "Delete" button on the manage page now does a **soft delete** (sets inactive, keeps all data)

### 4. Reactivating someone
- Add a new active period with **From** = return date, **Until** = empty
- They'll reappear in the masterlist from that date

## ⚠️ Gotchas

1. **Never manually change `people.status`** in the database — the cron will overwrite it based on `person_status_history`
2. **Changing status via Personal Details dropdown** automatically creates a status history record
3. **The `deletePerson` function is a soft delete** — it sets status to inactive and adds a history record. It does NOT delete attendance/shift data
4. **Multiple open-ended records cause bugs** — if a person appears in months they shouldn't, run `/api/cron/sync-status` to clean up stale records
