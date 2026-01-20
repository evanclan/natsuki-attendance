'use client'

import { useState, useEffect } from 'react'
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
import { ChevronLeft, ChevronRight, Plus, CheckSquare, Square, Trash2, Edit, X, Copy, Clipboard, Maximize2, Minimize2, Check, Printer, CalendarDays, Monitor, Minus, RotateCcw } from 'lucide-react'
import React from 'react'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MasterListShiftData, upsertShift, upsertShifts, deleteShift, deleteShifts, updatePeopleOrder } from '@/app/admin/masterlist/actions'
import { ShiftCell } from './ShiftCell'
import { useCallback } from 'react'

import { formatLocalDate, calculateExpectedHours } from '@/lib/utils'
import { ShiftEditDialog } from './ShiftEditDialog'
import { MonthlyStatusDialog } from './MonthlyStatusDialog'
import { SystemEventDialog } from './SystemEventDialog'
import { useToast } from "@/components/ui/use-toast"
import { MasterListPrintComponent } from './MasterListPrintComponent'
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

interface Person {
    id: string
    full_name: string
    code: string
    role: string
    job_type?: string
    display_order?: number
    categories?: { name: string }[] | any
}

interface SystemEvent {
    id: string
    event_date: string
    title: string
    event_type: 'holiday' | 'rest_day' | 'work_day' | 'event' | 'other'
    is_holiday: boolean
    created_at: string
}

interface AttendanceRecord {
    person_id: string
    date: string
    total_work_minutes: number
    paid_leave_minutes?: number
}

interface Legend {
    id: string
    color: string
    from_location: string
    to_location: string
}

interface MasterListTableProps {
    year: number
    month: number
    people: Person[]
    shifts: any[]
    events: SystemEvent[]
    attendance: AttendanceRecord[]
    legends: Legend[]
}

function SortableRow({ person, isReordering, children }: any) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: person.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    if (!isReordering) return <div id={person.id}>{children}</div>

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none">
            {children}
        </div>
    );
}

export function MasterListTable({
    year,
    month,
    people,
    shifts,
    events,
    attendance,
    legends
}: MasterListTableProps) {
    const router = useRouter()
    const { toast } = useToast()

    const containerRef = React.useRef<HTMLDivElement>(null)
    const contentRef = React.useRef<HTMLDivElement>(null)

    // Sensors for DnD
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // State
    const [selectionMode, setSelectionMode] = useState<'none' | 'employee' | 'student'>('none')
    const [selectedCells, setSelectedCells] = useState<{ personId: string, day: number, dateString: string }[]>([])

    const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [selectedShift, setSelectedShift] = useState<MasterListShiftData | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)

    const [eventDialogOpen, setEventDialogOpen] = useState(false)
    const [selectedEventDate, setSelectedEventDate] = useState<Date | null>(null)
    const [selectedSystemEvent, setSelectedSystemEvent] = useState<SystemEvent | null>(null)

    const [monthlyStatusDialogOpen, setMonthlyStatusDialogOpen] = useState(false)
    const [monthlyStatusPerson, setMonthlyStatusPerson] = useState<Person | null>(null)

    const [showComputedHours, setShowComputedHours] = useState(false)
    const [isReordering, setIsReordering] = useState(false)
    const [showSatasaurus, setShowSatasaurus] = useState(false)
    const [fullScreenMode, setFullScreenMode] = useState<'none' | 'employee' | 'student'>('none')

    const [copiedShift, setCopiedShift] = useState<MasterListShiftData | null>(null)
    const [copiedLegendId, setCopiedLegendId] = useState<string | null>(null)

    // Zoom / Fullscreen Adjustment
    const [zoomLevel, setZoomLevel] = useState(1)
    const [isFitToScreen, setIsFitToScreen] = useState(false)

    const [localEmployees, setLocalEmployees] = useState<Person[]>([])


    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)



    // Fit to Screen Logic
    useEffect(() => {
        if (!isFitToScreen || fullScreenMode !== 'employee') return

        const calculateScale = () => {
            if (!containerRef.current || !contentRef.current) return

            // Reset scale first to get natural dimensions
            const containerWidth = containerRef.current.clientWidth
            const containerHeight = containerRef.current.clientHeight

            // We need the natural width/height of the content
            // Assuming scrollWidth/scrollHeight gives us the full unscaled size
            const contentWidth = contentRef.current.scrollWidth
            const contentHeight = contentRef.current.scrollHeight

            // Add some padding/buffer
            const padding = 40

            const scaleX = (containerWidth - padding) / contentWidth
            const scaleY = (containerHeight - padding) / contentHeight

            // Use the smaller scale to fit both dimensions
            const scale = Math.min(scaleX, scaleY, 1) // Don't scale up beyond 1 if it fits? Actually, user might want to scale UP to fit screen if table is small. 
            // If table is small, we probably shouldn't scale UP excessively, but fitting to screen implies filling it.
            // Let's allow scaling up but cap it reasonably, say 1.5x? Or just fit it.
            // Usually "Fit to Screen" means shrinking to fit. Scaling up to fill is "Fill Screen".
            // Let's just do Math.min(scaleX, scaleY)

            setZoomLevel(Math.min(scaleX, scaleY))
        }

        calculateScale()
        window.addEventListener('resize', calculateScale)
        return () => window.removeEventListener('resize', calculateScale)
    }, [isFitToScreen, fullScreenMode, people, shifts, events]) // Recalculate if data changes too

    // Print Logic
    const handlePrint = () => {
        const url = `/print/masterlist?year=${year}&month=${month}`
        window.open(url, '_blank')
    }




    // Derived
    const days = Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) => i + 1)
    const saturdayDays = days.filter(d => new Date(year, month, d).getDay() === 6)

    // Handlers
    const handlePreviousMonth = () => {
        const newDate = new Date(year, month - 1)
        router.push(`/admin/masterlist?year=${newDate.getFullYear()}&month=${newDate.getMonth()}`)
    }

    const handleNextMonth = () => {
        const newDate = new Date(year, month + 1)
        router.push(`/admin/masterlist?year=${newDate.getFullYear()}&month=${newDate.getMonth()}`)
    }

    const handleYearChange = (val: string) => {
        router.push(`/admin/masterlist?year=${val}&month=${month}`)
    }

    const handleMonthChange = (val: string) => {
        router.push(`/admin/masterlist?year=${year}&month=${val}`)
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            setLocalEmployees((items) => {
                const currentItems = items.length > 0 ? items : people.filter(p => p.role === 'employee');
                const oldIndex = currentItems.findIndex((item) => item.id === active.id);
                const newIndex = currentItems.findIndex((item) => item.id === over?.id);
                return arrayMove(currentItems, oldIndex, newIndex);
            });
        }
    }

    const handleSaveOrder = async () => {
        const items = localEmployees.length > 0 ? localEmployees : people.filter(p => p.role === 'employee');
        const updates = items.map((p, index) => ({ id: p.id, display_order: index }));
        const res = await updatePeopleOrder(updates);
        if (res.success) {
            toast({ description: 'Order saved successfully' })
            setIsReordering(false)
            setLocalEmployees([])
            router.refresh()
        } else {
            toast({ variant: 'destructive', description: 'Failed to save order' })
        }
    }




    const handleCellClick = useCallback((person: Person, day: number) => {
        const date = new Date(year, month, day)
        const dateStr = formatLocalDate(date)

        // Since we are inside useCallback, we need to be careful with state values accessed directly.
        // However, selectionMode and shifts are dependencies.
        // But to make ShiftCell truly memoized, passing a function that depends on 'shifts' array will break strict equality if 'shifts' changes.
        // Actually, if 'shifts' changes, we WANT to re-render.
        // But if I toggle 'showComputedHours', 'shifts' doesn't change, so 'handleCellClick' should be stable?
        // Wait, 'handleCellClick' depends on 'shifts'.
        // If I want to optimize heavily, I should pass IDs to ShiftCell and let it decide or handle click.
        // But 'ShiftCell' is just a presentational component.
        // Let's rely on the fact that if 'shifts' or 'selectionMode' doesn't change, this function instance is stable.

        // We need to access state. 
        // Best pattern: pass the function to the child.
        // If we use 'useCallback', we need to list dependencies.

        // Let's implement the logic directly here for now, but wrapped in useCallback.
        // Note: access state via refs if we want true stability, but that's overkill.
        // Just standard useCallback is better than inline function.

        // Actually, I cannot easily pass 'person' and 'day' if I wrap it here, unless I return a curried function? 
        // No, I can just define 'onCellClick' and pass it.
        // But 'ShiftCell' calls 'onClick'.
        // The inline `() => handleCellClick(person, day)` in renderRow BREAKS memoization because it's a new function every time.
        // To fix this, ShiftCell needs to take `person` and `day` as props and call back `onClick(person, day)`.
        // BUT ShiftCell doesn't know about `Person` type potentially, or we'd have to duplicate it.
        // Or we just pass `personId` and `day`.

        // Refactoring ShiftCell to take personId and day is the right way for list virtualization/memoization.
        // But I will stick to the plan: use bulk actions first.
        // I will just optimize the bulk handlers here.
        // If I can't easily fix the inline onClick without refactoring ShiftCell props, I will skip that part of optimization or do it if time permits.
        // The plan said: "Change ShiftCell props to take personId and day...".
        // I ALREADY updated ShiftCell to use memo, but I didn't change props.
        // So passing `onClick={() => handleCellClick(person, day)}` will still cause re-renders.

        // I will update this file to use the bulk actions first.

        if (selectionMode !== 'none') {
            if (person.role !== selectionMode) return

            setSelectedCells(prev => {
                const exists = prev.some(c => c.personId === person.id && c.dateString === dateStr)
                if (exists) {
                    return prev.filter(c => !(c.personId === person.id && c.dateString === dateStr))
                } else {
                    return [...prev, { personId: person.id, day: day, dateString: dateStr }]
                }
            })
            return
        }

        const shift = shifts.find(s => s.person_id === person.id && s.date === dateStr)

        setSelectedPerson(person)
        setSelectedDate(date)
        setSelectedShift(shift ? {
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
        } : null)
        setDialogOpen(true)
    }, [selectionMode, shifts, year, month]) // Depend on these

    const handleDeleteShift = async () => {
        if (!selectedPerson || !selectedDate) return

        const dateStr = formatLocalDate(selectedDate)
        const result = await deleteShift(selectedPerson.id, dateStr)

        if (result.success) {
            toast({ description: "Shift deleted" })
            router.refresh()
        } else {
            alert('Failed to delete shift: ' + result.error)
        }
    }

    const handleSaveShift = async (data: MasterListShiftData) => {
        if (selectedCells.length > 0) {
            // Bulk Save
            // Map selected cells to the payload format
            const shiftsToSave = selectedCells.map(cell => ({
                personId: cell.personId,
                data: { ...data, date: cell.dateString }
            }))

            const result = await upsertShifts(shiftsToSave)

            if (result.success) {
                toast({ description: `Successfully saved ${shiftsToSave.length} shifts` })
            } else {
                if (result.failures) {
                    alert(`Failed to save ${result.failures.length} shifts. Please check console.`)
                } else {
                    alert('Failed to save shifts: ' + result.error)
                }
            }

            setSelectedCells([])
            setSelectionMode('none')
            // router.refresh() // handled by validPath in action presumably, but good to keep if client state needs update? 
            // The action calls revalidatePath, so data should refresh.
            // But we might want to manually refresh if we are using server components mostly.
            // router.refresh() is redundant if action does it? No, action revalidates cache, router.refresh updates UI.
            // Actually revalidatePath on server usually triggers a client router refresh automatically if invoked via form?
            // But here we invoke via async await.
            // We usually need router.refresh() if not using useFormState etc?
            // Actually, in Server Actions 14+, revalidatePath should update the client cache and trigger refresh if simple.
            // Let's keep it safe.
            router.refresh()
        } else {
            // Single Save
            if (!selectedPerson) return

            const result = await upsertShift(selectedPerson.id, data)
            if (result.success) {
                toast({ description: "Shift saved" })
                router.refresh()
            } else {
                alert('Failed to save shift: ' + result.error)
            }
        }
    }

    const handleBulkDelete = () => {
        if (selectedCells.length === 0) return
        setDeleteDialogOpen(true)
    }

    const confirmBulkDelete = async () => {
        setIsDeleting(true)
        try {
            // Get all shifts for the selected cells
            const shiftsToDelete = selectedCells.map(cell => ({
                personId: cell.personId,
                date: cell.dateString
            }))

            if (shiftsToDelete.length === 0) {
                toast({ description: "No shifts found to delete in selected cells." })
                setIsDeleting(false)
                setDeleteDialogOpen(false)
                return
            }

            const result = await deleteShifts(shiftsToDelete)

            if (result.success) {
                toast({ description: `Successfully deleted ${shiftsToDelete.length} shifts` })
            } else {
                alert('Failed to delete shifts: ' + result.error) // Fallback for error for now
            }

            setSelectedCells([])
            setSelectionMode('none')
        } catch (error) {
            console.error('Bulk delete error:', error)
            toast({
                variant: 'destructive',
                description: "An unexpected error occurred during deletion."
            })
        } finally {
            setIsDeleting(false)
            setDeleteDialogOpen(false)
        }
    }

    // copy unmodified
    const handleCopy = () => {
        if (selectedCells.length !== 1) return

        const cell = selectedCells[0]
        const shift = shifts.find(s => s.person_id === cell.personId && s.date === cell.dateString)

        if (shift) {
            setCopiedShift({
                date: shift.date,
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
            toast({ description: "Shift copied to clipboard" })
        } else {
            alert("No shift data to copy from the selected cell.")
        }
    }

    const handlePaste = async () => {
        if (!copiedShift || selectedCells.length === 0) return

        if (!confirm(`Paste copied shift to ${selectedCells.length} cells? This will overwrite existing shifts.`)) return

        const shiftsToSave = selectedCells.map(cell => ({
            personId: cell.personId,
            data: { ...copiedShift, date: cell.dateString }
        }))

        const result = await upsertShifts(shiftsToSave)

        if (result.success) {
            toast({ description: `Pasted to ${shiftsToSave.length} cells` })
        } else {
            alert('Failed to paste shifts: ' + result.error)
        }

        setSelectedCells([])
        setSelectionMode('none')
        setCopiedShift(null)
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


    // Old print function removed
    /*
    const handlePrintEmployees = () => {
        // ...
    }
    */


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
            isWeekend: dayOfWeek === 0 || dayOfWeek === 6 // Keep track of weekend for visual/legacy logic if needed, but 'isRestDay' controls the red cell
        }
    }

    // Group people by role
    // Use localEmployees if available, otherwise sourceEmployees
    const employees = localEmployees.length > 0 ? localEmployees : people.filter(p => p.role === 'employee')
    const students = people.filter(p => {
        if (p.role !== 'student') return false
        // Hide students with ONLY the "Satasaurus" category
        // Students with multiple categories (e.g., Academy + Satasaurus) should still be shown
        const categories = p.categories || []
        if (categories.length === 1 && categories[0]?.name?.toLowerCase() === 'satursaurus') {
            return false
        }
        return true
    })
    // Satasaurus students: any student with a "Satasaurus" category (including dual-category)
    const satasaurusStudents = people.filter(p => {
        if (p.role !== 'student') return false
        const categories = p.categories || []
        return categories.some((c: any) => c?.name?.toLowerCase() === 'satursaurus')
    })

    const renderRow = (person: Person) => (
        <div key={person.id} className="flex border-b border-border hover:bg-slate-50">
            <div className="sticky left-0 z-30 w-40 min-w-[160px] p-2 border-r border-border bg-background flex flex-col justify-center relative">
                <div className="font-medium truncate" title={person.full_name}>{person.full_name}</div>
                <div className="text-xs text-muted-foreground">
                    {person.role === 'student'
                        ? (Array.isArray(person.categories)
                            ? person.categories.map(c => c.name).join(', ')
                            : (person.categories as any)?.name || '-')
                        : (person.job_type || person.code)}
                </div>
                {person.role !== 'student' && (
                    <>
                        <button
                            className="absolute top-1 right-1 p-1 rounded hover:bg-muted transition-colors opacity-50 hover:opacity-100"
                            title="Set monthly status for all weekdays"
                            onClick={(e) => {
                                e.stopPropagation()
                                setMonthlyStatusPerson(person)
                                setMonthlyStatusDialogOpen(true)
                            }}
                        >
                            <CalendarDays className="h-3.5 w-3.5" />
                        </button>
                        <div className="absolute bottom-1 right-1 text-[10px] text-muted-foreground/70 font-mono">
                            {Array.isArray(person.categories) ? person.categories?.[0]?.name : (person.categories as any)?.name || '-'}
                        </div>
                    </>
                )}
            </div>
            {days.map(day => {
                const date = new Date(year, month, day)
                const dateStr = formatLocalDate(date)
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
                        isWeekend={getDayStatus(day).isRestDay}
                        workHours={workHours}
                        showComputedHours={person.role !== 'student' && showComputedHours}
                        isSelected={selectedCells.some(c => c.personId === person.id && c.dateString === dateStr)}
                        isSelectionMode={selectionMode === person.role}
                        person={person}
                        day={day}
                        onCellClick={handleCellClick}
                    />
                )
            })}
            {person.role !== 'student' && (
                <>
                    <div className="min-w-[80px] p-2 border-r border-border flex items-center justify-center font-mono text-sm">
                        {(() => {
                            const totalExpectedHours = days.reduce((sum, day) => {
                                const date = new Date(year, month, day)
                                const dateStr = formatLocalDate(date)
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
                    <div className="min-w-[80px] p-2 border-border flex items-center justify-center font-mono text-sm">
                        {(() => {
                            const isPartTime = person.categories?.[0]?.name === 'partime'

                            if (isPartTime) {
                                // Count days for part-time
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
                                // Count hours for others
                                const totalHours = days.reduce((sum, day) => {
                                    const date = new Date(year, month, day)
                                    const dateStr = formatLocalDate(date)
                                    const shift = shifts.find(s => s.person_id === person.id && s.date === dateStr)

                                    if (!shift) return sum

                                    if (shift.shift_type === 'paid_leave') {
                                        return sum + (shift.paid_leave_hours ?? 8)
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
                // const isWknd = isWeekend(day) // Removed, using getDayStatus inside render
                return (
                    <div
                        key={day}
                        className={`
                            min-w-[100px] p-1 border-r border-border text-center flex flex-col justify-center
                            ${getDayStatus(day).isRestDay ? 'text-red-500 bg-red-50/50' : ''}
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
                        W.hours
                    </div>
                    <div className="min-w-[80px] p-2 border-border bg-muted font-semibold flex items-center justify-center text-xs">
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
                // const isWknd = isWeekend(day)

                return (
                    <div
                        key={day}
                        className={`
                            w-[100px] min-w-[100px] max-w-[100px] h-[48px] p-1 border-r border-border relative group cursor-pointer hover:bg-blue-100/50 transition-colors overflow-hidden
                            ${getDayStatus(day).isRestDay ? 'bg-red-50/30' : ''}
                        `}
                        onClick={() => handleEventClick(date)}
                    >
                        <div className="space-y-1 h-full overflow-hidden">
                            {dayEvents.map(event => (
                                <div
                                    key={event.id}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleEventClick(date, event)
                                    }}
                                    className={`
                                        text-[10px] p-1 rounded px-2 cursor-pointer hover:opacity-80 overflow-hidden text-ellipsis whitespace-nowrap max-w-full
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
        <React.Fragment>
            <div className="space-y-8 pb-32 print:hidden">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">{monthName}</h2>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center space-x-2">
                            {/* Reordering Controls */}
                            {isReordering ? (
                                <Button
                                    variant="default"
                                    size="sm"
                                    onClick={handleSaveOrder}
                                    className="bg-green-600 hover:bg-green-700 text-white animate-pulse"
                                >
                                    <Check className="h-4 w-4 mr-2" />
                                    Save Order
                                </Button>
                            ) : (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setIsReordering(true)
                                        setSelectionMode('none') // Disable selection mode when reordering
                                        setSelectedCells([])
                                    }}
                                >
                                    Change Order
                                </Button>
                            )}

                            <Switch
                                id="show-computed-hours"
                                checked={showComputedHours}
                                onCheckedChange={setShowComputedHours}
                            />
                            <Label htmlFor="show-computed-hours">Show Computed Hours</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Button
                                variant={selectionMode === 'employee' ? "secondary" : "outline"}
                                size="sm"
                                onClick={() => {
                                    if (selectionMode === 'employee') {
                                        setSelectionMode('none')
                                        setSelectedCells([])
                                    } else {
                                        setSelectionMode('employee')
                                        setSelectedCells([])
                                    }
                                }}
                                className={selectionMode === 'employee' ? "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200" : ""}
                            >
                                {selectionMode === 'employee' ? <CheckSquare className="h-4 w-4 mr-2" /> : <Square className="h-4 w-4 mr-2" />}
                                Employee Selection
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
                    <div className={fullScreenMode === 'employee' ? "fixed inset-0 z-50 bg-background p-6 flex flex-col" : "space-y-2"}>
                        <div className="flex items-center justify-between print-no-show">
                            <div className="flex items-center gap-6">
                                <h3 className="text-lg font-semibold">Employees</h3>

                                {/* Legends Display - Hidden for now */}
                                {false && legends && legends.length > 0 && (
                                    <div className="flex items-center gap-3 overflow-x-auto max-w-[60vw] scrollbar-hide">
                                        {legends.map(legend => (
                                            <div key={legend.id} className="flex items-center gap-1.5 text-xs bg-muted/50 px-2 py-1 rounded-full border flex-shrink-0 transition-all hover:bg-muted">
                                                <div
                                                    className="w-4 h-4 rounded-full border shadow-sm cursor-pointer hover:scale-110 transition-all flex items-center justify-center relative overflow-hidden group"
                                                    style={{ backgroundColor: legend.color }}
                                                    title="Click to copy color code"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        navigator.clipboard.writeText(legend.color)

                                                        // Trigger animation state
                                                        setCopiedLegendId(legend.id)
                                                        setTimeout(() => setCopiedLegendId(null), 1500)

                                                        // Show toast
                                                        toast({
                                                            description: (
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: legend.color }} />
                                                                    <span>Copied <strong>{legend.color}</strong> to clipboard</span>
                                                                </div>
                                                            ),
                                                            duration: 2000,
                                                        })
                                                    }}
                                                >
                                                    {/* Checkmark overlay */}
                                                    <div
                                                        className={`
                                                        absolute inset-0 flex items-center justify-center bg-black/20 text-white transition-opacity duration-200
                                                        ${copiedLegendId === legend.id ? 'opacity-100' : 'opacity-0 hover:opacity-100'}
                                                    `}
                                                    >
                                                        {copiedLegendId === legend.id && <Check className="w-3 h-3 animate-in zoom-in duration-200" />}
                                                    </div>
                                                </div>
                                                <span className="font-medium whitespace-nowrap">
                                                    {legend.from_location === legend.to_location ? (
                                                        legend.from_location
                                                    ) : (
                                                        <>
                                                            {legend.from_location} <span className="text-muted-foreground">→</span> {legend.to_location}
                                                        </>
                                                    )}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-2">

                                {fullScreenMode === 'employee' && (
                                    <>
                                        {/* Zoom Controls */}
                                        <div className="flex items-center bg-background border rounded-md shadow-sm mr-2 h-8">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className={`h-full px-2 rounded-r-none border-r ${isFitToScreen ? 'bg-muted text-primary' : 'text-muted-foreground'}`}
                                                onClick={() => setIsFitToScreen(!isFitToScreen)}
                                                title="Fit to Screen"
                                            >
                                                <Monitor className="h-4 w-4" />
                                            </Button>

                                            <div className="w-[1px] h-4 bg-border mx-1" />

                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-full px-2 rounded-none"
                                                onClick={() => {
                                                    setIsFitToScreen(false)
                                                    setZoomLevel(prev => Math.max(0.5, prev - 0.1))
                                                }}
                                                disabled={isFitToScreen}
                                                title="Zoom Out"
                                            >
                                                <Minus className="h-3 w-3" />
                                            </Button>

                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-full px-2 rounded-none font-mono text-xs w-[4.5ch]"
                                                onClick={() => {
                                                    setIsFitToScreen(false)
                                                    setZoomLevel(1)
                                                }}
                                                disabled={isFitToScreen}
                                                title="Reset Zoom"
                                            >
                                                {Math.round(zoomLevel * 100)}%
                                            </Button>

                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-full px-2 rounded-l-none"
                                                onClick={() => {
                                                    setIsFitToScreen(false)
                                                    setZoomLevel(prev => Math.min(2, prev + 0.1))
                                                }}
                                                disabled={isFitToScreen}
                                                title="Zoom In"
                                            >
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </div>

                                        <Button
                                            variant={selectionMode === 'employee' ? "secondary" : "outline"}
                                            size="sm"
                                            onClick={() => {
                                                if (selectionMode === 'employee') {
                                                    setSelectionMode('none')
                                                    setSelectedCells([])
                                                } else {
                                                    setSelectionMode('employee')
                                                    setSelectedCells([])
                                                }
                                            }}
                                            className={selectionMode === 'employee' ? "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200" : ""}
                                        >
                                            {selectionMode === 'employee' ? <CheckSquare className="h-4 w-4 mr-2" /> : <Square className="h-4 w-4 mr-2" />}
                                            Employee Selection
                                        </Button>
                                        {isReordering ? (
                                            <Button
                                                variant="default"
                                                size="sm"
                                                onClick={handleSaveOrder}
                                                className="bg-green-600 hover:bg-green-700 text-white animate-pulse"
                                            >
                                                <Check className="h-4 w-4 mr-2" />
                                                Save Order
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setIsReordering(true)
                                                    setSelectionMode('none')
                                                    setSelectedCells([])
                                                }}
                                            >
                                                Change Order
                                            </Button>
                                        )}
                                    </>
                                )}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        const newMode = fullScreenMode === 'employee' ? 'none' : 'employee'
                                        setFullScreenMode(newMode)
                                        if (newMode === 'none') {
                                            setZoomLevel(1)
                                            setIsFitToScreen(false)
                                        }
                                    }}
                                >
                                    {fullScreenMode === 'employee' ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                        <div
                            id="printable-masterlist-employees"
                            className={`border rounded-md overflow-hidden bg-background ${fullScreenMode === 'employee' ? "flex-1" : ""}`}
                        >
                            {/* Print Header - Only visible when printing */}
                            <div className="hidden print:block print-month-title">
                                {monthName}
                            </div>
                            <div className={`overflow-auto masterlist-print-table ${fullScreenMode === 'employee' ? "h-full" : "max-h-[60vh]"} ${isFitToScreen ? 'overflow-hidden' : ''}`} ref={containerRef}>
                                <div
                                    className="min-w-max transition-all duration-200 ease-out origin-top-left"
                                    ref={contentRef}
                                    style={{
                                        // Use CSS zoom for non-standard but effective scaling in Chrome/Safari
                                        // Fallback to transform if needed, but zoom handles layout flow better
                                        zoom: zoomLevel
                                    } as any}
                                >

                                    {renderHeaderRow("Employees")}
                                    {renderEventsRow()}
                                    {/* Drag Context */}
                                    <DndContext
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragEnd={handleDragEnd}
                                    >
                                        <SortableContext
                                            items={employees.map(e => e.id)}
                                            strategy={verticalListSortingStrategy}
                                            disabled={!isReordering}
                                        >
                                            {employees.map(person => (
                                                <SortableRow key={person.id} person={person} isReordering={isReordering}>
                                                    {renderRow(person)}
                                                </SortableRow>
                                            ))}
                                        </SortableContext>
                                    </DndContext>
                                </div>
                            </div>
                        </div>
                        {/* Print Button - Bottom Right */}
                        <div className="flex justify-end mt-2 print-no-show">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePrint()}
                                className="gap-2"
                            >
                                <Printer className="h-4 w-4" />
                                Print Table

                            </Button>
                        </div>
                    </div>
                )}

                {/* Students Section */}
                {students.length > 0 && (
                    <div className={fullScreenMode === 'student' ? "fixed inset-0 z-50 bg-background p-6 flex flex-col" : "space-y-2"}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">Students</h3>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant={selectionMode === 'student' ? "secondary" : "outline"}
                                    size="sm"
                                    onClick={() => {
                                        if (selectionMode === 'student') {
                                            setSelectionMode('none')
                                            setSelectedCells([])
                                        } else {
                                            setSelectionMode('student')
                                            setSelectedCells([])
                                        }
                                    }}
                                    className={selectionMode === 'student' ? "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200" : ""}
                                >
                                    {selectionMode === 'student' ? <CheckSquare className="h-4 w-4 mr-2" /> : <Square className="h-4 w-4 mr-2" />}
                                    Student Selection
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setFullScreenMode(fullScreenMode === 'student' ? 'none' : 'student')}
                                >
                                    {fullScreenMode === 'student' ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                        <div className={`border rounded-md overflow-hidden bg-background ${fullScreenMode === 'student' ? "flex-1" : ""}`}>
                            <div className={`overflow-auto ${fullScreenMode === 'student' ? "h-full" : "max-h-[60vh]"}`}>
                                <div className="min-w-max">
                                    {renderHeaderRow("Students", false)}
                                    {renderEventsRow()}
                                    {students.map(renderRow)}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Satasaurus Students Section */}
                {satasaurusStudents.length > 0 && (
                    <div className="space-y-2">
                        {/* Toggle Button - Always visible */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowSatasaurus(!showSatasaurus)}
                            className="gap-2"
                        >
                            {showSatasaurus ? (
                                <>
                                    <ChevronLeft className="h-4 w-4 rotate-90" />
                                    Hide Satursaurus
                                </>
                            ) : (
                                <>
                                    <ChevronRight className="h-4 w-4 rotate-90" />
                                    Open Satursaurus
                                </>
                            )}
                            <span className="text-muted-foreground">({satasaurusStudents.length} students)</span>
                        </Button>

                        {/* Satasaurus Content - Only visible when toggled */}
                        {showSatasaurus && (
                            <div className={fullScreenMode === 'student' ? "fixed inset-0 z-50 bg-background p-6 flex flex-col" : "space-y-2"}>
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold">Satursaurus Students <span className="text-sm font-normal text-muted-foreground">(Saturdays only)</span></h3>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant={selectionMode === 'student' ? "secondary" : "outline"}
                                            size="sm"
                                            onClick={() => {
                                                if (selectionMode === 'student') {
                                                    setSelectionMode('none')
                                                    setSelectedCells([])
                                                } else {
                                                    setSelectionMode('student')
                                                    setSelectedCells([])
                                                }
                                            }}
                                            className={selectionMode === 'student' ? "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200" : ""}
                                        >
                                            {selectionMode === 'student' ? <CheckSquare className="h-4 w-4 mr-2" /> : <Square className="h-4 w-4 mr-2" />}
                                            Satursaurus Selection
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                const newMode = fullScreenMode === 'student' ? 'none' : 'student'
                                                setFullScreenMode(newMode)
                                                if (newMode === 'none') {
                                                    setZoomLevel(1)
                                                    setIsFitToScreen(false)
                                                }
                                            }}
                                        >
                                            {fullScreenMode === 'student' ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                                <div className={`border rounded-md overflow-hidden bg-background ${fullScreenMode === 'student' ? "flex-1" : ""}`}>
                                    <div className={`overflow-auto ${fullScreenMode === 'student' ? "h-full" : "max-h-[60vh]"}`}>
                                        <div className="min-w-max">
                                            {/* Satasaurus Header Row - Saturdays Only */}
                                            <div className="flex border-b border-border bg-muted sticky top-0 z-40">
                                                <div className="sticky left-0 z-50 w-40 min-w-[160px] p-2 border-r border-border bg-muted font-semibold flex items-center">
                                                    Satursaurus Students
                                                </div>
                                                {saturdayDays.map(day => {
                                                    const date = new Date(year, month, day)
                                                    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
                                                    return (
                                                        <div
                                                            key={day}
                                                            className="min-w-[100px] p-1 border-r border-border text-center flex flex-col justify-center"
                                                        >
                                                            <div className="text-sm font-bold">{day}</div>
                                                            <div className="text-xs">{dayName}</div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                            {/* Satasaurus Events Row - Saturdays Only */}
                                            <div className="flex border-b border-border bg-blue-50/30">
                                                <div className="sticky left-0 z-20 w-40 min-w-[160px] p-2 border-r border-border bg-blue-50/30 font-semibold flex items-center text-blue-700">
                                                    Events
                                                </div>
                                                {saturdayDays.map(day => {
                                                    const date = new Date(year, month, day)
                                                    const dayEvents = getDayEvents(day)
                                                    return (
                                                        <div
                                                            key={day}
                                                            className="w-[100px] min-w-[100px] max-w-[100px] h-[48px] p-1 border-r border-border relative group cursor-pointer hover:bg-blue-100/50 transition-colors overflow-hidden"
                                                            onClick={() => handleEventClick(date)}
                                                        >
                                                            <div className="space-y-1 h-full overflow-hidden">
                                                                {dayEvents.map(event => (
                                                                    <div
                                                                        key={event.id}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation()
                                                                            handleEventClick(date, event)
                                                                        }}
                                                                        className={`
                                                                text-[10px] p-1 rounded px-2 cursor-pointer hover:opacity-80 overflow-hidden text-ellipsis whitespace-nowrap max-w-full
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
                                            {/* Satasaurus Student Rows - Saturdays Only */}
                                            {satasaurusStudents.map(person => (
                                                <div key={person.id} className="flex border-b border-border hover:bg-slate-50">
                                                    <div className="sticky left-0 z-30 w-40 min-w-[160px] p-2 border-r border-border bg-background flex flex-col justify-center relative">
                                                        <div className="font-medium truncate" title={person.full_name}>{person.full_name}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {Array.isArray(person.categories)
                                                                ? person.categories.map(c => c.name).join(', ')
                                                                : (person.categories as any)?.name || '-'}
                                                        </div>
                                                    </div>
                                                    {saturdayDays.map(day => {
                                                        const date = new Date(year, month, day)
                                                        const dateStr = formatLocalDate(date)
                                                        const shift = shifts.find(s => s.person_id === person.id && s.date === dateStr)
                                                        const dayEvents = getDayEvents(day)
                                                        const isHoliday = dayEvents.some(e => e.is_holiday)
                                                        const attendanceRecord = attendance.find(a => a.person_id === person.id && a.date === dateStr)

                                                        let workHours: number | undefined
                                                        if (attendanceRecord) {
                                                            if (attendanceRecord.paid_leave_minutes && attendanceRecord.paid_leave_minutes > 0) {
                                                                workHours = attendanceRecord.paid_leave_minutes / 60
                                                            } else {
                                                                workHours = attendanceRecord.total_work_minutes / 60
                                                            }
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
                                                                isWeekend={false}
                                                                workHours={workHours}
                                                                showComputedHours={false}
                                                                isSelected={selectedCells.some(c => c.personId === person.id && c.dateString === dateStr)}
                                                                isSelectionMode={selectionMode === 'student'}
                                                                person={person}
                                                                day={day}
                                                                onCellClick={handleCellClick}
                                                            />
                                                        )
                                                    })}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {
                    selectedPerson && selectedDate && (
                        <ShiftEditDialog
                            open={dialogOpen}
                            onOpenChange={setDialogOpen}
                            personName={selectedPerson.full_name}
                            role={selectedPerson.role as "student" | "employee"}
                            date={selectedDate}
                            currentShift={selectedShift}
                            onSave={handleSaveShift}
                            onDelete={selectedShift ? handleDeleteShift : undefined}
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

                {monthlyStatusPerson && (
                    <MonthlyStatusDialog
                        open={monthlyStatusDialogOpen}
                        onOpenChange={setMonthlyStatusDialogOpen}
                        personId={monthlyStatusPerson.id}
                        personName={monthlyStatusPerson.full_name}
                        year={year}
                        month={month}
                    />
                )}


                {/* Bulk Actions Bar */}
                {
                    selectionMode !== 'none' && selectedCells.length > 0 && (
                        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white shadow-lg border rounded-full px-6 py-3 flex items-center gap-4 z-[60]">
                            <div className="font-medium text-sm">
                                {selectedCells.length} selected
                            </div>
                            <div className="h-4 w-px bg-border" />
                            <Button
                                size="sm"
                                onClick={() => {
                                    // Open dialog for bulk edit

                                    // Check if all selected cells have the same shift content
                                    let commonShift: MasterListShiftData | null = null;
                                    let hasMismatch = false;

                                    if (selectedCells.length > 0) {
                                        // Get the shift for the first cell
                                        const firstCell = selectedCells[0];
                                        const firstShift = shifts.find(s => s.person_id === firstCell.personId && s.date === firstCell.dateString);

                                        // Helper to serialize relevant fields for comparison
                                        const serializeShift = (s: any) => {
                                            if (!s) return 'null';
                                            // Helper to normalize empty strings/nulls
                                            const norm = (v: any) => (v === null || v === undefined) ? '' : String(v);
                                            // Helper for booleans (sometimes null/undefined in DB, assume false if missing)
                                            const normBool = (v: any) => !!v;

                                            return JSON.stringify({
                                                type: norm(s.shift_type),
                                                start: norm(s.start_time),
                                                end: norm(s.end_time),
                                                loc: norm(s.location),
                                                hours: norm(s.paid_leave_hours), // "8" vs 8 issue potentially? norm() handles string conversion
                                                memo: norm(s.memo),
                                                color: norm(s.color),
                                                break: normBool(s.force_break)
                                            });
                                        };

                                        const firstShiftStr = serializeShift(firstShift);

                                        // Check all other cells
                                        for (let i = 1; i < selectedCells.length; i++) {
                                            const cell = selectedCells[i];
                                            const shift = shifts.find(s => s.person_id === cell.personId && s.date === cell.dateString);
                                            if (serializeShift(shift) !== firstShiftStr) {
                                                hasMismatch = true;
                                                break;
                                            }
                                        }

                                        if (!hasMismatch && firstShift) {
                                            // All match and it's not empty, set as common shift
                                            commonShift = {
                                                date: firstShift.date, // This date will be ignored/overridden by bulk save logic effectively, but needed for type
                                                shift_type: firstShift.shift_type,
                                                shift_name: firstShift.shift_name,
                                                start_time: firstShift.start_time,
                                                end_time: firstShift.end_time,
                                                location: firstShift.location,
                                                paid_leave_hours: firstShift.paid_leave_hours,
                                                memo: firstShift.memo,
                                                color: firstShift.color,
                                                force_break: firstShift.force_break
                                            };
                                        }
                                        // If hasMismatch is true, or if firstShift is undefined (all empty), commonShift remains null
                                        // If all empty, logic correctly passes null, which defaults to fresh "Work" shift in dialog.
                                    }

                                    setSelectedPerson({
                                        id: 'bulk',
                                        full_name: `${selectedCells.length} People`,
                                        code: '',
                                        role: (selectionMode === 'student' ? 'student' : 'employee') as 'student' | 'employee'
                                    })
                                    setSelectedDate(new Date()) // Dummy date
                                    setSelectedShift(commonShift)
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

                {/* Bulk Delete Confirm Dialog */}
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Shifts?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to delete SHIFTS for {selectedCells.length} selected cells?
                                <br /><br />
                                This action cannot be undone. This will <strong>NOT</strong> delete the employee records, only the scheduled shifts.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={(e) => {
                                    e.preventDefault() // Prevent auto-closing
                                    confirmBulkDelete()
                                }}
                                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                                disabled={isDeleting}
                            >
                                {isDeleting ? 'Deleting...' : 'Delete Shifts'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </React.Fragment>
    )
}
