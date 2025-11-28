'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Person, logAttendance, undoAbsent } from '@/app/actions/kiosk'
import { Loader2, LogIn, LogOut, Coffee, XCircle, PlayCircle, Clock, Undo } from 'lucide-react'

interface PersonCardProps {
    person: Person
    role: 'student' | 'employee'
}

export function PersonCard({ person, role }: PersonCardProps) {
    const router = useRouter()
    const [loading, setLoading] = useState<string | null>(null)
    const [breakTimeRemaining, setBreakTimeRemaining] = useState<string | null>(null)

    const handleAction = async (eventType: string) => {
        setLoading(eventType)
        try {
            const result = await logAttendance(person.id, eventType)
            if (!result.success) {
                alert('Failed to log attendance: ' + result.error)
            } else {
                // Force full page reload to update UI
                window.location.reload()
            }
        } catch (error) {
            console.error(error)
            alert('An error occurred')
        } finally {
            setLoading(null)
        }
    }

    const handleUndo = async () => {
        setLoading('undo')
        try {
            const result = await undoAbsent(person.id)
            if (!result.success) {
                alert('Failed to undo absent: ' + result.error)
            } else {
                // Force full page reload to update UI
                window.location.reload()
            }
        } catch (error) {
            console.error(error)
            alert('An error occurred')
        } finally {
            setLoading(null)
        }
    }

    const { attendance_today } = person

    // Determine state
    const isCheckedIn = !!attendance_today?.check_in_at
    const isCheckedOut = !!attendance_today?.check_out_at
    const isOnBreak = !!attendance_today?.break_start_at && !attendance_today?.break_end_at
    const isAbsent = attendance_today?.status === 'absent'

    // Reset state if checked out (as per "when everyone is out its back to original form")
    const showInitialState = !isCheckedIn || isCheckedOut

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

    if (isAbsent) {
        return (
            <Card className="hover:shadow-lg transition-shadow border-red-200 bg-red-50 relative">
                <CardHeader className="pb-1 pt-3">
                    <CardTitle className="text-base font-medium text-center truncate text-red-700" title={person.full_name}>
                        {person.full_name}
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center items-center h-[72px]">
                    <span className="text-lg font-bold text-red-600 tracking-widest border-2 border-red-600 px-3 py-1 rounded transform -rotate-12 opacity-80">
                        ABSENT
                    </span>
                    <Button
                        variant="outline"
                        size="icon"
                        className="absolute bottom-2 right-2 h-7 w-7 bg-white hover:bg-gray-50 text-gray-700 border-gray-300 shadow-sm"
                        onClick={handleUndo}
                        disabled={!!loading}
                        title="Undo absent"
                    >
                        {loading === 'undo' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Undo className="h-3 w-3" />}
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-1 pt-3">
                <CardTitle className="text-base font-medium text-center truncate" title={person.full_name}>
                    {person.full_name}
                </CardTitle>
                {isOnBreak && breakTimeRemaining && (
                    <div className="flex items-center justify-center gap-1 mt-1 text-orange-600 font-semibold">
                        <Clock className="h-3 w-3" />
                        <span className="text-xs">Break: {breakTimeRemaining}</span>
                    </div>
                )}
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 pb-3">
                {showInitialState ? (
                    <>
                        <Button
                            variant="outline"
                            size="sm"
                            className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                            onClick={() => handleAction('check_in')}
                            disabled={!!loading}
                        >
                            {loading === 'check_in' ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogIn className="h-3 w-3 mr-1" />}
                            IN
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200"
                            onClick={() => handleAction('mark_absent')}
                            disabled={!!loading}
                        >
                            {loading === 'mark_absent' ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3 mr-1" />}
                            ABSENT
                        </Button>
                    </>
                ) : (
                    <>
                        {role === 'student' && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="col-span-2 bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                                onClick={() => handleAction('check_out')}
                                disabled={!!loading}
                            >
                                {loading === 'check_out' ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogOut className="h-3 w-3 mr-1" />}
                                OUT
                            </Button>
                        )}

                        {role === 'employee' && (
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200"
                                    onClick={() => handleAction('break_start')}
                                    disabled={!!loading || isOnBreak}
                                    style={{ opacity: isOnBreak ? 0.5 : 1 }}
                                >
                                    {loading === 'break_start' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Coffee className="h-3 w-3 mr-1" />}
                                    BREAK
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                                    onClick={() => handleAction('break_end')}
                                    disabled={!!loading || !isOnBreak}
                                    style={{ opacity: !isOnBreak ? 0.5 : 1 }}
                                >
                                    {loading === 'break_end' ? <Loader2 className="h-3 w-3 animate-spin" /> : <PlayCircle className="h-3 w-3 mr-1" />}
                                    RESUME
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="col-span-2 bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                                    onClick={() => handleAction('check_out')}
                                    disabled={!!loading}
                                >
                                    {loading === 'check_out' ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogOut className="h-3 w-3 mr-1" />}
                                    OUT
                                </Button>
                            </>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    )
}
