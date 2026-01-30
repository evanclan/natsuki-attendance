'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Person, logAttendance, undoAbsent, undoCheckIn, undoCheckOut } from '@/app/actions/kiosk'
import { attendanceQueue } from '@/lib/attendance-queue'
import { Loader2, LogIn, LogOut, Coffee, XCircle, PlayCircle, Clock, Undo, CheckCircle2 } from 'lucide-react'
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
import { toast } from "sonner"

interface PersonCardProps {
    person: Person
    role: 'student' | 'employee'
    selectionMode?: boolean
    isSelected?: boolean
    onSelect?: () => void
}

type ConfirmationState = {
    isOpen: boolean
    title: string
    description: string
    action: () => Promise<void>
    actionLabel?: string
    variant?: "default" | "destructive"
}

export function PersonCard({ person, role, selectionMode, isSelected, onSelect }: PersonCardProps) {
    const router = useRouter()
    const [loading, setLoading] = useState<string | null>(null)
    const [breakTimeRemaining, setBreakTimeRemaining] = useState<string | null>(null)
    const [confirmation, setConfirmation] = useState<ConfirmationState>({
        isOpen: false,
        title: "",
        description: "",
        action: async () => { },
    })

    // Optimistic UI State
    const [optimisticAttendance, setOptimisticAttendance] = useState(person.attendance_today)

    // Sync optimistic state when prop updates (e.g. after router.refresh)
    useEffect(() => {
        setOptimisticAttendance(person.attendance_today)
    }, [person.attendance_today])

    const handleAction = async (eventType: string) => {
        if (selectionMode) return

        // 1. Optimistic Update
        const previousAttendance = optimisticAttendance
        const now = new Date().toISOString()

        let newAttendance = optimisticAttendance ? { ...optimisticAttendance } : {
            check_in_at: null,
            check_out_at: null,
            break_start_at: null,
            break_end_at: null,
            status: 'present'
        }

        if (eventType === 'check_in') {
            newAttendance.check_in_at = now
            newAttendance.status = 'present'
        } else if (eventType === 'check_out') {
            newAttendance.check_out_at = now
        } else if (eventType === 'break_start') {
            newAttendance.break_start_at = now
        } else if (eventType === 'break_end') {
            newAttendance.break_end_at = now
        } else if (eventType === 'mark_absent') {
            newAttendance.status = 'absent'
        }

        setOptimisticAttendance(newAttendance)

        attendanceQueue.enqueue(async () => {
            try {
                const result = await logAttendance(person.id, eventType)
                if (!result.success) {
                    // Revert on failure
                    setOptimisticAttendance(previousAttendance)
                    toast.error('Failed to log attendance', {
                        description: result.error
                    })
                } else {
                    // Refresh data in background
                    router.refresh()
                }
            } catch (error) {
                console.error(error)
                setOptimisticAttendance(previousAttendance)
                toast.error('An error occurred')
            }
        })
    }

    const executeUndo = async (
        apiCall: () => Promise<any>,
        optimisticUpdate: () => any, // Returns previous state
        successMessage: string
    ) => {
        if (selectionMode) return

        // Close dialog first
        setConfirmation(prev => ({ ...prev, isOpen: false }))

        // Optimistic Update
        const previousAttendance = optimisticUpdate()

        attendanceQueue.enqueue(async () => {
            try {
                const result = await apiCall()
                if (!result.success) {
                    setOptimisticAttendance(previousAttendance)
                    toast.error('Failed to undo', {
                        description: result.error
                    })
                } else {
                    toast.success(successMessage)
                    router.refresh()
                }
            } catch (error) {
                console.error(error)
                setOptimisticAttendance(previousAttendance)
                toast.error('An error occurred')
            }
        })
    }


    const handleUndoAbsent = () => {
        if (selectionMode) return

        setConfirmation({
            isOpen: true,
            title: "Undo Absent Status?",
            description: `Are you sure you want to undo the ABSENT status for ${person.full_name}?`,
            action: async () => {
                await executeUndo(
                    () => undoAbsent(person.id),
                    () => {
                        const prev = optimisticAttendance
                        const newAtt = optimisticAttendance ? { ...optimisticAttendance } : null
                        if (newAtt && newAtt.status === 'absent') {
                            newAtt.status = 'present'
                        }
                        setOptimisticAttendance(newAtt)
                        return prev
                    },
                    "Absent status reverted"
                )
            },
            variant: "destructive"
        })
    }

    const handleUndoCheckIn = () => {
        if (selectionMode) return
        setConfirmation({
            isOpen: true,
            title: "Undo Check-In?",
            description: `Are you sure you want to undo the check-in for ${person.full_name}? This will remove today's attendance record so far.`,
            action: async () => {
                await executeUndo(
                    () => undoCheckIn(person.id),
                    () => {
                        const prev = optimisticAttendance
                        setOptimisticAttendance(null)
                        return prev
                    },
                    "Check-in reverted"
                )
            },
            variant: "destructive"
        })
    }

    const handleUndoCheckOut = () => {
        if (selectionMode) return
        setConfirmation({
            isOpen: true,
            title: "Undo Check-Out?",
            description: `Are you sure you want to undo the check-out for ${person.full_name}? They will be marked as 'Checked In'.`,
            action: async () => {
                await executeUndo(
                    () => undoCheckOut(person.id),
                    () => {
                        const prev = optimisticAttendance
                        const newAtt = optimisticAttendance ? { ...optimisticAttendance } : null
                        if (newAtt) {
                            newAtt.check_out_at = null
                            newAtt.status = 'present'
                        }
                        setOptimisticAttendance(newAtt)
                        return prev
                    },
                    "Check-out reverted"
                )
            },
            variant: "default" // Undo check-out is less destructive than deleting the whole record
        })
    }

    // Use optimistic state for rendering
    const attendance_today = optimisticAttendance

    // Determine state
    const isCheckedIn = !!attendance_today?.check_in_at
    const isCheckedOut = !!attendance_today?.check_out_at
    const isOnBreak = !!attendance_today?.break_start_at && !attendance_today?.break_end_at
    const isAbsent = attendance_today?.status === 'absent'
    const isDoneForToday = isCheckedIn && isCheckedOut

    const showInitialState = !isCheckedIn && !isAbsent

    // Break countdown timer (1 hour = 3600 seconds)
    useEffect(() => {
        if (!isOnBreak || !attendance_today?.break_start_at) {
            setBreakTimeRemaining(null)
            return
        }

        const updateTimer = () => {
            const breakStart = new Date(attendance_today.break_start_at!).getTime()
            const now = Date.now()
            const elapsed = Math.floor((now - breakStart) / 1000) // seconds
            const totalBreakTime = 60 * 60 // 1 hour in seconds
            const remaining = Math.max(0, totalBreakTime - elapsed)

            const minutes = Math.floor(remaining / 60)
            const seconds = remaining % 60
            setBreakTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`)
        }

        updateTimer() // Initial update
        const interval = setInterval(updateTimer, 1000)
        return () => clearInterval(interval)
    }, [isOnBreak, attendance_today?.break_start_at])

    return (
        <>
            <AlertDialog open={confirmation.isOpen} onOpenChange={(open) => setConfirmation(prev => ({ ...prev, isOpen: open }))}>
                <AlertDialogContent className="bg-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>{confirmation.title}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirmation.description}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault()
                                confirmation.action()
                            }}
                            className={confirmation.variant === "destructive" ? "bg-red-600 hover:bg-red-700 text-white" : "bg-orange-500 hover:bg-orange-600 text-white"}
                        >
                            {confirmation.actionLabel || "Confirm"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {(function () {
                if (isAbsent) {
                    return (
                        <Card
                            className={`hover:shadow-xl transition-all duration-300 border-2 border-red-200 bg-red-50/50 relative rounded-xl overflow-hidden group ${selectionMode ? 'cursor-pointer' : ''} ${isSelected ? 'ring-4 ring-orange-400 ring-offset-2' : ''}`}
                            onClick={selectionMode ? onSelect : undefined}
                        >
                            <div className="absolute inset-0 bg-[radial-gradient(#fee2e2_1px,transparent_1px)] [background-size:16px_16px] opacity-50" />
                            <CardHeader className="py-2 px-2 relative z-10">
                                <div className="text-center">
                                    <CardTitle className="text-base font-bold text-slate-700 truncate leading-tight" title={person.full_name}>
                                        {person.full_name}
                                    </CardTitle>
                                    {person.japanese_name && (
                                        <p className="text-[0.6rem] text-slate-400 font-medium truncate mt-0.5">
                                            {person.japanese_name}
                                        </p>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="flex justify-center items-center pb-2 px-2 relative z-10 min-h-[40px]">
                                <div className="transform rotate-[-8deg] bg-red-100 border border-red-400 text-red-600 px-2 py-0.5 rounded shadow-sm font-black tracking-widest text-xs opacity-90 group-hover:scale-110 transition-transform">
                                    ABSENT
                                </div>
                                {!selectionMode && (
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="absolute bottom-1 right-1 h-6 w-6 bg-white hover:bg-red-100 text-red-400 hover:text-red-600 border-red-200 shadow-sm rounded-full transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleUndoAbsent()
                                        }}
                                        disabled={!!loading}
                                        title="Undo absent"
                                    >
                                        <Undo className="h-3 w-3" />
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    )
                }

                if (isDoneForToday) {
                    return (
                        <Card
                            className={`transition-all duration-300 border-2 border-slate-200 bg-slate-50 relative rounded-xl overflow-hidden group ${selectionMode ? 'cursor-pointer' : ''} ${isSelected ? 'ring-4 ring-orange-400 ring-offset-2' : ''}`}
                            onClick={selectionMode ? onSelect : undefined}
                        >
                            <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-50" />
                            <CardHeader className="py-2 px-2 relative z-10 opacity-75">
                                <div className="text-center">
                                    <CardTitle className="text-base font-bold text-slate-600 truncate leading-tight" title={person.full_name}>
                                        {person.full_name}
                                    </CardTitle>
                                    {person.japanese_name && (
                                        <p className="text-[0.6rem] text-slate-400 font-medium truncate mt-0.5">
                                            {person.japanese_name}
                                        </p>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="flex flex-col justify-center items-center pb-2 px-2 relative z-10 min-h-[40px]">
                                <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                                    <CheckCircle2 className="h-4 w-4" />
                                    <span className="text-[0.65rem] font-medium">気をつけて帰ってください</span>
                                </div>

                                {!selectionMode && (
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="absolute bottom-1 right-1 h-6 w-6 bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-600 border-slate-200 shadow-sm rounded-full transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleUndoCheckOut()
                                        }}
                                        disabled={!!loading}
                                        title="Undo check-out"
                                    >
                                        <Undo className="h-3 w-3" />
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    )
                }

                return (
                    <Card
                        className={`hover:-translate-y-1 hover:shadow-[0_8px_16px_-6px_rgba(0,0,0,0.1)] transition-all duration-300 rounded-xl border-2 border-slate-100 bg-white shadow-[0_2px_0_0_rgba(241,245,249,1)] ${selectionMode ? 'cursor-pointer' : ''} ${isSelected ? 'ring-4 ring-orange-400 ring-offset-2' : ''}`}
                        onClick={selectionMode ? onSelect : undefined}
                    >
                        <CardHeader className="py-2 px-2">
                            <div className="text-center">
                                <CardTitle className="text-base font-bold text-slate-700 truncate leading-tight" title={person.full_name}>
                                    {person.full_name}
                                </CardTitle>
                                {person.japanese_name && (
                                    <p className="text-[0.6rem] text-slate-400 font-medium truncate mt-0.5">
                                        {person.japanese_name}
                                    </p>
                                )}
                            </div>
                            {isOnBreak && breakTimeRemaining && (
                                <div className="flex items-center justify-center gap-1.5 mt-1 text-orange-500 font-bold bg-orange-50 py-1 px-3 rounded-full w-fit mx-auto">
                                    <Clock className="h-3.5 w-3.5 animate-pulse" />
                                    <span className="text-xs tracking-wide">{breakTimeRemaining}</span>
                                </div>
                            )}
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-1.5 pb-2 px-2">
                            {selectionMode ? (
                                <div className="col-span-2 h-8 flex items-center justify-center">
                                    {isSelected ? (
                                        <div className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                            <div className="w-2 h-2 bg-orange-500 rounded-full" />
                                            Selected
                                        </div>
                                    ) : (
                                        <div className="text-slate-400 text-xs">Click to select</div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    {showInitialState ? (
                                        <>
                                            <Button
                                                variant="outline"
                                                className="h-8 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border-emerald-200 hover:border-emerald-300 rounded-lg shadow-[0_2px_0_0_rgba(167,243,208,1)] active:shadow-none active:translate-y-[2px] transition-all px-0"
                                                onClick={() => handleAction('check_in')}
                                                disabled={!!loading}
                                            >
                                                {loading === 'check_in' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogIn className="h-3.5 w-3.5 mr-1" />}
                                                <span className="font-bold text-xs">IN</span>
                                            </Button>
                                            <Button
                                                variant="outline"
                                                className="h-8 bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200 hover:border-slate-300 rounded-lg shadow-[0_2px_0_0_rgba(226,232,240,1)] active:shadow-none active:translate-y-[2px] transition-all px-0"
                                                onClick={() => handleAction('mark_absent')}
                                                disabled={!!loading}
                                            >
                                                {loading === 'mark_absent' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5 mr-1" />}
                                                <span className="font-bold text-[0.6rem]">ABSENT</span>
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            {role === 'student' && (
                                                <div className="col-span-2 flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        className="flex-1 h-8 bg-rose-100 hover:bg-rose-200 text-rose-700 border-rose-200 hover:border-rose-300 rounded-lg shadow-[0_2px_0_0_rgba(253,164,175,1)] active:shadow-none active:translate-y-[2px] transition-all"
                                                        onClick={() => handleAction('check_out')}
                                                        disabled={!!loading}
                                                    >
                                                        {loading === 'check_out' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5 mr-1" />}
                                                        <span className="font-bold text-xs">OUT</span>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full"
                                                        onClick={handleUndoCheckIn}
                                                        disabled={!!loading}
                                                        title="Undo Check-in"
                                                    >
                                                        <Undo className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}

                                            {role === 'employee' && (
                                                <>
                                                    <Button
                                                        variant="outline"
                                                        className="h-8 bg-amber-100 hover:bg-amber-200 text-amber-700 border-amber-200 hover:border-amber-300 rounded-lg shadow-[0_2px_0_0_rgba(252,211,77,1)] active:shadow-none active:translate-y-[2px] transition-all px-0"
                                                        onClick={() => handleAction('break_start')}
                                                        disabled={!!loading || isOnBreak}
                                                        style={{ opacity: isOnBreak ? 0.5 : 1 }}
                                                    >
                                                        {loading === 'break_start' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Coffee className="h-3.5 w-3.5 mr-1" />}
                                                        <span className="font-bold text-[0.6rem]">BREAK</span>
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        className="h-8 bg-sky-100 hover:bg-sky-200 text-sky-700 border-sky-200 hover:border-sky-300 rounded-lg shadow-[0_2px_0_0_rgba(186,230,253,1)] active:shadow-none active:translate-y-[2px] transition-all px-0"
                                                        onClick={() => handleAction('break_end')}
                                                        disabled={!!loading || !isOnBreak}
                                                        style={{ opacity: !isOnBreak ? 0.5 : 1 }}
                                                    >
                                                        {loading === 'break_end' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5 mr-1" />}
                                                        <span className="font-bold text-[0.6rem]">RESUME</span>
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        className="col-span-2 h-8 bg-rose-100 hover:bg-rose-200 text-rose-700 border-rose-200 hover:border-rose-300 rounded-lg shadow-[0_2px_0_0_rgba(253,164,175,1)] active:shadow-none active:translate-y-[2px] transition-all"
                                                        onClick={() => handleAction('check_out')}
                                                        disabled={!!loading}
                                                    >
                                                        {loading === 'check_out' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5 mr-1" />}
                                                        <span className="font-bold text-xs">OUT</span>
                                                    </Button>
                                                </>
                                            )}
                                        </>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>
                )
            })()}
        </>
    )
}
