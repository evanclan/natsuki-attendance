'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { getAllEmployees, setPreferredRest, deletePreferredRest, Person } from '@/app/actions/kiosk'
import { getSystemEvents, SystemEvent } from '@/app/admin/settings/actions'
import { getMonthlyMasterList, MasterListShiftData } from '@/app/admin/masterlist/actions'
import { toast } from "sonner"

export default function SetDayOffPage() {
    const [employees, setEmployees] = useState<{ id: string; full_name: string; code: string }[]>([])
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')

    // Default to next month
    const today = new Date()
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
    const [currentDate, setCurrentDate] = useState(nextMonth)

    const [events, setEvents] = useState<SystemEvent[]>([])
    const [shifts, setShifts] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth()

    useEffect(() => {
        loadEmployees()
    }, [])

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
            firstDay.toISOString().split('T')[0],
            lastDay.toISOString().split('T')[0]
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

            // Deadline is the 19th of the current month at 23:59:59
            const deadline = new Date(currentYear, currentMonth, 19, 23, 59, 59)

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
    }, [])

    const [isMemoDialogOpen, setIsMemoDialogOpen] = useState(false)
    const [selectedDateForMemo, setSelectedDateForMemo] = useState<Date | null>(null)
    const [memoText, setMemoText] = useState('')

    const handleDayClick = async (date: Date) => {
        if (isSubmissionClosed) return

        if (!selectedEmployeeId) {
            toast.error("Please select your name first")
            return
        }

        const dateStr = date.toISOString().split('T')[0]

        // Check if user already has a preferred rest on this day
        const existingShift = shifts.find(s =>
            s.date === dateStr &&
            s.person_id === selectedEmployeeId &&
            s.shift_type === 'preferred_rest'
        )

        if (existingShift) {
            toast.info("You have already set this day as preferred rest")
            return
        }

        setSelectedDateForMemo(date)
        setMemoText('')
        setIsMemoDialogOpen(true)
    }

    const handleSaveWithMemo = async () => {
        if (!selectedDateForMemo || !selectedEmployeeId) return

        const dateStr = selectedDateForMemo.toISOString().split('T')[0]
        const result = await setPreferredRest(selectedEmployeeId, dateStr, memoText)

        if (result.success) {
            toast.success("Preferred rest day set")
            loadMonthData()
            setIsMemoDialogOpen(false)
        } else {
            toast.error("Failed to set rest day")
        }
    }

    const handleDelete = async (e: React.MouseEvent, personId: string, dateStr: string) => {
        e.stopPropagation()
        if (isSubmissionClosed) return
        // if (!confirm("Are you sure you want to remove this preferred rest day?")) return

        const result = await deletePreferredRest(personId, dateStr)
        if (result.success) {
            toast.success("Removed preferred rest day")
            loadMonthData()
        } else {
            toast.error("Failed to remove")
        }
    }

    const getEventsForDate = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0]
        return events.filter(e => e.event_date === dateStr)
    }

    const getPreferredRestShiftsForDate = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0]
        return shifts.filter(s => s.date === dateStr && s.shift_type === 'preferred_rest')
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
                <div key={`empty-${i}`} className="p-2 border border-border/50 bg-slate-50/50 min-h-[100px]"></div>
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
                        p-2 border border-border/50 min-h-[120px] cursor-pointer
                        hover:bg-accent transition-colors relative group flex flex-col
                        ${isToday ? 'bg-accent/50' : ''}
                        ${isRestDayOrHoliday ? 'bg-red-50 hover:bg-red-100' : ''}
                        ${isSubmissionClosed ? 'cursor-not-allowed opacity-50' : ''}
                    `}
                    onClick={() => !isSubmissionClosed && handleDayClick(date)}
                >
                    <div className="flex justify-between items-start">
                        <div className={`
                            text-sm font-medium mb-1 h-7 w-7 flex items-center justify-center rounded-full
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
                                    text-[10px] leading-tight truncate font-medium
                                    ${(event.event_type === 'holiday' || event.is_holiday) ? 'text-red-600' : 'text-blue-600'}
                                `}
                            >
                                {event.title}
                            </div>
                        ))}
                    </div>

                    {/* Preferred Rest Names - Stacked */}
                    <div className="mt-auto space-y-1">
                        {preferredShifts.map(shift => {
                            const employee = employees.find(e => e.id === shift.person_id)
                            if (!employee) return null

                            return (
                                <div key={shift.id} className="flex items-center justify-between text-xs font-semibold text-blue-700 bg-blue-100/50 rounded py-1 px-2">
                                    <span className="truncate mr-1">{employee.full_name}</span>
                                    {!isSubmissionClosed && (
                                        <button
                                            type="button"
                                            onClick={(e) => handleDelete(e, shift.person_id, shift.date)}
                                            className="text-blue-400 hover:text-red-500 transition-colors p-1 hover:bg-blue-200 rounded-full z-10"
                                            title="Remove"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            )
        }

        return days
    }

    const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    return (
        <div className="min-h-screen bg-slate-100 p-4 md:p-8 relative">
            {isSubmissionClosed && (
                <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-[1px] z-50 pointer-events-none flex items-center justify-center">
                    <div className="bg-white/90 p-8 rounded-xl shadow-2xl text-center border-2 border-red-200 pointer-events-auto">
                        <h2 className="text-3xl font-bold text-red-600 mb-2">Submission Closed</h2>
                        <p className="text-slate-600 text-lg">The deadline (19th of the month) has passed.</p>
                        <p className="text-slate-500 mt-2">Please contact the administrator for changes.</p>
                        <Link href="/kiosk/employee">
                            <Button className="mt-6" size="lg">
                                Return to Kiosk
                            </Button>
                        </Link>
                    </div>
                </div>
            )}

            <div className={`max-w-6xl mx-auto space-y-6 ${isSubmissionClosed ? 'opacity-50 pointer-events-none select-none grayscale' : ''}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/kiosk/employee">
                            <Button variant="outline" size="sm">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Kiosk
                            </Button>
                        </Link>
                        <h1 className="text-2xl font-bold text-slate-800">Set Preferred Day Off</h1>
                    </div>
                    {!isSubmissionClosed && (
                        <div className="bg-orange-100 text-orange-800 px-4 py-2 rounded-lg font-mono font-bold border border-orange-200 shadow-sm">
                            Deadline in: {timeLeft}
                        </div>
                    )}
                </div>

                <Card className="bg-blue-50/50 border-blue-100">
                    <CardContent className="pt-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="font-semibold text-lg text-blue-900 mb-2">Instructions</h3>
                                <p className="text-blue-800 mb-4">
                                    This is where you put your preferred rest. <br />
                                    <span className="font-bold text-red-600">Deadline: 19th of the month.</span>
                                </p>
                                <ul className="space-y-2 text-blue-700">
                                    <li className="flex items-center gap-2">
                                        <span className="bg-blue-200 text-blue-800 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                                        Pick your name
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="bg-blue-200 text-blue-800 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                                        Pick your preferred day
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="bg-blue-200 text-blue-800 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                                        Add optional memo (e.g. AM off, PM off)
                                    </li>
                                </ul>
                            </div>
                            <div className="border-t md:border-t-0 md:border-l border-blue-200 pt-4 md:pt-0 md:pl-6">
                                <h3 className="font-semibold text-lg text-blue-900 mb-2">説明 (Instructions)</h3>
                                <p className="text-blue-800 mb-4">
                                    ここで希望休を設定してください。<br />
                                    <span className="font-bold text-red-600">締め切り: 毎月19日</span>
                                </p>
                                <ul className="space-y-2 text-blue-700">
                                    <li className="flex items-center gap-2">
                                        <span className="bg-blue-200 text-blue-800 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                                        自分の名前を選択してください
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="bg-blue-200 text-blue-800 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                                        希望する日を選択してください
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="bg-blue-200 text-blue-800 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                                        メモを追加 (例: AM休み、PM休み など)
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-lg">
                    <CardHeader className="pb-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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

                            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handlePreviousMonth}
                                    disabled={loading || isSubmissionClosed}
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </Button>
                                <div className="text-lg font-semibold min-w-[140px] text-center">
                                    {monthName}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleNextMonth}
                                    disabled={loading || isSubmissionClosed}
                                >
                                    <ChevronRight className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-7 gap-0 border border-border rounded-lg overflow-hidden bg-white">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                                <div
                                    key={day}
                                    className="p-3 text-center text-sm font-medium text-muted-foreground border-b border-r border-border/50 bg-slate-50 last:border-r-0"
                                >
                                    {day}
                                </div>
                            ))}
                            {renderCalendarDays()}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Memo Dialog */}
            {isMemoDialogOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                        <h3 className="text-lg font-bold mb-4">Add Optional Memo</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            You can add a note for this preferred rest day (optional).
                        </p>
                        <textarea
                            className="w-full border rounded-md p-2 min-h-[100px] mb-4"
                            placeholder="Enter memo here..."
                            value={memoText}
                            onChange={(e) => setMemoText(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsMemoDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleSaveWithMemo}>
                                Save
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
