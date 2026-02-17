# Monthly Attendance Report Module Documentation

**Module Path**: `/admin/manage_employee/[EMP_CODE]`  
**Primary Files**:
- `app/src/app/admin/manage_employee/[code]/page.tsx`: Main page component.
- `app/src/components/admin/MonthlyReport.tsx`: UI component for the report.
- `app/src/app/admin/manage_employee/[code]/actions.ts`: Server actions for data fetching.
- `app/src/app/admin/attendance-actions/actions.ts`: Server actions for editing/deleting records.
- `app/src/app/actions/kiosk-utils.ts`: Core calculation logic (rounding, overtime, breaks).

---

## 1. Overview
The Monthly Attendance Report provides a detailed view of an employee's attendance for a specific month. It allows administrators to:
- View daily check-in/out times, break durations, and work hours.
- See a summary of total working days, absences, overtime, and paid leave.
- Identify irregularities via notifications (Late, Early In, Early Out, Missing Check-in, etc.).
- Manually edit or delete attendance records.
- Print a PDF report.

## 2. Data Sources & Schema
The module aggregates data from several Supabase tables:

| Table | Purpose | Usage in Module |
| :--- | :--- | :--- |
| **`people`** | Employee details | Fetches name, category, and ID based on the `[code]` URL parameter. |
| **`attendance_days`** | Daily attendance records | Source of `check_in_at`, `check_out_at`, `status`, `total_work_minutes`, etc. |
| **`shifts`** | Scheduled shifts | Used to determine `start_time`, `end_time`, and `shift_type` (e.g., standard, flex, paid_leave) for lateness/overtime calculations. |
| **`system_events`** | Calendar events | Determines holidays (`is_holiday`) and company-wide events (e.g., "New Year Break"). |
| **`attendance_events`** | Audit logs | Logs manual edits (`admin_edit`) and deletions (`admin_delete`). |

## 3. Core Logic & Calculations

### 3.1. Data Fetching Strategy
The `getMonthlyAttendanceReport` function (in `actions.ts`) performs the following steps:
1.  **Fetch Person**: Validates the employee ID.
2.  **Date Range**: Calculates `firstDay` and `lastDay` of the requested month.
3.  **Fetch Records**: Queries `attendance_days`, `system_events`, and `shifts` for the date range.
4.  **Daily Loop**: Iterates through every day of the month to build a `DailyAttendance` object, merging data from all sources.

### 3.2. Work Hours Calculation
Calculations are centralized in `kiosk-utils.ts` (`calculateDailyStats`) to ensure consistency between the Kiosk and Admin panel.

**Formula for Work Minutes:**
$$ \text{Total Work} = (\text{CheckOut} - \text{CheckIn}) - \text{Break Deduction} $$

*   **Rounding Rules**:
    *   **Start Time**:
        *   If `Scheduled Start` exists (and not Flex): Arriving *before* start time rounds **UP** to the next 15-minute interval. The early time is **credited** to working hours and may contribute to overtime. An `early_in` notification is generated.
        *   Arriving *after* start time (Late): Rounds **UP** to the next 15-minute interval (e.g., 9:01 → 9:15). A `late` notification is generated.
    *   **End Time**:
        *   Leaving *before* `Scheduled End`: Rounds **DOWN** to the previous 15-minute interval (e.g., 17:59 → 17:45).
        *   Leaving *after* end (Overtime): Rounds **DOWN** to the previous 15-minute interval (e.g., 18:35 → 18:30).
    *   **Flex / No Shift**: Simple 15-minute rounding (UP for check-in, DOWN for check-out) applies to both.

**Early Check-In Rounding Examples** (Scheduled Start: 09:00, Scheduled End: 18:00):

| Raw Check-In | Rounded To | Raw Check-Out | Rounded To | Work Hours | Overtime | Notifications |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 08:02 | 08:15 | 18:00 | 18:00 | 8:45 | 0:45 | Early In |
| 08:31 | 08:45 | 18:00 | 18:00 | 8:15 | 0:15 | Early In |
| 08:43 | 08:45 | 18:00 | 18:00 | 8:15 | 0:15 | Early In |
| 08:46 | 09:00 | 18:00 | 18:00 | 8:00 | 0:00 | Early In |
| 08:44 | 08:45 | 18:16 | 18:15 | 8:30 | 0:30 | Early In |
| 08:44 | 08:45 | 17:46 | 17:45 | 8:00 | 0:00 | Early In, Early Out |
| 09:00 | 09:00 | 18:00 | 18:00 | 8:00 | 0:00 | *(none)* |
| 09:05 | 09:15 | 18:00 | 18:00 | 7:45 | 0:00 | Late |

> **Note**: All work hours above assume a 1-hour automatic break deduction (work ≥ 6 hours). The `Scheduled Start` in the shifts table remains unchanged; only the *effective* check-in time is rounded.

### 3.3. Break Time Logic
*   **Automatic Deduction**:
    *   If `Gross Work Duration` $\ge$ 6 hours (360 mins), **60 minutes** are automatically deducted.
    *   **Exception**: If shift type is `work_no_break`, 0 minutes are deducted.
*   **Manual Override**: Admins can specify a fixed break duration, overriding the calculation.
*   **Limit**: Breaks > 60 minutes trigger a `break_exceeded` notification.

### 3.4. Overtime Calculation
Overtime is calculated as the difference between *Actual Work Hours* and *Scheduled Work Hours*.

$$ \text{Overtime} = \max(0, \text{Total Work} - \text{Scheduled Work}) $$

*   **Scheduled Work**: defined as `(Shift End - Shift Start) - Scheduled Break`.
*   **Early Check-In Overtime**: Because early check-in time is now credited, an employee arriving before the scheduled start will accumulate extra work minutes. If those extra minutes cause `Total Work > Scheduled Work`, the excess is counted as overtime. For example, checking in at 08:45 for a 09:00 shift and leaving at 18:00 results in 15 minutes of overtime.
*   **Note**: This logic allows late arrivals to "make up" time by staying late, as overtime only triggers if they exceed the absolute *duration* of the shift, not just the end time.

### 3.5. System Events & Status
*   **Rest Days**:
    *   Default: Saturday and Sunday.
    *   Overrides: `system_events` with `event_type = 'rest_day'`.
    *   Work on Rest Day: Counted entirely as work time (if attendance exists).
*   **Holidays**: `system_events` with `event_type = 'holiday'`.
*   **Leave Types**:
    *   `paid_leave`: 0 work hours, 8 hours (480 min) paid leave credit.
    *   `half_paid_leave`: Actual work hours + 4 hours (240 min) paid leave credit.
    *   `business_trip`: 8 hours work credit (fixed), 0 paid leave.
    *   `special_leave`: Treated as an absence but flagged for reporting.

## 4. Notifications & Alerts
The report generates visual badges based on the following logic:

| Notification | Icon Color | Condition | Description |
| :--- | :--- | :--- | :--- |
| **Late** | Amber ⚠️ | `CheckIn > Scheduled Start` | Employee arrived after shift start. |
| **Early In** | Green 🟢 | `CheckIn < Scheduled Start` | Employee arrived before shift start. Early time is credited. |
| **Early Out** | Amber ⚠️ | `CheckOut < Scheduled End` | Employee left before shift end. |
| **Break Exceeded** | Red 🔴 | `Break Minutes > 60` | Break duration exceeded 60 minutes. |
| **Missing Check-in** | Orange 🟠 | Record exists but `check_in_at` is null | Attendance record has no check-in time. |
| **Missing Check-out** | Orange 🟠 | Record exists but `check_out_at` is null | Attendance record has no check-out time. |
| **No Break Logged** | Yellow 🟡 | Work > 6 hours AND no break timestamps | Worked over 6 hours with no break recorded. |
| **Edited** | Blue 🔵 | `is_edited` flag is true | Record was manually edited by admin. |
| **Business Trip** | Purple 🟣 | Shift type is `business_trip` | Fixed 8h work credit. |
| **Paid Leave** | Green 🟢 | Shift type is `paid_leave` | Full day paid leave (8h credit). |
| **Half Paid Leave** | Yellow 🟡 | Shift type is `half_paid_leave` | 4h paid leave + actual work hours. |
| **Special Leave** | Orange 🟠 | Shift type is `special_leave` | Absence flagged for reporting. |

## 5. Application Functionalities
### 5.1. Editing Records
*   **Action**: `handleSaveAttendance` (in `page.tsx`) or `handleSaveEdit` (in `MonthlyReport.tsx`).
*   **Process**:
    1.  Admin modifies Check-in/Check-out times or Status.
    2.  Calls `upsertAttendanceRecord` (server action).
    3.  Server performs `calculateDailyStats` to re-calculate breakdown.
    4.  Updates `attendance_days` table.
    5.  Logs an event in `attendance_events`.

### 5.2. Deleting Records
*   **Action**: `handleConfirmDelete`.
*   **Process**:
    1.  Verifies record existence.
    2.  Unlinks any related `attendance_events` (sets `attendance_day_id` to NULL).
    3.  Deletes the row from `attendance_days`.
    4.  Create an `admin_delete` audit log.

### 5.3. Summary Statistics
Top-of-page cards aggregate data from the daily loop:
*   **Working Days**: Count of non-rest days in month.
*   **Attended**: Count of working days with valid check-in.
*   **Absent**: Count of working days with NO check-in.
*   **Total Work/Overtime/Leave**: Sum of minutes / 60.

---
*Documentation generated by Antigravity Agent. Last updated: 2026-02-17.*
