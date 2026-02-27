'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Trash2, Tag } from 'lucide-react'
import { getSystemEvents, getEventTypes, createEventType, deleteEventType, SystemEvent, EventType } from '@/app/admin/settings/actions'
import { SystemEventDialog } from '@/components/admin/SystemEventDialog'
import { Badge } from "@/components/ui/badge"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { formatLocalDate } from '@/lib/utils'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

const COLOR_OPTIONS = [
    { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
    { value: 'red', label: 'Red', class: 'bg-red-500' },
    { value: 'green', label: 'Green', class: 'bg-green-500' },
    { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
    { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
    { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
]

function getEventBadgeClasses(eventType: string, isHoliday: boolean, eventTypes: EventType[]) {
    // Built-in types keep their original styling
    if (eventType === 'holiday' || isHoliday || eventType === 'rest_day') {
        return 'bg-red-100 text-red-700 border border-red-200'
    }
    if (eventType === 'work_day') {
        return 'bg-green-100 text-green-700 border border-green-200'
    }

    // Look up custom type color
    const typeInfo = eventTypes.find(t => t.slug === eventType)
    const color = typeInfo?.color || 'blue'

    switch (color) {
        case 'red': return 'bg-red-100 text-red-700 border border-red-200'
        case 'green': return 'bg-green-100 text-green-700 border border-green-200'
        case 'purple': return 'bg-purple-100 text-purple-700 border border-purple-200'
        case 'orange': return 'bg-orange-100 text-orange-700 border border-orange-200'
        case 'yellow': return 'bg-yellow-100 text-yellow-700 border border-yellow-200'
        default: return 'bg-blue-100 text-blue-700 border border-blue-200'
    }
}

export default function CalendarSettingsPage() {
    // Default to next month (advance by 1 month for shift preparation)
    const [currentDate, setCurrentDate] = useState(() => {
        const now = new Date()
        const nextMonth = now.getMonth() + 1
        if (nextMonth > 11) {
            return new Date(now.getFullYear() + 1, 0, 1) // January of next year
        }
        return new Date(now.getFullYear(), nextMonth, 1)
    })
    const [events, setEvents] = useState<SystemEvent[]>([])
    const [loading, setLoading] = useState(false)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [selectedEvent, setSelectedEvent] = useState<SystemEvent | null>(null)

    // Event Type Management state
    const [eventTypes, setEventTypes] = useState<EventType[]>([])
    const [newTypeName, setNewTypeName] = useState('')
    const [newTypeColor, setNewTypeColor] = useState('blue')
    const [typeLoading, setTypeLoading] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)

    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth()

    useEffect(() => {
        loadEvents()
    }, [currentYear, currentMonth])

    useEffect(() => {
        loadEventTypes()
    }, [])

    const loadEvents = async () => {
        setLoading(true)
        const firstDay = new Date(currentYear, currentMonth, 1)
        const lastDay = new Date(currentYear, currentMonth + 1, 0)

        const result = await getSystemEvents(
            formatLocalDate(firstDay),
            formatLocalDate(lastDay)
        )

        if (result.success && result.data) {
            setEvents(result.data as SystemEvent[])
        }
        setLoading(false)
    }

    const loadEventTypes = async () => {
        const result = await getEventTypes()
        if (result.success && result.data) {
            setEventTypes(result.data)
        }
    }

    const handleAddType = async () => {
        if (!newTypeName.trim()) return
        setTypeLoading(true)
        const result = await createEventType(newTypeName.trim(), newTypeColor)
        if (result.success) {
            setNewTypeName('')
            setNewTypeColor('blue')
            await loadEventTypes()
        } else {
            alert('Failed to create type: ' + result.error)
        }
        setTypeLoading(false)
    }

    const handleDeleteType = async () => {
        if (!deleteConfirm) return
        setTypeLoading(true)
        const result = await deleteEventType(deleteConfirm.id)
        if (result.success) {
            await loadEventTypes()
        } else {
            alert('Failed to delete type: ' + result.error)
        }
        setDeleteConfirm(null)
        setTypeLoading(false)
    }

    const handleDateClick = (date: Date) => {
        setSelectedDate(date)
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
        const dateStr = formatLocalDate(date)
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
                                    ${getEventBadgeClasses(event.event_type, event.is_holiday, eventTypes)}
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

            {/* Event Type Management Section */}
            <Card className="mt-6">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Tag className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-lg">Event Type Management</CardTitle>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Manage the types of events that can be added to the calendar. Default types cannot be deleted.
                    </p>
                </CardHeader>
                <CardContent>
                    {/* Add New Type Form */}
                    <div className="flex gap-3 mb-6">
                        <Input
                            placeholder="Type name (e.g., Teachers Meeting)"
                            value={newTypeName}
                            onChange={(e) => setNewTypeName(e.target.value)}
                            className="flex-1"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddType()
                            }}
                        />
                        <Select value={newTypeColor} onValueChange={setNewTypeColor}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {COLOR_OPTIONS.map(c => (
                                    <SelectItem key={c.value} value={c.value}>
                                        <span className="flex items-center gap-2">
                                            <span className={`inline-block w-3 h-3 rounded-full ${c.class}`} />
                                            {c.label}
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            onClick={handleAddType}
                            disabled={typeLoading || !newTypeName.trim()}
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Type
                        </Button>
                    </div>

                    {/* Existing Types List */}
                    <div className="grid gap-2">
                        {eventTypes.map(type => {
                            const colorClass = COLOR_OPTIONS.find(c => c.value === type.color)?.class || 'bg-blue-500'
                            return (
                                <div
                                    key={type.id}
                                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={`inline-block w-3 h-3 rounded-full ${colorClass}`} />
                                        <span className="font-medium text-sm">{type.name}</span>
                                        {type.is_default && (
                                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                                Default
                                            </Badge>
                                        )}
                                    </div>
                                    {!type.is_default && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                            onClick={() => setDeleteConfirm({ id: type.id, name: type.name })}
                                            disabled={typeLoading}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            )
                        })}
                        {eventTypes.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                                Loading event types...
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <SystemEventDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                selectedDate={selectedDate}
                existingEvent={selectedEvent}
                onEventSaved={loadEvents}
                eventTypes={eventTypes}
            />

            {/* Delete Type Confirmation Dialog */}
            <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null) }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Event Type</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete the type &ldquo;{deleteConfirm?.name}&rdquo;? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={typeLoading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteType}
                            disabled={typeLoading}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {typeLoading ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
