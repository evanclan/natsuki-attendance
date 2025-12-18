'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getShiftsByPerson, getShiftByPersonAndDate } from '@/app/admin/shift-actions/actions'
import { getSystemEvents, SystemEvent } from '@/app/admin/settings/actions'
import { ShiftDialog } from './ShiftDialog'
import { formatLocalDate } from '@/lib/utils'

type Shift = {
    id: number
    person_id: string
    date: string
    shift_type?: string
    shift_name?: string | null
    start_time?: string | null
    end_time?: string | null
    location?: string | null
    memo?: string | null
    created_by?: string | null
    updated_by?: string | null
    created_at: string
    updated_at: string
}

type ShiftCalendarProps = {
    personId: string
    readOnly?: boolean
}

export function ShiftCalendar({ personId, readOnly = false }: ShiftCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [shifts, setShifts] = useState<Shift[]>([])
    const [systemEvents, setSystemEvents] = useState<SystemEvent[]>([])
    const [loading, setLoading] = useState(false)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [selectedShift, setSelectedShift] = useState<Shift | null>(null)

    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth()

    useEffect(() => {
        loadData()
    }, [personId, currentYear, currentMonth])

    const loadData = async () => {
        setLoading(true)

        // Fetch shifts
        const shiftsPromise = getShiftsByPerson(personId, currentYear, currentMonth)

        // Fetch system events
        const firstDay = new Date(currentYear, currentMonth, 1)
        const lastDay = new Date(currentYear, currentMonth + 1, 0)
        const eventsPromise = getSystemEvents(
            formatLocalDate(firstDay),
            formatLocalDate(lastDay)
        )

        const [shiftsResult, eventsResult] = await Promise.all([shiftsPromise, eventsPromise])

        if (shiftsResult.success && shiftsResult.data) {
            setShifts(shiftsResult.data as Shift[])
        }

        if (eventsResult.success && eventsResult.data) {
            setSystemEvents(eventsResult.data as SystemEvent[])
        }

        setLoading(false)
    }

    const handleDateClick = async (date: Date) => {
        if (readOnly) return // Don't allow clicking in read-only mode (unless we want to show details?)

        setSelectedDate(date)

        // Check if there's an existing shift for this date
        const dateStr = formatLocalDate(date)
        const result = await getShiftByPersonAndDate(personId, dateStr)

        if (result.success && result.data) {
            setSelectedShift(result.data as Shift)
        } else {
            setSelectedShift(null)
        }

        setDialogOpen(true)
    }

    const handleShiftSaved = () => {
        loadData()
    }

    const handlePreviousMonth = () => {
        setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
    }

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
    }

    const getShiftForDate = (date: Date): Shift | undefined => {
        const dateStr = formatLocalDate(date)
        return shifts.find(shift => shift.date === dateStr)
    }

    const getEventsForDate = (date: Date) => {
        const dateStr = formatLocalDate(date)
        return systemEvents.filter(e => e.event_date === dateStr)
    }

    const getDaysInMonth = () => {
        return new Date(currentYear, currentMonth + 1, 0).getDate()
    }

    const getFirstDayOfMonth = () => {
        return new Date(currentYear, currentMonth, 1).getDay()
    }

    const renderCalendarDays = () => {
        const daysInMonth = getDaysInMonth()
        const firstDay = getFirstDayOfMonth()
        const days: React.ReactElement[] = []

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < firstDay; i++) {
            days.push(
                <div key={`empty-${i}`} className="p-2 border border-border/50 bg-slate-50/30"></div>
            )
        }

        // Add cells for each day of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentYear, currentMonth, day)
            const shift = getShiftForDate(date)
            const dayEvents = getEventsForDate(date)
            const isToday =
                date.getDate() === new Date().getDate() &&
                date.getMonth() === new Date().getMonth() &&
                date.getFullYear() === new Date().getFullYear()

            // Weekend Logic
            const dayOfWeek = date.getDay()
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6 // 0 is Sunday, 6 is Saturday

            // Check for specific event types
            const isHolidayEvent = dayEvents.some(e => e.event_type === 'holiday' || e.is_holiday) // Handle legacy is_holiday too
            const isRestDayEvent = dayEvents.some(e => e.event_type === 'rest_day')
            const isWorkDayEvent = dayEvents.some(e => e.event_type === 'work_day')
            const isBlueEvent = dayEvents.some(e => e.event_type === 'event')

            // Determine if it should be shown as a "Rest Day" / Holiday style (Red)
            // Priority:
            // 1. Holiday Event -> Red
            // 2. Rest Day Event -> Red
            // 3. Work Day Event -> Normal
            // 4. Blue Event -> Normal (Blue badge, white background)
            // 5. Weekend -> Red (Default Rest Day)
            // 6. Weekday -> Normal

            let isRestDayOrHoliday = false

            if (isHolidayEvent || isRestDayEvent) {
                isRestDayOrHoliday = true
            } else if (isWorkDayEvent || isBlueEvent) {
                // Explicit work day OR generic event overrides weekend rest day
                isRestDayOrHoliday = false
            } else if (isWeekend) {
                isRestDayOrHoliday = true
            }

            days.push(
                <div
                    key={day}
                    className={`
                        p-2 border border-border/50 min-h-[100px] cursor-pointer
                        ${!readOnly ? 'hover:bg-accent' : ''}
                        transition-colors
                        ${isToday ? 'bg-accent/50' : ''}
                        ${isRestDayOrHoliday ? 'bg-red-50' : ''}
                    `}
                    onClick={() => handleDateClick(date)}
                >
                    <div className="flex flex-col h-full">
                        <div className={`
                            text-sm font-medium mb-1 
                            ${isToday ? 'text-primary' : ''}
                            ${isRestDayOrHoliday ? 'text-red-600' : ''}
                        `}>
                            {day}
                            {isWeekend && !isWorkDayEvent && !isBlueEvent && !isHolidayEvent && !isRestDayEvent && (
                                <span className="text-[10px] ml-1 font-normal opacity-70">Rest Day</span>
                            )}
                            {isRestDayEvent && (
                                <span className="text-[10px] ml-1 font-normal opacity-70">Rest Day</span>
                            )}
                        </div>

                        {/* System Events */}
                        <div className="space-y-1 mb-1">
                            {dayEvents.map(event => (
                                <div
                                    key={event.id}
                                    className={`
                                        text-[10px] px-1 rounded truncate font-medium
                                        ${(event.event_type === 'holiday' || event.is_holiday || event.event_type === 'rest_day') ? 'text-red-700 bg-red-100/50' :
                                            event.event_type === 'work_day' ? 'text-green-700 bg-green-100/50' :
                                                'text-blue-700 bg-blue-100/50'}
                                    `}
                                    title={event.title + (event.description ? `: ${event.description}` : '')}
                                >
                                    {event.title}
                                </div>
                            ))}
                        </div>

                        {/* Shift Info */}
                        {shift && (
                            <div className="flex-1 space-y-1 mt-1 border-t border-border/30 pt-1">
                                {shift.shift_type && shift.shift_type !== 'work' && (
                                    <Badge variant="outline" className={`
                                        text-[10px] px-1 h-5 truncate w-full mb-0.5
                                        ${shift.shift_type === 'paid_leave' ? 'bg-green-50 text-green-700 border-green-200' : ''}
                                        ${shift.shift_type === 'half_paid_leave' ? 'bg-green-50 text-green-700 border-green-200' : ''}
                                        ${shift.shift_type === 'flex' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                                        ${shift.shift_type === 'business_trip' ? 'bg-purple-50 text-purple-700 border-purple-200' : ''}
                                        ${shift.shift_type === 'rest' ? 'bg-red-50 text-red-700 border-red-200' : ''}
                                        ${shift.shift_type === 'absent' ? 'bg-gray-100 text-gray-700 border-gray-200' : ''}
                                    `}>
                                        {shift.shift_type.replace('_', ' ')}
                                    </Badge>
                                )}
                                {shift.shift_name && (
                                    <Badge variant="secondary" className="text-[10px] px-1 h-5 truncate w-full">
                                        {shift.shift_name}
                                    </Badge>
                                )}
                                {shift.location && (
                                    <div className="text-[10px] text-muted-foreground truncate">
                                        📍 {shift.location}
                                    </div>
                                )}
                                {shift.memo && (
                                    <div className="text-[10px] text-muted-foreground line-clamp-1">
                                        {shift.memo}
                                    </div>
                                )}
                                {(shift.start_time || shift.end_time) && (
                                    <div className="text-[10px] text-muted-foreground">
                                        🕐 {shift.start_time || '?'} - {shift.end_time || '?'}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )
        }

        return days
    }

    const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    return (
        <div className="space-y-4">
            {/* Calendar Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{monthName}</h3>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handlePreviousMonth}
                        disabled={loading}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handleNextMonth}
                        disabled={loading}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Day of Week Headers */}
            <div className="grid grid-cols-7 gap-0">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div
                        key={day}
                        className="p-2 text-center text-sm font-medium text-muted-foreground border border-border"
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-0 border-l border-t border-border">
                {renderCalendarDays()}
            </div>

            {/* Shift Dialog */}
            <ShiftDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                personId={personId}
                selectedDate={selectedDate}
                existingShift={selectedShift}
                onShiftSaved={handleShiftSaved}
                readOnly={readOnly}
            />
        </div>
    )
}
