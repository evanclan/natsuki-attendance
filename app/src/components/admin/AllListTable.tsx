'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Printer } from 'lucide-react'
import { AttendanceEditDialog } from '@/components/admin/AttendanceEditDialog'
import { formatLocalDate } from '@/lib/utils'

type Employee = {
    id: string
    full_name: string
    code: string
    role: 'employee' | 'student'
    categories?: { name: string }[]
}

type AttendanceRecord = {
    id: number
    person_id: string
    date: string
    check_in_at: string | null
    check_out_at: string | null
    break_start_at: string | null
    break_end_at: string | null
    total_work_minutes: number | null
    total_break_minutes: number | null
    status: string
    is_edited: boolean
    admin_note: string | null
}

type ShiftRecord = {
    id: number
    person_id: string
    date: string
    shift_type: string
    start_time: string | null
    end_time: string | null
    color: string | null
    shift_name: string | null
    memo: string | null
}

type SystemEvent = {
    id: string
    event_date: string
    title: string
    event_type: 'holiday' | 'rest_day' | 'work_day' | 'event' | 'other'
    is_holiday: boolean
}

type AllListTableProps = {
    year: number
    month: number
    employees: Employee[]
    students: Employee[]
    attendance: AttendanceRecord[]
    shifts: ShiftRecord[]
    events: SystemEvent[]
}

export function AllListTable({ year, month, employees, students, attendance, shifts, events }: AllListTableProps) {
    const router = useRouter()
    const [dialogOpen, setDialogOpen] = useState(false)
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [selectedAttendance, setSelectedAttendance] = useState<AttendanceRecord | null>(null)

    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

    const handlePrint = (type: string) => {
        const url = `/print/all_list?year=${year}&month=${month}&type=${type}`
        window.open(url, '_blank')
    }

    // Filter students logic matching MasterList
    const filteredStudents = students.filter(p => {
        // Hide students with ONLY the "Satasaurus" category
        // Students with multiple categories (e.g., Academy + Satasaurus) should still be shown
        const categories = p.categories || []
        if (categories.length === 1 && categories[0]?.name?.toLowerCase() === 'satursaurus') {
            return false
        }
        return true
    })

    const satasaurusStudents = students.filter(p => {
        const categories = p.categories || []
        return categories.some((c: any) => c?.name?.toLowerCase() === 'satursaurus')
    })

    // Filter days for Satursaurus
    const saturdayDays = days.filter(day => {
        const date = new Date(year, month, day)
        return date.getDay() === 6
    })

    const handlePreviousMonth = () => {
        const newDate = new Date(year, month - 1, 1)
        router.push(`/admin/all_list?year=${newDate.getFullYear()}&month=${newDate.getMonth()}`)
    }

    const handleNextMonth = () => {
        const newDate = new Date(year, month + 1, 1)
        router.push(`/admin/all_list?year=${newDate.getFullYear()}&month=${newDate.getMonth()}`)
    }

    const handleCellClick = (employee: Employee, day: number) => {
        const date = new Date(year, month, day)
        const dateStr = formatLocalDate(date)
        const attendanceRecord = attendance.find(a => a.person_id === employee.id && a.date === dateStr)

        setSelectedEmployee(employee)
        setSelectedDate(date)
        setSelectedAttendance(attendanceRecord || null)
        setDialogOpen(true)
    }

    const handleSaveAttendance = () => {
        router.refresh()
        setDialogOpen(false)
    }

    const getDayEvents = (day: number) => {
        const date = new Date(year, month, day)
        const dateStr = formatLocalDate(date)
        return events.filter(e => e.event_date === dateStr)
    }

    const getDayStatus = (day: number) => {
        const date = new Date(year, month, day)
        const dayOfWeek = date.getDay()
        const dayEvents = getDayEvents(day)

        const isHolidayEvent = dayEvents.some(e => e.event_type === 'holiday' || e.is_holiday)
        const isRestDayEvent = dayEvents.some(e => e.event_type === 'rest_day')
        const isWorkDayEvent = dayEvents.some(e => e.event_type === 'work_day')

        let isRestDay = false
        // Default: Sunday is rest
        if (dayOfWeek === 0) {
            isRestDay = true
        }

        // Overrides
        if (isWorkDayEvent) {
            isRestDay = false
        } else if (isRestDayEvent || isHolidayEvent) {
            isRestDay = true
        }

        return {
            isRestDay,
            isWeekend: dayOfWeek === 0 || dayOfWeek === 6
        }
    }

    const isWeekend = (day: number) => {
        return getDayStatus(day).isWeekend
    }

    const formatTime = (isoString: string | null) => {
        if (!isoString) return '-'
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    }

    const calculateMonthlyStats = (employeeId: string) => {
        const employeeAttendance = attendance.filter(a => a.person_id === employeeId)
        const totalMinutes = employeeAttendance.reduce((sum, a) => sum + (a.total_work_minutes || 0), 0)
        const totalHours = Math.floor(totalMinutes / 60)
        const totalMins = totalMinutes % 60
        const daysAttended = employeeAttendance.filter(a => a.check_in_at || a.check_out_at).length
        return {
            totalHours: `${totalHours}:${totalMins.toString().padStart(2, '0')}`,
            daysAttended
        }
    }

    const getShiftLabel = (type: string) => {
        switch (type) {
            case 'work': return 'Work'
            case 'paid_leave': return 'Paid Leave'
            case 'half_paid_leave': return 'Half Paid'
            case 'business_trip': return 'B. Trip'
            case 'special_leave': return 'Special'
            case 'rest': return 'Rest'
            case 'absent': return 'Absent'
            case 'flex': return 'Flex'
            case 'work_no_break': return 'Work (NB)'
            default: return type
        }
    }

    const renderRow = (employee: Employee, daysToRender: number[]) => {
        const stats = calculateMonthlyStats(employee.id)

        return (
            <div key={employee.id} className="flex border-b border-border hover:bg-slate-50">
                <div className="sticky left-0 z-10 w-48 min-w-[192px] p-2 border-r border-border bg-background flex flex-col justify-center">
                    <div className="font-medium truncate" title={employee.full_name}>{employee.full_name}</div>

                    <div className="text-xs text-blue-600 mt-1">
                        {stats.daysAttended} days • {stats.totalHours}h
                    </div>
                </div>
                {daysToRender.map(day => {
                    const date = new Date(year, month, day)
                    const dateStr = formatLocalDate(date)
                    const attendanceRecord = attendance.find(a => a.person_id === employee.id && a.date === dateStr)
                    const shift = shifts.find(s => s.person_id === employee.id && s.date === dateStr)
                    const dayStatus = getDayStatus(day)
                    const isRest = dayStatus.isRestDay

                    // Determine background color
                    let bgStyle = {}
                    if (shift?.color) {
                        bgStyle = { backgroundColor: shift.color }
                    } else if (isRest || shift?.shift_type === 'rest' || shift?.shift_type === 'preferred_rest') {
                        bgStyle = { backgroundColor: '#fef2f2' } // red-50 equivalent
                    }

                    // Hover effect class
                    const hoverClass = shift?.color ? 'hover:opacity-90' : 'hover:bg-blue-50'

                    return (
                        <div
                            key={day}
                            onClick={() => handleCellClick(employee, day)}
                            style={bgStyle}
                            className={`
                                min-w-[120px] p-2 border-r border-border cursor-pointer
                                transition-colors flex flex-col justify-between
                                h-auto min-h-[60px]
                                ${hoverClass}
                            `}
                        >
                            {/* Top: Shift Status/Info */}
                            <div className={`text-[10px] font-semibold text-slate-700 mb-1 px-1 rounded bg-white/40 w-full max-w-full ${shift && (shift.shift_type === 'user_note' || shift.shift_type === 'other_reason')
                                    ? 'line-clamp-2 whitespace-normal break-words leading-tight'
                                    : 'truncate'
                                }`}>
                                {shift ? (
                                    (shift.shift_type === 'user_note' || shift.shift_type === 'other_reason')
                                        ? (shift.memo || shift.shift_name || getShiftLabel(shift.shift_type))
                                        : (shift.shift_name || getShiftLabel(shift.shift_type))
                                ) : (
                                    <span className="opacity-0">-</span> // Placeholder to keep layout
                                )}
                            </div>

                            {/* Bottom: Attendance Info */}
                            {attendanceRecord ? (
                                attendanceRecord.status === 'absent' ? (
                                    <div className="flex items-center justify-center h-full">
                                        <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded border border-red-100">ABSENT</span>
                                    </div>
                                ) : (
                                    <div className="space-y-0.5 text-xs bg-white/60 p-1 rounded backdrop-blur-[1px]">
                                        <div className="flex items-center justify-between gap-1">
                                            <span className="text-muted-foreground text-[10px]">In</span>
                                            <span className="font-medium font-mono">{formatTime(attendanceRecord.check_in_at)}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-1">
                                            <span className="text-muted-foreground text-[10px]">Out</span>
                                            <span className="font-medium font-mono">{formatTime(attendanceRecord.check_out_at)}</span>
                                        </div>
                                        {attendanceRecord.is_edited && (
                                            <div className="text-[9px] text-blue-600 text-right mt-0.5">✎ Edited</div>
                                        )}
                                    </div>
                                )
                            ) : (
                                <div className="text-xs text-muted-foreground text-center mt-auto opacity-50">-</div>
                            )}
                        </div>
                    )
                })}
            </div>
        )
    }

    const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    const renderTable = (people: Employee[], title: string, daysToRender: number[], footer?: React.ReactNode) => (
        <div className="border rounded-md overflow-hidden mb-8">
            <div className="bg-muted px-4 py-2 border-b border-border font-semibold">
                {title}
            </div>
            <div className="overflow-x-auto">
                <div className="min-w-max">
                    {/* Header Row */}
                    <div className="flex border-b border-border bg-muted/50">
                        <div className="sticky left-0 z-20 w-48 min-w-[192px] p-2 border-r border-border bg-muted/50 font-semibold flex items-center">
                            Name
                        </div>
                        {daysToRender.map(day => {
                            const date = new Date(year, month, day)
                            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
                            const isRest = getDayStatus(day).isRestDay
                            return (
                                <div
                                    key={day}
                                    className={`
                                        min-w-[120px] p-1 border-r border-border text-center flex flex-col justify-center
                                        ${isRest ? 'text-red-500 bg-red-50/50' : ''}
                                    `}
                                >
                                    <div className="text-sm font-bold">{day}</div>
                                    <div className="text-xs">{dayName}</div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Person Rows */}
                    {people.map(p => renderRow(p, daysToRender))}
                </div>
            </div>
            {footer && (
                <div className="p-2 border-t border-border bg-slate-50 flex justify-end">
                    {footer}
                </div>
            )}
        </div>
    )

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">{monthName}</h2>
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={handleNextMonth}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {renderTable(employees, "Employees", days, (
                <Button onClick={() => handlePrint('employees')} size="sm" variant="outline" className="gap-2">
                    <Printer className="h-4 w-4" />
                    Print Table
                </Button>
            ))}
            {renderTable(filteredStudents, "Students", days, (
                <Button onClick={() => handlePrint('students')} size="sm" variant="outline" className="gap-2">
                    <Printer className="h-4 w-4" />
                    Print Table
                </Button>
            ))}
            {satasaurusStudents.length > 0 && renderTable(satasaurusStudents, "Satursaurus Students", saturdayDays, (
                <Button onClick={() => handlePrint('satursaurus')} size="sm" variant="outline" className="gap-2">
                    <Printer className="h-4 w-4" />
                    Print Table
                </Button>
            ))}

            {selectedEmployee && selectedDate && (
                <AttendanceEditDialog
                    open={dialogOpen}
                    onOpenChange={setDialogOpen}
                    employeeName={selectedEmployee.full_name}
                    employeeId={selectedEmployee.id}
                    date={selectedDate}
                    currentAttendance={selectedAttendance}
                    onSave={handleSaveAttendance}
                />
            )}
        </div>
    )
}
