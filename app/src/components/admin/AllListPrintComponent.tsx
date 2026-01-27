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
    check_in_at: string | null
    check_out_at: string | null
    total_work_minutes: number | null
}

interface Person {
    id: string
    full_name: string
    code: string
    role: string
    display_order?: number
    categories?: { name: string }[] | any
}

interface ShiftRecord {
    person_id: string
    date: string
    shift_type: string
    color: string | null
    shift_name: string | null
}

interface AllListPrintComponentProps {
    year: number
    month: number
    employees: Person[]
    days: number[]
    shifts: ShiftRecord[]
    events: SystemEvent[]
    attendance: AttendanceRecord[]
}

export const AllListPrintComponent = React.forwardRef<HTMLDivElement, AllListPrintComponentProps>(
    ({ year, month, employees, days, shifts, events, attendance }, ref) => {
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

        const formatTime = (isoString: string | null) => {
            if (!isoString) return ''
            return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
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
                                        className={`border border-gray-400 p-0.5 text-center ${isRestDay ? 'bg-red-100 text-red-700' : 'bg-gray-50'}`}
                                    >
                                        <div className="text-[9px]">{day}</div>
                                        <div className="text-[7px] font-normal">{dayName}</div>
                                    </th>
                                )
                            })}
                            <th className="border border-gray-400 p-1.5 w-9 bg-gray-100 text-center font-bold text-[9px]">合計</th>
                            <th className="border border-gray-400 p-1.5 w-9 bg-gray-100 text-center font-bold text-[9px]">日数</th>
                            <th className="border border-gray-400 p-1.5 w-20 bg-gray-100 text-left">Name</th>
                        </tr>
                    </thead>
                    <tbody>
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
                            <td className="border border-gray-400 p-[5px]"></td>
                            <td className="border border-gray-400 p-[5px]"></td>
                            <td className="border border-gray-400 p-[5px]"></td>
                        </tr>
                        {employees.map(person => (
                            <tr key={person.id} className="border-b border-gray-400">
                                <td className="border border-gray-400 p-[6px] font-medium truncate">
                                    {person.full_name}
                                </td>
                                {days.map(day => {
                                    const date = new Date(year, month, day)
                                    const dateStr = formatLocalDate(date)
                                    const shift = shifts.find(s => s.person_id === person.id && s.date === dateStr)
                                    const attendanceRecord = attendance.find(a => a.person_id === person.id && a.date === dateStr)
                                    const { isRestDay } = getDayStatus(day)

                                    let cellContent: React.ReactNode = ''
                                    let cellClass = ''

                                    // Base color on isRestDay
                                    if (isRestDay) {
                                        cellClass = 'bg-red-100'
                                    }

                                    if (shift) {
                                        // Specific Status Handling
                                        if (shift.shift_type === 'paid_leave') {
                                            cellContent = '有休'
                                            cellClass = 'bg-red-50'
                                        } else if (shift.shift_type === 'half_paid_leave') {
                                            cellContent = '半休'
                                            cellClass = 'bg-yellow-50'
                                        } else if (shift.shift_type === 'special_leave') {
                                            cellContent = '特休'
                                            cellClass = 'bg-blue-50'
                                        } else if (shift.shift_type === 'absent') {
                                            cellContent = '欠勤'
                                            cellClass = 'bg-red-50'
                                        } else if (shift.shift_type === 'business_trip') {
                                            cellContent = '出張'
                                            cellClass = 'bg-green-50'
                                        } else if (shift.shift_type === 'rest') {
                                            cellContent = '休み'
                                            cellClass = 'bg-red-50' // User requested red for rest
                                        } else if (shift.shift_type === 'preferred_rest') {
                                            cellContent = '希望休'
                                            cellClass = 'bg-red-50' // User requested red for preferred_rest
                                        } else if (shift.shift_type === 'work' || shift.shift_type === 'work_no_break' || shift.shift_type === 'flex') {
                                            // Show Raw Time Logic
                                            if (attendanceRecord && attendanceRecord.check_in_at && attendanceRecord.check_out_at) {
                                                const start = formatTime(attendanceRecord.check_in_at)
                                                const end = formatTime(attendanceRecord.check_out_at)
                                                cellContent = (
                                                    <div className="flex flex-col items-center justify-center leading-[0.85] gap-[1px]">
                                                        <div>{start}</div>
                                                        <div>{end}</div>
                                                    </div>
                                                )
                                                cellClass = '' // Normal background
                                            } else {
                                                // No attendance data -> Empty
                                                cellContent = ''
                                            }
                                        } else {
                                            // Other types
                                            cellContent = shift.shift_name || shift.shift_type || ''
                                        }

                                        // Override color if shift has specific color
                                        if (shift.color) {
                                            // Inline style will handle this
                                        }
                                    }

                                    return (
                                        <td
                                            key={day}
                                            className={`border border-gray-400 p-[5px] text-center whitespace-nowrap overflow-hidden text-[8px] ${cellClass}`}
                                            style={shift?.color ? { backgroundColor: shift.color } : {}}
                                        >
                                            {cellContent}
                                        </td>
                                    )
                                })}
                                <td className="border border-gray-400 p-[5px] text-center font-medium">
                                    {(() => {
                                        const totalMinutes = attendance
                                            .filter(a => a.person_id === person.id)
                                            .reduce((sum, a) => sum + (a.total_work_minutes || 0), 0)
                                        const hours = Math.floor(totalMinutes / 60)
                                        // Only show if > 0
                                        return hours > 0 ? `${hours}h` : '-'
                                    })()}
                                </td>
                                <td className="border border-gray-400 p-[5px] text-center font-medium">
                                    {(() => {
                                        const daysAttended = attendance.filter(a => a.person_id === person.id && (a.check_in_at || a.check_out_at)).length
                                        return daysAttended > 0 ? `${daysAttended}d` : '-'
                                    })()}
                                </td>
                                <td className="border border-gray-400 p-[6px] font-medium truncate">
                                    {person.full_name}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )
    }
)

AllListPrintComponent.displayName = 'AllListPrintComponent'
