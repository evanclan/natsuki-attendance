'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { MasterListShiftData, upsertShift } from '@/app/admin/masterlist/actions'
import { ShiftCell } from './ShiftCell'
import { ShiftEditDialog } from './ShiftEditDialog'

type Person = {
    id: string
    full_name: string
    code: string
    role: 'employee' | 'student'
}

type SystemEvent = {
    id: string
    event_date: string
    title: string
    is_holiday: boolean
}

type MasterListTableProps = {
    year: number
    month: number
    people: Person[]
    shifts: any[] // Using any for now to match raw DB result, will map to MasterListShiftData
    events: SystemEvent[]
    attendance: any[]
}

export function MasterListTable({ year, month, people, shifts, events, attendance }: MasterListTableProps) {
    const router = useRouter()
    const [dialogOpen, setDialogOpen] = useState(false)
    const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [selectedShift, setSelectedShift] = useState<MasterListShiftData | null>(null)
    const [showComputedHours, setShowComputedHours] = useState(true)

    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

    const handlePreviousMonth = () => {
        const newDate = new Date(year, month - 1, 1)
        router.push(`/admin/masterlist?year=${newDate.getFullYear()}&month=${newDate.getMonth()}`)
    }

    const handleNextMonth = () => {
        const newDate = new Date(year, month + 1, 1)
        router.push(`/admin/masterlist?year=${newDate.getFullYear()}&month=${newDate.getMonth()}`)
    }

    const handleCellClick = (person: Person, day: number) => {
        const date = new Date(year, month, day)
        const dateStr = date.toISOString().split('T')[0]
        const shift = shifts.find(s => s.person_id === person.id && s.date === dateStr)

        setSelectedPerson(person)
        setSelectedDate(date)
        setSelectedShift(shift ? {
            date: shift.date,
            shift_type: shift.shift_type || 'work', // Default to work if null (migration default)
            shift_name: shift.shift_name,
            start_time: shift.start_time,
            end_time: shift.end_time,
            location: shift.location,
            memo: shift.memo
        } : null)
        setDialogOpen(true)
    }

    const handleSaveShift = async (data: MasterListShiftData) => {
        if (!selectedPerson) return

        const result = await upsertShift(selectedPerson.id, data)
        if (result.success) {
            router.refresh()
        } else {
            alert('Failed to save shift: ' + result.error)
        }
    }

    const getDayEvents = (day: number) => {
        const date = new Date(year, month, day)
        const dateStr = date.toISOString().split('T')[0]
        return events.filter(e => e.event_date === dateStr)
    }

    const isWeekend = (day: number) => {
        const date = new Date(year, month, day)
        const dayOfWeek = date.getDay()
        return dayOfWeek === 0 || dayOfWeek === 6
    }

    // Group people by role
    const employees = people.filter(p => p.role === 'employee')
    const students = people.filter(p => p.role === 'student')

    const renderRow = (person: Person) => (
        <div key={person.id} className="flex border-b border-border hover:bg-slate-50">
            <div className="sticky left-0 z-10 w-40 min-w-[160px] p-2 border-r border-border bg-background flex flex-col justify-center">
                <div className="font-medium truncate" title={person.full_name}>{person.full_name}</div>
                <div className="text-xs text-muted-foreground">{person.code}</div>
            </div>
            {days.map(day => {
                const date = new Date(year, month, day)
                const dateStr = date.toISOString().split('T')[0]
                const shift = shifts.find(s => s.person_id === person.id && s.date === dateStr)
                const dayEvents = getDayEvents(day)
                const isHoliday = dayEvents.some(e => e.is_holiday)

                // Find attendance record
                const attendanceRecord = attendance.find(a => a.person_id === person.id && a.date === dateStr)

                let workHours: number | undefined
                if (attendanceRecord) {
                    // For paid leave, show paid leave hours, not work hours
                    if (attendanceRecord.paid_leave_minutes && attendanceRecord.paid_leave_minutes > 0) {
                        workHours = attendanceRecord.paid_leave_minutes / 60
                    } else {
                        workHours = attendanceRecord.total_work_minutes / 60
                    }
                } else if (shift) {
                    // Fallback for future/unrecorded shifts
                    if (shift.shift_type === 'business_trip') {
                        workHours = 8 // Business trip counts as work hours
                    } else if (shift.shift_type === 'paid_leave') {
                        workHours = 8 // Show paid leave hours
                    } else if (shift.shift_type === 'half_paid_leave') {
                        workHours = 4 // Show paid leave hours
                    } else if (shift.shift_type === 'special_leave') {
                        workHours = 0 // Special leave counts as 0 hours
                    }
                    // For other shift types, don't show hours until attendance is recorded
                }

                return (
                    <ShiftCell
                        key={day}
                        shift={shift ? {
                            date: shift.date,
                            shift_type: shift.shift_type || 'work',
                            shift_name: shift.shift_name,
                            start_time: shift.start_time,
                            end_time: shift.end_time,
                            location: shift.location,
                            memo: shift.memo
                        } : undefined}
                        isHoliday={isHoliday}
                        isWeekend={isWeekend(day)}
                        workHours={workHours}
                        showComputedHours={showComputedHours}
                        onClick={() => handleCellClick(person, day)}
                    />
                )
            })}
        </div>
    )

    const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">{monthName}</h2>
                <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="show-computed-hours"
                            checked={showComputedHours}
                            onCheckedChange={setShowComputedHours}
                        />
                        <Label htmlFor="show-computed-hours">Show Computed Hours</Label>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={handleNextMonth}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            <div className="border rounded-md overflow-hidden">
                <div className="overflow-x-auto">
                    <div className="min-w-max">
                        {/* Header Row */}
                        <div className="flex border-b border-border bg-muted/50">
                            <div className="sticky left-0 z-20 w-40 min-w-[160px] p-2 border-r border-border bg-muted/50 font-semibold flex items-center">
                                Name
                            </div>
                            {days.map(day => {
                                const date = new Date(year, month, day)
                                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
                                const isWknd = isWeekend(day)
                                return (
                                    <div
                                        key={day}
                                        className={`
                                            min-w-[100px] p-1 border-r border-border text-center flex flex-col justify-center
                                            ${isWknd ? 'text-red-500 bg-red-50/50' : ''}
                                        `}
                                    >
                                        <div className="text-sm font-bold">{day}</div>
                                        <div className="text-xs">{dayName}</div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Employees Section */}
                        {employees.length > 0 && (
                            <>
                                <div className="sticky left-0 z-10 bg-slate-100 p-2 font-semibold border-b border-border">
                                    Employees
                                </div>
                                {employees.map(renderRow)}
                            </>
                        )}

                        {/* Students Section */}
                        {students.length > 0 && (
                            <>
                                <div className="sticky left-0 z-10 bg-slate-100 p-2 font-semibold border-b border-border mt-2">
                                    Students
                                </div>
                                {students.map(renderRow)}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {selectedPerson && selectedDate && (
                <ShiftEditDialog
                    open={dialogOpen}
                    onOpenChange={setDialogOpen}
                    personName={selectedPerson.full_name}
                    date={selectedDate}
                    currentShift={selectedShift}
                    onSave={handleSaveShift}
                />
            )}
        </div>
    )
}
