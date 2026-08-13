'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, ChevronLeft, ChevronRight, ChevronDown, Trash2, Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { getAllEmployees, setPreferredRest, deletePreferredRest, Person } from '@/app/actions/kiosk'
import { getSystemEvents, SystemEvent } from '@/app/admin/settings/actions'
import { getMonthlyMasterList, MasterListShiftData } from '@/app/admin/masterlist/actions'
import { getDeadlineSetting } from '@/app/admin/settings/deadline/actions'
import { toast } from "sonner"
import { formatLocalDate } from '@/lib/utils'

export default function SetDayOffPage() {
    const [employees, setEmployees] = useState<{ id: string; full_name: string; code: string }[]>([])
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')

    // Default to next month
    const today = new Date()
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
    const [currentDate, setCurrentDate] = useState(nextMonth)
    const [deadlineDay, setDeadlineDay] = useState(21) // Default to 21

    const [events, setEvents] = useState<SystemEvent[]>([])
    const [shifts, setShifts] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [isInstructionsExpanded, setIsInstructionsExpanded] = useState(false)

    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth()

    useEffect(() => {
        loadEmployees()
        loadDeadline()
    }, [])

    const loadDeadline = async () => {
        const result = await getDeadlineSetting()
        if (result.success && result.data) {
            setDeadlineDay(result.data)
        }
    }

    useEffect(() => {
        loadMonthData()
    }, [currentYear, currentMonth])

    const loadEmployees = async () => {
        const data = await getAllEmployees()
        setEmployees(data)
    }

    const loadMonthData = async () => {
        setLoading(true)
        // Load events
        const firstDay = new Date(currentYear, currentMonth, 1)
        const lastDay = new Date(currentYear, currentMonth + 1, 0)

        const eventsResult = await getSystemEvents(
            formatLocalDate(firstDay),
            formatLocalDate(lastDay)
        )

        if (eventsResult.success && eventsResult.data) {
            setEvents(eventsResult.data as SystemEvent[])
        }

        // Load ALL shifts for the month
        const masterListResult = await getMonthlyMasterList(currentYear, currentMonth)
        if (masterListResult.success && masterListResult.data) {
            setShifts(masterListResult.data.shifts)
        } else {
            setShifts([])
        }

        setLoading(false)
    }

    const handlePreviousMonth = () => {
        setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
    }

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
    }

    const [timeLeft, setTimeLeft] = useState<string>('')
    const [isSubmissionClosed, setIsSubmissionClosed] = useState(false)

    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date()
            const currentYear = now.getFullYear()
            const currentMonth = now.getMonth()

            // Deadline is the Xth of the current month at 23:59:59
            const deadline = new Date(currentYear, currentMonth, deadlineDay, 23, 59, 59)

            const difference = deadline.getTime() - now.getTime()

            if (difference <= 0) {
                setIsSubmissionClosed(true)
                setTimeLeft('Submission Closed')
                return
            }

            const days = Math.floor(difference / (1000 * 60 * 60 * 24))
            const hours = Math.floor((difference / (1000 * 60 * 60)) % 24)
            const minutes = Math.floor((difference / 1000 / 60) % 60)
            const seconds = Math.floor((difference / 1000) % 60)

            setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`)
            setIsSubmissionClosed(false)
        }

        calculateTimeLeft()
        const timer = setInterval(calculateTimeLeft, 1000)

        return () => clearInterval(timer)
    }, [deadlineDay])

    // Day details dialog: tap a day to see everyone's requests, add your own, or remove one
    const [isDayDialogOpen, setIsDayDialogOpen] = useState(false)
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [isAddingRest, setIsAddingRest] = useState(false)
    const [memoText, setMemoText] = useState('')
    const [saving, setSaving] = useState(false)
    const [pendingDelete, setPendingDelete] = useState<{ personId: string; name: string; date: string; memo: string } | null>(null)

    const handleDayClick = (date: Date) => {
        if (isSubmissionClosed) return
        setSelectedDate(date)
        setIsAddingRest(false)
        setMemoText('')
        setIsDayDialogOpen(true)
    }

    const handleStartAdding = () => {
        if (!selectedEmployeeId) {
            toast.error("Please select your name first")
            return
        }
        setMemoText('')
        setIsAddingRest(true)
    }

    const handleSaveRest = async () => {
        if (!selectedDate || !selectedEmployeeId || saving) return

        const dateStr = formatLocalDate(selectedDate)

        // Check if user already has a preferred rest on this day
        const existingShift = shifts.find(s =>
            s.date === dateStr &&
            s.person_id === selectedEmployeeId &&
            s.shift_type === 'preferred_rest'
        )

        if (existingShift) {
            toast.info("You have already set this day as preferred rest")
            setIsAddingRest(false)
            return
        }

        setSaving(true)
        const result = await setPreferredRest(selectedEmployeeId, dateStr, memoText)
        setSaving(false)

        if (result.success) {
            toast.success("Preferred rest day set")
            setIsAddingRest(false)
            setMemoText('')
            loadMonthData()
        } else {
            toast.error("Failed to set rest day")
        }
    }

    const handleConfirmDelete = async () => {
        if (!pendingDelete || saving) return
        const { personId, name, date, memo } = pendingDelete

        setSaving(true)
        const result = await deletePreferredRest(personId, date)
        setSaving(false)
        setPendingDelete(null)

        if (result.success) {
            loadMonthData()
            toast.success(`Removed ${name}'s rest day`, {
                duration: 8000,
                action: {
                    label: "Undo",
                    onClick: async () => {
                        const restore = await setPreferredRest(personId, date, memo)
                        if (restore.success) {
                            toast.success(`Restored ${name}'s rest day`)
                            loadMonthData()
                        } else {
                            toast.error("Failed to restore")
                        }
                    },
                },
            })
        } else {
            toast.error("Failed to remove")
        }
    }

    const getEventsForDate = (date: Date) => {
        const dateStr = formatLocalDate(date)
        return events.filter(e => e.event_date === dateStr)
    }

    const getPreferredRestShiftsForDate = (date: Date) => {
        const dateStr = formatLocalDate(date)
        return shifts.filter(s => s.date === dateStr && s.shift_type === 'preferred_rest')
    }

    const getDaysInMonth = () => {
        return new Date(currentYear, currentMonth + 1, 0).getDate()
    }

    const getFirstDayOfMonth = () => {
        return new Date(currentYear, currentMonth, 1).getDay()
    }

    const getDaySuffix = (day: number) => {
        if (day >= 11 && day <= 13) return 'th'
        switch (day % 10) {
            case 1: return 'st'
            case 2: return 'nd'
            case 3: return 'rd'
            default: return 'th'
        }
    }

    const renderCalendarDays = () => {
        const daysInMonth = getDaysInMonth()
        const firstDay = getFirstDayOfMonth()
        const days: React.ReactElement[] = []

        for (let i = 0; i < firstDay; i++) {
            days.push(
                <div key={`empty-${i}`} className="p-2 border border-border/50 bg-slate-50/50 min-h-[80px] md:min-h-[130px]"></div>
            )
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentYear, currentMonth, day)
            const dayEvents = getEventsForDate(date)
            const preferredShifts = getPreferredRestShiftsForDate(date)

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

            let isRestDayOrHoliday = false
            if (isHolidayEvent || isRestDayEvent) {
                isRestDayOrHoliday = true
            } else if (isWeekend) {
                isRestDayOrHoliday = true
            }

            days.push(
                <div
                    key={day}
                    className={`
                        p-1 md:p-2 border border-border/50 min-h-[80px] md:min-h-[130px] cursor-pointer
                        hover:bg-accent transition-colors relative group flex flex-col
                        ${isToday ? 'bg-accent/50' : ''}
                        ${isRestDayOrHoliday ? 'bg-red-50 hover:bg-red-100' : ''}
                        ${isSubmissionClosed ? 'cursor-not-allowed opacity-50' : ''}
                    `}
                    onClick={() => !isSubmissionClosed && handleDayClick(date)}
                >
                    <div className="flex justify-between items-start">
                        <div className={`
                            text-xs md:text-sm font-medium mb-1 h-5 w-5 md:h-7 md:w-7 flex items-center justify-center rounded-full
                            ${isToday ? 'bg-primary text-primary-foreground' : ''}
                            ${isRestDayOrHoliday && !isToday ? 'text-red-600' : ''}
                        `}>
                            {day}
                        </div>
                    </div>

                    {/* Events at the top, small font */}
                    <div className="space-y-0.5 mb-1">
                        {dayEvents.map(event => (
                            <div
                                key={event.id}
                                className={`
                                    text-[8px] md:text-[10px] leading-tight truncate font-medium
                                    ${(event.event_type === 'holiday' || event.is_holiday) ? 'text-red-600' : 'text-blue-600'}
                                `}
                            >
                                {event.title}
                            </div>
                        ))}
                    </div>

                    {/* Preferred Rest Names - compact preview; tap the day to see full details */}
                    <div className="mt-auto space-y-0.5 md:space-y-1">
                        {preferredShifts.slice(0, 3).map(shift => {
                            const employee = employees.find(e => e.id === shift.person_id)
                            if (!employee) return null

                            return (
                                <div key={shift.id} className="text-[9px] md:text-xs font-semibold text-blue-700 bg-blue-100/50 rounded py-0.5 md:py-1 px-1 md:px-2 truncate">
                                    {employee.full_name}
                                </div>
                            )
                        })}
                        {preferredShifts.length > 3 && (
                            <div className="text-[9px] md:text-xs font-bold text-blue-600 px-1 md:px-2">
                                +{preferredShifts.length - 3} more
                            </div>
                        )}
                    </div>
                </div>
            )
        }

        return days
    }

    const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    // Data for the day details dialog (recomputed from `shifts` so it stays fresh after saves/deletes)
    const dialogShifts = selectedDate ? getPreferredRestShiftsForDate(selectedDate) : []
    const dialogEvents = selectedDate ? getEventsForDate(selectedDate) : []
    const myShiftOnSelectedDate = selectedEmployeeId
        ? dialogShifts.find(s => s.person_id === selectedEmployeeId)
        : undefined

    return (
        <div className="min-h-screen bg-slate-100 p-4 md:p-8 relative">
            {isSubmissionClosed && (
                <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-[1px] z-50 pointer-events-none flex items-center justify-center">
                    <div className="bg-white/90 p-8 rounded-xl shadow-2xl text-center border-2 border-red-200 pointer-events-auto">
                        <h2 className="text-3xl font-bold text-red-600 mb-2">Submission Closed</h2>
                        <p className="text-slate-600 text-lg">The deadline ({deadlineDay}{getDaySuffix(deadlineDay)} of the month) has passed.</p>
                        <p className="text-slate-500 mt-2">Please contact the administrator for changes.</p>
                        <Link href="/kiosk/employee">
                            <Button className="mt-6" size="lg">
                                Return to Kiosk
                            </Button>
                        </Link>
                    </div>
                </div>
            )}

            <div className={`max-w-6xl mx-auto space-y-4 ${isSubmissionClosed ? 'opacity-50 pointer-events-none select-none grayscale' : ''}`}>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-4">
                    <div className="hidden md:flex items-center gap-2 md:gap-4">
                        <Link href="/kiosk/employee">
                            <Button variant="outline" size="sm">
                                <ArrowLeft className="h-4 w-4 md:mr-2" />
                                <span className="hidden md:inline">Back to Kiosk</span>
                            </Button>
                        </Link>
                        <h1 className="text-lg md:text-2xl font-bold text-slate-800">Set Preferred Day Off</h1>
                    </div>
                    {!isSubmissionClosed && (
                        <div className="bg-orange-100 text-orange-800 px-3 md:px-4 py-1.5 md:py-2 rounded-lg font-mono text-xs md:text-base font-bold border border-orange-200 shadow-sm">
                            Deadline in: {timeLeft}
                        </div>
                    )}
                </div>

                <Card className="bg-blue-50/50 border-blue-100">
                    <CardContent className="py-2">
                        {/* Mobile: Collapsible header */}
                        <button
                            onClick={() => setIsInstructionsExpanded(!isInstructionsExpanded)}
                            className="w-full md:hidden flex items-center justify-between mb-4 p-3 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-lg text-blue-900">Instructions / 説明</h3>
                            </div>
                            <ChevronDown className={`h-5 w-5 text-blue-900 transition-transform ${isInstructionsExpanded ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Desktop: Always visible | Mobile: Collapsible */}
                        <div className={`${isInstructionsExpanded ? 'block' : 'hidden'} md:block`}>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="font-semibold text-lg text-blue-900 mb-2 hidden md:block">Instructions</h3>
                                    <p className="text-blue-800 mb-4 text-sm md:text-base">
                                        This is where you put your preferred rest. <br />
                                        <span className="font-bold text-red-600">Deadline: {deadlineDay}{getDaySuffix(deadlineDay)} of the month.</span>
                                    </p>
                                    <ul className="space-y-2 text-blue-700 text-sm md:text-base">
                                        <li className="flex items-center gap-2">
                                            <span className="bg-blue-200 text-blue-800 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
                                            Pick your name
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="bg-blue-200 text-blue-800 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
                                            Pick your preferred day
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="bg-blue-200 text-blue-800 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
                                            Add optional memo (e.g. AM off, PM off)
                                        </li>
                                    </ul>
                                </div>
                                <div className="border-t md:border-t-0 md:border-l border-blue-200 pt-4 md:pt-0 md:pl-6">
                                    <h3 className="font-semibold text-lg text-blue-900 mb-2 hidden md:block">説明 (Instructions)</h3>
                                    <p className="text-blue-800 mb-4 text-sm md:text-base">
                                        ここで希望休を設定してください。<br />
                                        <span className="font-bold text-red-600">締め切り: 毎月{deadlineDay}日</span>
                                    </p>
                                    <ul className="space-y-2 text-blue-700 text-sm md:text-base">
                                        <li className="flex items-center gap-2">
                                            <span className="bg-blue-200 text-blue-800 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
                                            自分の名前を選択してください
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="bg-blue-200 text-blue-800 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
                                            希望する日を選択してください
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="bg-blue-200 text-blue-800 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
                                            メモを追加 (例: AM休み、PM休み など)
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-lg">
                    <CardHeader className="pb-2">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="w-full md:w-72">
                                <label className="text-sm font-medium mb-2 block text-muted-foreground">Select Your Name</label>
                                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId} disabled={isSubmissionClosed}>
                                    <SelectTrigger className="h-12 text-lg">
                                        <SelectValue placeholder="Select Employee..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {employees.map((employee) => (
                                            <SelectItem key={employee.id} value={employee.id} className="text-lg py-3">
                                                {employee.full_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handlePreviousMonth}
                                    disabled={loading || isSubmissionClosed}
                                    className="h-8 w-8 p-0"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <div className="text-sm font-semibold min-w-[120px] text-center">
                                    {monthName}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleNextMonth}
                                    disabled={loading || isSubmissionClosed}
                                    className="h-8 w-8 p-0"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="px-2 pb-2">
                        <div className="grid grid-cols-7 gap-0 border border-border rounded-lg overflow-hidden bg-white">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                                <div
                                    key={day}
                                    className="p-1.5 md:p-3 text-center text-xs md:text-sm font-medium text-muted-foreground border-b border-r border-border/50 bg-slate-50 last:border-r-0"
                                >
                                    {day}
                                </div>
                            ))}
                            {renderCalendarDays()}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Day Details Dialog */}
            <Dialog
                open={isDayDialogOpen}
                onOpenChange={(open) => {
                    setIsDayDialogOpen(open)
                    if (!open) setIsAddingRest(false)
                }}
            >
                <DialogContent className="p-0 gap-0 flex flex-col max-h-[85dvh] sm:max-w-md overflow-hidden">
                    <DialogHeader className="px-4 pt-4 pb-3 border-b text-left shrink-0">
                        <DialogTitle className="text-lg md:text-xl">
                            {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </DialogTitle>
                        {dialogEvents.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {dialogEvents.map(event => (
                                    <span
                                        key={event.id}
                                        className={`
                                            text-xs font-medium px-2 py-0.5 rounded-full
                                            ${(event.event_type === 'holiday' || event.is_holiday)
                                                ? 'bg-red-100 text-red-700'
                                                : 'bg-blue-100 text-blue-700'}
                                        `}
                                    >
                                        {event.title}
                                    </span>
                                ))}
                            </div>
                        )}
                        <DialogDescription>
                            {dialogShifts.length > 0
                                ? `${dialogShifts.length} preferred rest ${dialogShifts.length === 1 ? 'request' : 'requests'} ・ 希望休`
                                : 'Preferred rest ・ 希望休'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                        {dialogShifts.length === 0 ? (
                            <p className="text-center text-muted-foreground text-sm py-8">
                                No one has set a rest day yet.
                                <br />
                                まだ誰も希望休を設定していません
                            </p>
                        ) : (
                            dialogShifts.map(shift => {
                                const employee = employees.find(e => e.id === shift.person_id)
                                if (!employee) return null
                                const isMine = shift.person_id === selectedEmployeeId

                                return (
                                    <div
                                        key={shift.id}
                                        className={`
                                            flex items-center justify-between gap-3 rounded-lg border p-3
                                            ${isMine ? 'border-blue-300 bg-blue-50' : 'bg-white'}
                                        `}
                                    >
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-base text-slate-800 truncate">
                                                    {employee.full_name}
                                                </span>
                                                {isMine && (
                                                    <span className="text-[10px] font-bold bg-blue-600 text-white rounded-full px-2 py-0.5 shrink-0">
                                                        YOU
                                                    </span>
                                                )}
                                            </div>
                                            {shift.memo && (
                                                <p className="text-sm text-muted-foreground break-words mt-0.5">
                                                    {shift.memo}
                                                </p>
                                            )}
                                        </div>
                                        {!isSubmissionClosed && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-10 w-10 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                                                title="Remove"
                                                onClick={() => setPendingDelete({
                                                    personId: shift.person_id,
                                                    name: employee.full_name,
                                                    date: shift.date,
                                                    memo: shift.memo || '',
                                                })}
                                            >
                                                <Trash2 className="h-5 w-5" />
                                            </Button>
                                        )}
                                    </div>
                                )
                            })
                        )}
                    </div>

                    {!isSubmissionClosed && (
                        <div className="border-t px-4 py-3 space-y-3 shrink-0 bg-slate-50/50">
                            {isAddingRest ? (
                                <>
                                    <div>
                                        <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                                            Optional memo ・ メモ（任意）
                                        </label>
                                        <textarea
                                            className="w-full border rounded-md p-2 min-h-[80px] text-base bg-white"
                                            placeholder="e.g. AM off, PM off / 例: AM休み、PM休み"
                                            value={memoText}
                                            onChange={(e) => setMemoText(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            className="flex-1 h-11"
                                            onClick={() => setIsAddingRest(false)}
                                            disabled={saving}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            className="flex-1 h-11"
                                            onClick={handleSaveRest}
                                            disabled={saving}
                                        >
                                            {saving ? 'Saving...' : 'Save ・ 保存'}
                                        </Button>
                                    </div>
                                </>
                            ) : myShiftOnSelectedDate ? (
                                <p className="text-center text-sm font-medium text-blue-700 py-1">
                                    You already set this day as preferred rest ・ この日は設定済みです
                                </p>
                            ) : (
                                <Button className="w-full h-12 text-base" onClick={handleStartAdding}>
                                    <Plus className="h-5 w-5 mr-1" />
                                    Set my day off ・ 希望休を設定
                                </Button>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog
                open={!!pendingDelete}
                onOpenChange={(open) => { if (!open) setPendingDelete(null) }}
            >
                <AlertDialogContent className="max-w-sm">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove this rest day? ・ 削除しますか？</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will remove <span className="font-semibold text-slate-800">{pendingDelete?.name}</span>&apos;s
                            preferred rest on <span className="font-semibold text-slate-800">{pendingDelete?.date}</span>.
                            You can undo right after deleting.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={handleConfirmDelete}
                        >
                            Remove ・ 削除
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
