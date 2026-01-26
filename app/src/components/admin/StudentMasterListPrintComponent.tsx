import React from 'react'
import { formatLocalDate } from '@/lib/utils'

interface SystemEvent {
    id: string
    event_date: string
    title: string
    event_type: 'holiday' | 'rest_day' | 'work_day' | 'event' | 'other'
    is_holiday: boolean
}

interface AttendanceRecord {
    person_id: string
    date: string
    total_work_minutes: number
    paid_leave_minutes?: number
}

interface Person {
    id: string
    full_name: string
    code: string
    role: string
    job_type?: string
    display_order?: number
    categories?: { name: string }[] | any
}

interface ShiftLegend {
    id: string
    from_location: string
    to_location: string
    color: string
}

interface StudentMasterListPrintComponentProps {
    year: number
    month: number
    students: Person[]
    days: number[]
    shifts: any[]
    events: SystemEvent[]
    attendance: AttendanceRecord[]
}

export const StudentMasterListPrintComponent = React.forwardRef<HTMLDivElement, StudentMasterListPrintComponentProps>(
    ({ year, month, students, days, shifts, events, attendance }, ref) => {
        const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

        const getDayStatus = (day: number) => {
            const date = new Date(year, month, day)
            const dayOfWeek = date.getDay()
            const dateStr = formatLocalDate(date)
            const dayEvents = events.filter(e => e.event_date === dateStr)

            const isHolidayEvent = dayEvents.some(e => e.event_type === 'holiday' || e.is_holiday)
            const isRestDayEvent = dayEvents.some(e => e.event_type === 'rest_day')
            const isWorkDayEvent = dayEvents.some(e => e.event_type === 'work_day')

            let isRestDay = false
            if (dayOfWeek === 0) {
                isRestDay = true
            }
            if (isWorkDayEvent) {
                isRestDay = false
            } else if (isRestDayEvent || isHolidayEvent) {
                isRestDay = true
            }

            return { isRestDay }
        }

        // Translation Helper
        const getTranslatedStatus = (shift: any) => {
            if (!shift) return null;

            const type = shift.shift_type;
            const memo = shift.memo || '';

            switch (type) {
                case 'sick_absent':
                    return '病欠';
                case 'family_reason': // "Family Matters"
                    return '私欠';
                case 'other_reason': // "Other Reasons"
                    return `他欠 ${memo}`; // "also put the reason/or memo"
                case 'planned_absent':
                    return '予欠';
                case 'rest':
                    return '休み';
                case 'user_note': // "Memo" in some contexts might be user_note
                case 'memo': // "Memo"
                    return memo;
                default:
                    // Check if it's "Rest Day" from system calendar? 
                    // Actually the user said: 'Also the "rest day" status from the main set calendar also "休み”'
                    // Main set calendar logic is usually handled by `getDayStatus` determining color, 
                    // but if there is a SHIFT that overrides it? 
                    // Or if there is NO shift but it is a rest day? 
                    // usually "rest" shift type is explicit.

                    // IF there is a shift name/type that is not standard options?
                    // Implementation: Just return what we have if not matched, or handle 'work'?
                    // But for students, usually they have class or absent.
                    // If 'work' type (meaning 'present'/'class'), maybe show Class Name or Time?
                    // User didn't specify what to show for "Present"/"Standard". 
                    // "1. students title... 5. statuses... IF... IF..."
                    // It implicitly means "Use existing logic for others"?
                    // Or for "Present" maybe we should show nothing or time?
                    // In MasterListPrintComponent, for work it shows Time or "Work".
                    // Let's stick to existing logic for non-special statuses.

                    if (type === 'work' || type === 'work_no_break') {
                        const start = shift.start_time?.slice(0, 5)
                        const end = shift.end_time?.slice(0, 5)
                        if (start && end) {
                            return `${start}\n${end}`;
                        }
                        return 'Work'; // Or '出席'? stick to English 'Work' or Time as default if not specified
                    }

                    return shift.shift_name || type || '';
            }
        }

        return (
            <div ref={ref} className="p-4 bg-white text-black print-container">
                <style>
                    {`
                        @media print {
                            @page {
                                size: A4 landscape;
                                margin: 5mm;
                            }
                            body {
                                print-color-adjust: exact;
                                -webkit-print-color-adjust: exact;
                                visibility: visible !important;
                            }
                            .print-container {
                                transform: scale(0.95);
                                transform-origin: top left;
                                width: 105%;
                                min-width: 1024px;
                                visibility: visible !important;
                                position: absolute;
                                left: 0;
                                top: 0;
                            }
                        }
                    `}
                </style>

                <div className="flex items-center gap-4 mb-2">
                    <h1 className="text-xl font-bold whitespace-nowrap">{monthName}</h1>
                </div>

                <table className="w-full border-collapse border border-gray-400 table-fixed text-[10px]">
                    <thead>
                        <tr>
                            <th className="border border-gray-400 p-1.5 w-20 bg-gray-100 text-left">Name</th>
                            {days.map(day => {
                                const date = new Date(year, month, day)
                                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)
                                const { isRestDay } = getDayStatus(day)
                                return (
                                    <th
                                        key={day}
                                        className={`border border-gray-400 p-1.5 text-center ${isRestDay ? 'bg-red-100 text-red-700' : 'bg-gray-50'}`}
                                    >
                                        <div className="text-[9px]">{day}</div>
                                        <div className="text-[7px] font-normal">{dayName}</div>
                                    </th>
                                )
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {/* 2. Student count */}
                        <tr className="border-b border-gray-400 bg-gray-50">
                            <td className="border border-gray-400 p-[5px] font-bold text-[9px]">Student Count</td>
                            {days.map(day => {
                                const date = new Date(year, month, day)
                                const dateStr = formatLocalDate(date)
                                const { isRestDay } = getDayStatus(day)

                                if (isRestDay) {
                                    return <td key={day} className="border border-gray-400 p-[2px] text-center bg-red-100">-</td>
                                }

                                // Logic from MasterListTable renderStudentCountRow
                                const absentStatuses = ['rest', 'sick_absent', 'planned_absent', 'family_reason', 'other_reason']
                                const absentCount = students.reduce((count, student) => {
                                    const shift = shifts.find(s => s.person_id === student.id && s.date === dateStr)
                                    if (shift && absentStatuses.includes(shift.shift_type)) {
                                        return count + 1
                                    }
                                    return count
                                }, 0)
                                const presentCount = students.length - absentCount

                                return (
                                    <td
                                        key={day}
                                        className="border border-gray-400 p-[2px] text-center font-medium"
                                    >
                                        {presentCount}
                                    </td>
                                )
                            })}
                        </tr>

                        {/* 3. Events */}
                        <tr className="border-b border-gray-400 bg-gray-50">
                            <td className="border border-gray-400 p-[5px] font-bold text-[9px]">Events</td>
                            {days.map(day => {
                                const date = new Date(year, month, day)
                                const dateStr = formatLocalDate(date)
                                const dayEvents = events.filter(e => e.event_date === dateStr)
                                const { isRestDay } = getDayStatus(day)

                                return (
                                    <td
                                        key={day}
                                        className={`border border-gray-400 p-[2px] text-center align-top text-[7px] leading-tight whitespace-normal break-words ${isRestDay ? 'bg-red-100' : ''}`}
                                    >
                                        <div className="line-clamp-2 overflow-hidden max-h-[2.5em]">
                                            {dayEvents.map(e => e.title).join(', ')}
                                        </div>
                                    </td>
                                )
                            })}
                        </tr>

                        {/* 4. Student Names */}
                        {students.map(person => (
                            <tr key={person.id} className="border-b border-gray-400">
                                <td className="border border-gray-400 p-[6px] font-medium truncate">
                                    {person.full_name}
                                </td>
                                {days.map(day => {
                                    const date = new Date(year, month, day)
                                    const dateStr = formatLocalDate(date)
                                    const shift = shifts.find(s => s.person_id === person.id && s.date === dateStr)
                                    const { isRestDay } = getDayStatus(day)

                                    // Status conversion logic
                                    let cellContent = '';
                                    if (shift) {
                                        cellContent = getTranslatedStatus(shift);
                                    } else if (isRestDay) {
                                        // If it is a rest day (from calendar) and no shift is set, user said:
                                        // 'Also the "rest day" status from the main set calendar also "休み”'
                                        // But usually we don't show anything in empty cells. 
                                        // If it is a red day, maybe show nothing or '休み'? 
                                        // MasterListTable shows nothing. 
                                        // I will treat explicit 'rest' shift as '休み'.
                                        // "Rest Day" status from main set calendar... 
                                        // If it means SystemEvent 'rest_day', then we should show '休み' if no shift?
                                        // Or does it mean if shift.shift_type is 'rest_day'? (which doesn't exist as shift type usually, it's 'rest')
                                        // I'll assume if there's no shift but it is a Rest Day (red), we leave it empty or colored red (which is done by className).
                                        // Wait, user said: 'Also the "rest day" status from the main set calendar also "休み”'
                                        // This implies text content.
                                        // I will check if `isRestDay` is true AND no shift overrides it?
                                        // But `isRestDay` covers weekends too.
                                        // Let's stick to: if shift exists -> translate. If no shift -> empty (background handled).
                                        // Unless user explicitly meant "If there is a System Event 'Rest Day', print '休み'".
                                        // Let's safeguard: if events has 'rest_day', print '休み'?
                                        // But typically empty means nothing scheduled (or default off).
                                        // I will interpret "status from the main set calendar" as "System Event: rest_day".
                                        const hasRestDayEvent = events.some(e => e.event_date === dateStr && e.event_type === 'rest_day');
                                        if (hasRestDayEvent && !shift) {
                                            cellContent = '休み';
                                        }
                                    }

                                    return (
                                        <td
                                            key={day}
                                            className={`border border-gray-400 p-[1px] text-center overflow-hidden text-[8px] align-middle ${isRestDay ? 'bg-red-100' : ''}`}
                                            style={shift?.color ? { backgroundColor: shift.color } : {}}
                                        >
                                            <div className="line-clamp-2 leading-tight whitespace-pre-wrap break-all max-h-[3.5em] flex items-center justify-center h-full w-full">
                                                {cellContent}
                                            </div>
                                        </td>
                                    )
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )
    }
)

StudentMasterListPrintComponent.displayName = 'StudentMasterListPrintComponent'
