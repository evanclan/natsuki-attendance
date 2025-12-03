'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { getSystemEvents, SystemEvent } from '@/app/admin/settings/actions'
import { SystemEventDialog } from '@/components/admin/SystemEventDialog'
import { Badge } from "@/components/ui/badge"

export default function CalendarSettingsPage() {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [events, setEvents] = useState<SystemEvent[]>([])
    const [loading, setLoading] = useState(false)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [selectedEvent, setSelectedEvent] = useState<SystemEvent | null>(null)

    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth()

    useEffect(() => {
        loadEvents()
    }, [currentYear, currentMonth])

    const loadEvents = async () => {
        setLoading(true)
        // Get first and last day of month
        const firstDay = new Date(currentYear, currentMonth, 1)
        const lastDay = new Date(currentYear, currentMonth + 1, 0)

        const result = await getSystemEvents(
            firstDay.toISOString().split('T')[0],
            lastDay.toISOString().split('T')[0]
        )

        if (result.success && result.data) {
            setEvents(result.data as SystemEvent[])
        }
        setLoading(false)
    }

    const handleDateClick = (date: Date) => {
        setSelectedDate(date)
        // Check if there's an event on this date? 
        // Actually, we might want to show a list of events for that day if multiple are allowed.
        // But for now, let's assume we can click a day to add an event.
        // If we click an existing event badge, we edit it.

        setSelectedEvent(null)
        setDialogOpen(true)
    }

    const handleEventClick = (e: React.MouseEvent, event: SystemEvent) => {
        e.stopPropagation()
        setSelectedDate(new Date(event.event_date + 'T00:00:00'))
        setSelectedEvent(event)
        setDialogOpen(true)
    }

    const handlePreviousMonth = () => {
        setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
    }

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
    }

    const getEventsForDate = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0]
        return events.filter(e => e.event_date === dateStr)
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

        for (let i = 0; i < firstDay; i++) {
            days.push(
                <div key={`empty-${i}`} className="p-2 border border-border/50 bg-slate-50/50"></div>
            )
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentYear, currentMonth, day)
            const dayEvents = getEventsForDate(date)
            const isToday =
                date.getDate() === new Date().getDate() &&
                date.getMonth() === new Date().getMonth() &&
                date.getFullYear() === new Date().getFullYear()

            // Weekend Logic
            const dayOfWeek = date.getDay()
            const isWeekend = dayOfWeek === 0 // 0 is Sunday

            // Check for specific event types
            const isHolidayEvent = dayEvents.some(e => e.event_type === 'holiday' || e.is_holiday)
            const isRestDayEvent = dayEvents.some(e => e.event_type === 'rest_day')
            const isWorkDayEvent = dayEvents.some(e => e.event_type === 'work_day')
            const isBlueEvent = dayEvents.some(e => e.event_type === 'event')

            // Determine if it should be shown as a "Rest Day" / Holiday style
            let isRestDayOrHoliday = false
            if (isHolidayEvent || isRestDayEvent) {
                isRestDayOrHoliday = true
            } else if (isWorkDayEvent || isBlueEvent) {
                isRestDayOrHoliday = false
            } else if (isWeekend) {
                isRestDayOrHoliday = true
            }

            days.push(
                <div
                    key={day}
                    className={`
                        p-2 border border-border/50 min-h-[100px] cursor-pointer
                        hover:bg-accent transition-colors relative group
                        ${isToday ? 'bg-accent/50' : ''}
                        ${isRestDayOrHoliday ? 'bg-red-50 hover:bg-red-100' : ''}
                    `}
                    onClick={() => handleDateClick(date)}
                >
                    <div className="flex justify-between items-start">
                        <div className={`
                            text-sm font-medium mb-1 h-7 w-7 flex items-center justify-center rounded-full
                            ${isToday ? 'bg-primary text-primary-foreground' : ''}
                            ${isRestDayOrHoliday && !isToday ? 'text-red-600' : ''}
                        `}>
                            {day}
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                                e.stopPropagation()
                                handleDateClick(date)
                            }}
                        >
                            <Plus className="h-3 w-3" />
                        </Button>
                    </div>

                    {isWeekend && !isWorkDayEvent && !isBlueEvent && !isHolidayEvent && !isRestDayEvent && (
                        <div className="text-[10px] text-red-500 font-medium mb-1">Rest Day</div>
                    )}
                    {isRestDayEvent && (
                        <div className="text-[10px] text-red-500 font-medium mb-1">Rest Day</div>
                    )}

                    <div className="space-y-1 mt-1">
                        {dayEvents.map(event => (
                            <div
                                key={event.id}
                                onClick={(e) => handleEventClick(e, event)}
                                className={`
                                    text-xs p-1 rounded px-2 truncate cursor-pointer hover:opacity-80
                                    ${(event.event_type === 'holiday' || event.is_holiday || event.event_type === 'rest_day') ? 'bg-red-100 text-red-700 border border-red-200' :
                                        event.event_type === 'work_day' ? 'bg-green-100 text-green-700 border border-green-200' :
                                            'bg-blue-100 text-blue-700 border border-blue-200'}
                                `}
                            >
                                {event.title}
                            </div>
                        ))}
                    </div>
                </div>
            )
        }

        return days
    }

    const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    return (
        <div className="container mx-auto py-8">
            <div className="flex items-center gap-4 mb-6">
                <Link href="/admin/settings">
                    <Button variant="outline" size="sm">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Settings
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold">System Calendar</h1>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>{monthName}</CardTitle>
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
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-7 gap-0">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                            <div
                                key={day}
                                className="p-2 text-center text-sm font-medium text-muted-foreground border border-border bg-slate-50"
                            >
                                {day}
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-0 border-l border-t border-border">
                        {renderCalendarDays()}
                    </div>
                </CardContent>
            </Card>

            <SystemEventDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                selectedDate={selectedDate}
                existingEvent={selectedEvent}
                onEventSaved={loadEvents}
            />
        </div>
    )
}
