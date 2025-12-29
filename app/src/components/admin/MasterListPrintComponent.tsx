
import React from 'react'
import { formatLocalDate, calculateExpectedHours } from '@/lib/utils'

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

interface MasterListPrintComponentProps {
    year: number
    month: number
    employees: Person[]
    days: number[]
    shifts: any[]
    events: SystemEvent[]
    attendance: AttendanceRecord[]
    legends: ShiftLegend[]
}

export const MasterListPrintComponent = React.forwardRef<HTMLDivElement, MasterListPrintComponentProps>(
    ({ year, month, employees, days, shifts, events, attendance, legends }, ref) => {
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
                                transform: scale(0.95); /* Adjust this value to scale the table (e.g. 0.9, 0.8) */
                                transform-origin: top left;
                                width: 105%; /* 1 / scale * 100 approx */
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

                    {/* Legends Display */}
                    {legends && legends.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1">
                            {legends.map(legend => (
                                <div key={legend.id} className="flex items-center gap-0.5 text-[8px] bg-gray-100 px-1 py-0.5 rounded-full border border-gray-300">
                                    <div className="w-2 h-2 rounded-full border border-gray-400" style={{ backgroundColor: legend.color }} />
                                    <span className="font-medium">
                                        {legend.from_location === legend.to_location ? (
                                            legend.from_location
                                        ) : (
                                            <>
                                                {legend.from_location} <span className="text-gray-500">→</span> {legend.to_location}
                                            </>
                                        )}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
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
                            <th className="border border-gray-400 p-1.5 w-9 bg-gray-100 text-center font-bold text-[9px]">時間</th>
                            <th className="border border-gray-400 p-1.5 w-9 bg-gray-100 text-center font-bold text-[9px]">有休</th>
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
                            {/* Empty cells for Time and Paid Leave columns */}
                            <td className="border border-gray-400 p-[5px]"></td>
                            <td className="border border-gray-400 p-[5px]"></td>
                            {/* Empty cell for repeated Name column */}
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
                                    const { isRestDay } = getDayStatus(day)

                                    let cellContent: React.ReactNode = ''
                                    let cellClass = ''

                                    if (shift) {
                                        if (shift.date) { // Just a check
                                            if (shift.shift_type === 'work' || shift.shift_type === 'work_no_break') {
                                                const start = shift.start_time?.slice(0, 5)
                                                const end = shift.end_time?.slice(0, 5)

                                                if (start && end) {
                                                    cellContent = (
                                                        <div className="flex flex-col items-center justify-center leading-[0.85] gap-[1px]">
                                                            <div>{start}</div>
                                                            <div>{end}</div>
                                                        </div>
                                                    )
                                                } else {
                                                    cellContent = 'Work'
                                                }
                                            } else if (shift.shift_type === 'paid_leave') {
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
                                            } else if (shift.shift_type === 'flex') {
                                                cellContent = 'Flex'

                                                // If flex has time, maybe show it? User "just leave it Flex"
                                                // Optionally show time if available, but let's stick to "Flex" based on request unless time is vital
                                                // Actually for Flex usually time is variable. 
                                                // "in case of Flex jus leave it "Flex"" -> Okay.
                                            } else if (shift.shift_type === 'rest') {
                                                cellContent = '休み'
                                            } else if (shift.shift_type === 'preferred_rest') {
                                                cellContent = '希望休'
                                            } else {
                                                // Should capture other types or default
                                                cellContent = shift.shift_name || shift.shift_type || ''
                                            }
                                        }

                                        // Color override
                                        if (shift.color) {
                                            // Apply background color directly for print
                                        }
                                    }

                                    return (
                                        <td
                                            key={day}
                                            className={`border border-gray-400 p-[5px] text-center whitespace-nowrap overflow-hidden text-[8px] ${cellClass} ${isRestDay ? 'bg-red-100' : ''}`}
                                            style={shift?.color ? { backgroundColor: shift.color } : {}}
                                        >
                                            {cellContent}
                                        </td>
                                    )
                                })}
                                <td className="border border-gray-400 p-[5px] text-center font-medium">
                                    {(() => {
                                        const totalExpectedHours = days.reduce((sum, day) => {
                                            const date = new Date(year, month, day)
                                            const dateStr = formatLocalDate(date)
                                            const shift = shifts.find(s => s.person_id === person.id && s.date === dateStr)
                                            if (!shift) return sum

                                            return sum + calculateExpectedHours({
                                                date: shift.date,
                                                shift_type: shift.shift_type || 'work',
                                                shift_name: shift.shift_name,
                                                start_time: shift.start_time,
                                                end_time: shift.end_time,
                                                location: shift.location,
                                                paid_leave_hours: shift.paid_leave_hours,
                                                memo: shift.memo,
                                                color: shift.color,
                                                force_break: shift.force_break
                                            })
                                        }, 0)
                                        return totalExpectedHours > 0 ? `${totalExpectedHours}h` : '-'
                                    })()}
                                </td>
                                <td className="border border-gray-400 p-[5px] text-center font-medium">
                                    {(() => {
                                        const isPartTime = Array.isArray(person.categories)
                                            ? person.categories?.[0]?.name === 'partime'
                                            : (person.categories as any)?.name === 'partime'

                                        if (isPartTime) {
                                            const totalDays = days.reduce((count, day) => {
                                                const date = new Date(year, month, day)
                                                const dateStr = formatLocalDate(date)
                                                const shift = shifts.find(s => s.person_id === person.id && s.date === dateStr)

                                                if (shift && (shift.shift_type === 'paid_leave' || shift.shift_type === 'half_paid_leave')) {
                                                    return count + 1
                                                }
                                                return count
                                            }, 0)
                                            return totalDays > 0 ? `${totalDays}d` : '-'
                                        } else {
                                            const totalHours = days.reduce((sum, day) => {
                                                const date = new Date(year, month, day)
                                                const dateStr = formatLocalDate(date)
                                                const shift = shifts.find(s => s.person_id === person.id && s.date === dateStr)

                                                if (!shift) return sum

                                                if (shift.shift_type === 'paid_leave') {
                                                    return sum + (shift.paid_leave_hours || 8)
                                                } else if (shift.shift_type === 'half_paid_leave') {
                                                    return sum + 4
                                                }
                                                return sum
                                            }, 0)
                                            return totalHours > 0 ? `${totalHours}h` : '-'
                                        }
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

MasterListPrintComponent.displayName = 'MasterListPrintComponent'
