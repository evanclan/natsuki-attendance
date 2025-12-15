'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { ChevronLeft, ChevronRight, Plus, CheckSquare, Square, Trash2, Edit, X, Copy, Clipboard } from 'lucide-react'
import { MasterListShiftData, upsertShift, deleteShift } from '@/app/admin/masterlist/actions'
import { ShiftCell } from './ShiftCell'
import { ShiftEditDialog } from './ShiftEditDialog'
import { SystemEventDialog } from '@/components/admin/SystemEventDialog'
import { SystemEvent } from '@/app/admin/settings/actions'
import { calculateExpectedHours } from '@/lib/utils'

type Person = {
    id: string
    full_name: string
    code: string
    role: 'employee' | 'student'
    job_type?: string
    categories?: {
        name: string
    }[] | null
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

    // Event Dialog State
    const [eventDialogOpen, setEventDialogOpen] = useState(false)
    const [selectedEventDate, setSelectedEventDate] = useState<Date | null>(null)
    const [selectedSystemEvent, setSelectedSystemEvent] = useState<SystemEvent | null>(null)

    // Selection Mode State
    const [isSelectionMode, setIsSelectionMode] = useState(false)
    const [selectedCells, setSelectedCells] = useState<{ personId: string, date: string }[]>([])
    const [copiedShift, setCopiedShift] = useState<MasterListShiftData | null>(null)


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

    const handleYearChange = (value: string) => {
        router.push(`/admin/masterlist?year=${value}&month=${month}`)
    }

    const handleMonthChange = (value: string) => {
        router.push(`/admin/masterlist?year=${year}&month=${value}`)
    }

    const handleCellClick = (person: Person, day: number) => {
        const date = new Date(year, month, day)
        const dateStr = date.toISOString().split('T')[0]

        if (isSelectionMode) {
            setSelectedCells(prev => {
                const exists = prev.some(c => c.personId === person.id && c.date === dateStr)
                if (exists) {
                    return prev.filter(c => !(c.personId === person.id && c.date === dateStr))
                } else {
                    return [...prev, { personId: person.id, date: dateStr }]
                }
            })
            return
        }

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
            paid_leave_hours: shift.paid_leave_hours,
            memo: shift.memo,
            color: shift.color,
            force_break: shift.force_break
        } : null)
        setDialogOpen(true)
    }

    const handleSaveShift = async (data: MasterListShiftData) => {
        if (selectedCells.length > 0) {
            // Bulk Save
            let successCount = 0
            let failCount = 0

            for (const cell of selectedCells) {
                // We need to override the date in the data with the cell's date
                const cellData = { ...data, date: cell.date }
                const result = await upsertShift(cell.personId, cellData)
                if (result.success) successCount++
                else failCount++
            }

            if (failCount > 0) {
                alert(`Saved ${successCount} shifts. Failed to save ${failCount} shifts.`)
            }

            setSelectedCells([])
            setIsSelectionMode(false)
            router.refresh()
        } else {
            // Single Save
            if (!selectedPerson) return

            const result = await upsertShift(selectedPerson.id, data)
            if (result.success) {
                router.refresh()
            } else {
                alert('Failed to save shift: ' + result.error)
            }
        }
    }

    const handleBulkDelete = async () => {
        if (!confirm(`Are you sure you want to delete shifts for ${selectedCells.length} selected cells?`)) return

        let successCount = 0
        let failCount = 0

        for (const cell of selectedCells) {
            const result = await deleteShift(cell.personId, cell.date)
            if (result.success) successCount++
            else failCount++
        }

        if (failCount > 0) {
            alert(`Deleted ${successCount} shifts. Failed to delete ${failCount} shifts.`)
        }

        setSelectedCells([])
        setIsSelectionMode(false)
        router.refresh()
    }

    const handleCopy = () => {
        if (selectedCells.length !== 1) return

        const cell = selectedCells[0]
        const shift = shifts.find(s => s.person_id === cell.personId && s.date === cell.date)

        if (shift) {
            setCopiedShift({
                date: shift.date, // This will be overwritten on paste
                shift_type: shift.shift_type,
                shift_name: shift.shift_name,
                start_time: shift.start_time,
                end_time: shift.end_time,
                location: shift.location,
                paid_leave_hours: shift.paid_leave_hours,
                memo: shift.memo,
                color: shift.color,
                force_break: shift.force_break
            })
        } else {
            alert("No shift data to copy from the selected cell.")
        }
    }

    const handlePaste = async () => {
        if (!copiedShift || selectedCells.length === 0) return

        if (!confirm(`Paste copied shift to ${selectedCells.length} cells? This will overwrite existing shifts.`)) return

        let successCount = 0
        let failCount = 0

        for (const cell of selectedCells) {
            const cellData = { ...copiedShift, date: cell.date }
            const result = await upsertShift(cell.personId, cellData)
            if (result.success) successCount++
            else failCount++
        }

        if (failCount > 0) {
            alert(`Pasted to ${successCount} cells. Failed to for ${failCount} cells.`)
        }

        setSelectedCells([])
        setIsSelectionMode(false)
        setCopiedShift(null) // Optional: clear clipboard after paste, or keep it for multiple pastes
        router.refresh()
    }

    const handleEventClick = (date: Date, event?: SystemEvent) => {
        setSelectedEventDate(date)
        setSelectedSystemEvent(event || null)
        setEventDialogOpen(true)
    }

    const handleEventSaved = () => {
        router.refresh()
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
            <div className="sticky left-0 z-30 w-40 min-w-[160px] p-2 border-r border-border bg-background flex flex-col justify-center relative">
                <div className="font-medium truncate" title={person.full_name}>{person.full_name}</div>
                <div className="text-xs text-muted-foreground">{person.job_type || person.code}</div>
                <div className="absolute bottom-1 right-1 text-[10px] text-muted-foreground/70 font-mono">
                    {person.categories?.[0]?.name || '-'}
                </div>
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
                            paid_leave_hours: shift.paid_leave_hours,
                            memo: shift.memo,
                            color: shift.color,
                            force_break: shift.force_break
                        } : undefined}
                        isHoliday={isHoliday}
                        isWeekend={isWeekend(day)}
                        workHours={workHours}
                        showComputedHours={showComputedHours}
                        isSelected={selectedCells.some(c => c.personId === person.id && c.date === dateStr)}
                        isSelectionMode={isSelectionMode}
                        onClick={() => handleCellClick(person, day)}
                    />
                )
            })}
            {person.role !== 'student' && (
                <>
                    <div className="min-w-[80px] p-2 border-r border-border flex items-center justify-center font-mono text-sm">
                        {(() => {
                            const totalExpectedHours = days.reduce((sum, day) => {
                                const date = new Date(year, month, day)
                                const dateStr = date.toISOString().split('T')[0]
                                const shift = shifts.find(s => s.person_id === person.id && s.date === dateStr)
                                if (!shift) return sum

                                // Use the same helper function as ShiftCell
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
                            return `${totalExpectedHours}h`
                        })()}
                    </div>
                    <div className="min-w-[80px] p-2 border-r border-border flex items-center justify-center font-mono text-sm">
                        {(() => {
                            const isPartTime = person.categories?.[0]?.name === 'partime'

                            if (isPartTime) {
                                // Count days for part-time
                                const totalDays = days.reduce((count, day) => {
                                    const date = new Date(year, month, day)
                                    const dateStr = date.toISOString().split('T')[0]
                                    const shift = shifts.find(s => s.person_id === person.id && s.date === dateStr)

                                    if (shift && (shift.shift_type === 'paid_leave' || shift.shift_type === 'half_paid_leave')) {
                                        return count + 1
                                    }
                                    return count
                                }, 0)
                                return totalDays > 0 ? `${totalDays}d` : '-'
                            } else {
                                // Count hours for others
                                const totalHours = days.reduce((sum, day) => {
                                    const date = new Date(year, month, day)
                                    const dateStr = date.toISOString().split('T')[0]
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
                    </div>
                </>
            )}
        </div>
    )

    const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    // Generate years for dropdown (current year +/- 5 years)
    const currentYear = new Date().getFullYear()
    const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i)

    // Month names
    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ]

    const renderHeaderRow = (label: string, showSummary: boolean = true) => (
        <div className="flex border-b border-border bg-muted sticky top-0 z-40">
            <div className="sticky left-0 z-50 w-40 min-w-[160px] p-2 border-r border-border bg-muted font-semibold flex items-center">
                {label}
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
            {showSummary && (
                <>
                    <div className="min-w-[80px] p-2 border-r border-border bg-muted font-semibold flex items-center justify-center text-xs">
                        Working hours
                    </div>
                    <div className="min-w-[80px] p-2 border-r border-border bg-muted font-semibold flex items-center justify-center text-xs">
                        Paid Leave
                    </div>
                </>
            )}
        </div>
    )

    const renderEventsRow = () => (
        <div className="flex border-b border-border bg-blue-50/30">
            <div className="sticky left-0 z-20 w-40 min-w-[160px] p-2 border-r border-border bg-blue-50/30 font-semibold flex items-center text-blue-700">
                Events
            </div>
            {days.map(day => {
                const date = new Date(year, month, day)
                const dayEvents = getDayEvents(day)
                const isWknd = isWeekend(day)

                return (
                    <div
                        key={day}
                        className={`
                            min-w-[100px] p-1 border-r border-border relative group cursor-pointer hover:bg-blue-100/50 transition-colors
                            ${isWknd ? 'bg-red-50/30' : ''}
                        `}
                        onClick={() => handleEventClick(date)}
                    >
                        <div className="space-y-1 min-h-[40px]">
                            {dayEvents.map(event => (
                                <div
                                    key={event.id}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleEventClick(date, event)
                                    }}
                                    className={`
                                        text-[10px] p-1 rounded px-2 truncate cursor-pointer hover:opacity-80
                                        ${(event.event_type === 'holiday' || event.is_holiday || event.event_type === 'rest_day') ? 'bg-red-100 text-red-700 border border-red-200' :
                                            event.event_type === 'work_day' ? 'bg-green-100 text-green-700 border border-green-200' :
                                                'bg-blue-100 text-blue-700 border border-blue-200'}
                                    `}
                                    title={event.title}
                                >
                                    {event.title}
                                </div>
                            ))}
                            {dayEvents.length === 0 && (
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                                    <Plus className="h-4 w-4 text-blue-400" />
                                </div>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )

    return (
        <div className="space-y-8 pb-32">
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

                    <div className="flex items-center space-x-2">
                        <Button
                            variant={isSelectionMode ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => {
                                setIsSelectionMode(!isSelectionMode)
                                if (isSelectionMode) setSelectedCells([]) // Clear selection when exiting
                            }}
                            className={isSelectionMode ? "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200" : ""}
                        >
                            {isSelectionMode ? <CheckSquare className="h-4 w-4 mr-2" /> : <Square className="h-4 w-4 mr-2" />}
                            Multiple Box Selection
                        </Button>
                    </div>

                    <div className="flex items-center gap-2">
                        <Select value={year.toString()} onValueChange={handleYearChange}>
                            <SelectTrigger className="w-[100px]">
                                <SelectValue placeholder="Year" />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map(y => (
                                    <SelectItem key={y} value={y.toString()}>
                                        {y}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={month.toString()} onValueChange={handleMonthChange}>
                            <SelectTrigger className="w-[120px]">
                                <SelectValue placeholder="Month" />
                            </SelectTrigger>
                            <SelectContent>
                                {monthNames.map((name, index) => (
                                    <SelectItem key={index} value={index.toString()}>
                                        {name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
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

            {/* Employees Section */}
            {employees.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Employees</h3>
                    <div className="border rounded-md overflow-hidden bg-background">
                        <div className="overflow-auto max-h-[60vh]">
                            <div className="min-w-max">
                                {renderHeaderRow("Employees")}
                                {renderEventsRow()}
                                {employees.map(renderRow)}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Students Section */}
            {students.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Students</h3>
                    <div className="border rounded-md overflow-hidden bg-background">
                        <div className="overflow-auto max-h-[60vh]">
                            <div className="min-w-max">
                                {renderHeaderRow("Students", false)}
                                {renderEventsRow()}
                                {students.map(renderRow)}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {
                selectedPerson && selectedDate && (
                    <ShiftEditDialog
                        open={dialogOpen}
                        onOpenChange={setDialogOpen}
                        personName={selectedPerson.full_name}
                        date={selectedDate}
                        currentShift={selectedShift}
                        onSave={handleSaveShift}
                    />
                )
            }

            <SystemEventDialog
                open={eventDialogOpen}
                onOpenChange={setEventDialogOpen}
                selectedDate={selectedEventDate}
                existingEvent={selectedSystemEvent}
                onEventSaved={handleEventSaved}
            />


            {/* Bulk Actions Bar */}
            {
                isSelectionMode && selectedCells.length > 0 && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white shadow-lg border rounded-full px-6 py-3 flex items-center gap-4 z-50 animate-in slide-in-from-bottom-10 fade-in">
                        <div className="font-medium text-sm">
                            {selectedCells.length} selected
                        </div>
                        <div className="h-4 w-px bg-border" />
                        <Button
                            size="sm"
                            onClick={() => {
                                // Open dialog for bulk edit
                                setSelectedPerson({ id: 'bulk', full_name: `${selectedCells.length} Employees`, code: '', role: 'employee' }) // Dummy person
                                setSelectedDate(new Date()) // Dummy date
                                setSelectedShift(null) // Default new shift
                                setDialogOpen(true)
                            }}
                        >
                            <Edit className="h-4 w-4 mr-2" />
                            Set Shift
                        </Button>
                        <Button
                            size="sm"
                            variant="destructive"
                            onClick={handleBulkDelete}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                        </Button>
                        {selectedCells.length === 1 && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCopy}
                            >
                                <Copy className="h-4 w-4 mr-2" />
                                Copy
                            </Button>
                        )}
                        {copiedShift && selectedCells.length > 0 && (
                            <Button
                                size="sm"
                                variant="default"
                                onClick={handlePaste}
                                className="bg-green-600 hover:bg-green-700 text-white"
                            >
                                <Clipboard className="h-4 w-4 mr-2" />
                                Paste
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedCells([])}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                )
            }
        </div >
    )
}
