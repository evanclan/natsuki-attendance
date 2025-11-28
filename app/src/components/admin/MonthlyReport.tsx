'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { ChevronLeft, ChevronRight, AlertCircle, Clock, AlertTriangle, Pencil, Coffee, Save, X, Loader2, LogOut, Briefcase, CalendarOff, Printer } from 'lucide-react'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { getMonthlyAttendanceReport, type DailyAttendance, type MonthlyAttendanceReport } from '@/app/admin/manage_employee/[code]/actions'
import { upsertAttendanceRecord } from '@/app/admin/attendance-actions/actions'

interface MonthlyReportProps {
    personId: string
}

export function MonthlyReport({ personId }: MonthlyReportProps) {
    const [loading, setLoading] = useState(true)
    const [report, setReport] = useState<MonthlyAttendanceReport | null>(null)
    const [currentDate, setCurrentDate] = useState(new Date())

    // Editing state
    const [editingDate, setEditingDate] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [editForm, setEditForm] = useState<{
        checkIn: string
        checkOut: string
        status: string
    }>({
        checkIn: '',
        checkOut: '',
        status: ''
    })

    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth() + 1 // 1-12

    useEffect(() => {
        loadReport()
    }, [personId, currentYear, currentMonth])

    const loadReport = async () => {
        setLoading(true)
        const result = await getMonthlyAttendanceReport(personId, currentYear, currentMonth)
        if (result.success && result.data) {
            setReport(result.data)
        }
        setLoading(false)
    }

    const handlePreviousMonth = () => {
        setCurrentDate(new Date(currentYear, currentMonth - 2, 1))
    }

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentYear, currentMonth, 1))
    }

    const formatTime = (isoString: string | null) => {
        if (!isoString) return '-'
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    // Helper to extract HH:MM from ISO string for input
    const getInputValue = (isoString: string | null) => {
        if (!isoString) return ''
        const date = new Date(isoString)
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    }

    const formatMinutesToHours = (minutes: number | null) => {
        if (!minutes) return '-'
        const hours = Math.floor(minutes / 60)
        const mins = minutes % 60
        return `${hours}:${mins.toString().padStart(2, '0')}`
    }

    const getNotificationIcon = (type: DailyAttendance['notifications'][0]['type']) => {
        switch (type) {
            case 'late':
                return <AlertTriangle className="h-3 w-3 text-amber-600" />
            case 'early_out':
                return <LogOut className="h-3 w-3 text-amber-600" />
            case 'break_exceeded':
                return <Coffee className="h-3 w-3 text-red-600" />
            case 'missing_checkin':
            case 'missing_checkout':
                return <AlertCircle className="h-3 w-3 text-orange-600" />
            case 'no_break':
                return <Clock className="h-3 w-3 text-yellow-600" />
            case 'edited':
                return <Pencil className="h-3 w-3 text-blue-600" />
            case 'business_trip':
                return <Briefcase className="h-3 w-3 text-purple-600" />
            case 'paid_leave':
                return <Briefcase className="h-3 w-3 text-green-600" />
            case 'half_paid_leave':
                return <Briefcase className="h-3 w-3 text-yellow-600" />
            case 'special_leave':
                return <CalendarOff className="h-3 w-3 text-orange-600" />
        }
    }

    const handleEditClick = (day: DailyAttendance) => {
        setEditingDate(day.date)
        setEditForm({
            checkIn: getInputValue(day.checkIn),
            checkOut: getInputValue(day.checkOut),
            status: day.isRestDay ? (day.isHoliday ? 'holiday' : 'rest_day') : (day.checkIn ? 'present' : 'absent')
        })
    }

    const handleCancelEdit = () => {
        setEditingDate(null)
        setEditForm({ checkIn: '', checkOut: '', status: '' })
    }

    const handleSaveEdit = async (dateStr: string) => {
        setSaving(true)

        // Construct ISO strings for the backend
        // We use the date from the row and time from the input
        const constructDateTime = (timeStr: string) => {
            if (!timeStr) return null
            const [hours, minutes] = timeStr.split(':').map(Number)
            const date = new Date(dateStr)
            date.setHours(hours, minutes, 0, 0)
            return date.toISOString()
        }

        const result = await upsertAttendanceRecord(personId, dateStr, {
            check_in_at: constructDateTime(editForm.checkIn),
            check_out_at: constructDateTime(editForm.checkOut),
            status: editForm.status,
            // We don't set break times manually here for now, relying on auto-calc or separate edit if needed
            // But for simplicity in this report view, we'll just update main times
        })

        if (result.success) {
            // toast.success("Attendance updated")
            setEditingDate(null)
            loadReport() // Reload to get updated calculations
        } else {
            alert(result.error || "Failed to update attendance")
        }

        setSaving(false)
    }

    const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    const handlePrintPDF = () => {
        window.print()
    }

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Monthly Attendance Report</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                        Loading...
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (!report) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Monthly Attendance Report</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                        No data available
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card id="printable-report" className="print:shadow-none print:border-none">
            <CardHeader className="print:pb-2 print:pt-0">
                <div className="flex items-center justify-between print:justify-center">
                    <div className="print:text-center print:w-full">
                        <CardTitle className="print:text-lg print:font-bold">Monthly Attendance Report</CardTitle>
                        {report && (
                            <p className="text-sm text-muted-foreground mt-1 print:text-black print:text-sm print:font-semibold print:mt-1">
                                {report.employeeName} - {monthName}
                            </p>
                        )}
                    </div>
                    <div className="flex gap-2 print:hidden">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handlePreviousMonth}
                            disabled={loading}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center px-4 border rounded-md bg-muted/30">
                            <span className="text-sm font-medium">{monthName}</span>
                        </div>
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
            <CardContent className="space-y-4 print:p-0 print:space-y-1">
                {/* Summary Statistics */}
                <div className="grid grid-cols-7 gap-3 p-4 bg-muted/30 rounded-lg print:bg-gray-100 print:text-[9px] print:p-1 print:gap-1 print:mb-2">
                    <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1 print:text-gray-700 print:font-medium print:text-[10px] print:mb-0">Working Days</div>
                        <div className="text-lg font-semibold print:text-xs">{report.summary.workingDays}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1 print:text-gray-700 print:font-medium print:text-[10px] print:mb-0">Attended</div>
                        <div className="text-lg font-semibold text-green-600 print:text-xs print:text-green-700">{report.summary.daysAttended}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1 print:text-gray-700 print:font-medium print:text-[10px] print:mb-0">Absent</div>
                        <div className="text-lg font-semibold text-red-600 print:text-xs print:text-red-700">{report.summary.daysAbsent}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1 print:text-gray-700 print:font-medium print:text-[10px] print:mb-0">Total Work Hours</div>
                        <div className="text-lg font-semibold print:text-xs">{report.summary.totalWorkHours}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1 print:text-gray-700 print:font-medium print:text-[10px] print:mb-0">Total Overtime</div>
                        <div className="text-lg font-semibold text-purple-600 print:text-xs print:text-purple-700">{report.summary.totalOvertimeHours}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1 print:text-gray-700 print:font-medium print:text-[10px] print:mb-0">Total Paid Leave</div>
                        <div className="text-lg font-semibold text-blue-600 print:text-xs print:text-blue-700">{report.summary.totalPaidLeaveHours}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1 print:text-gray-700 print:font-medium print:text-[10px] print:mb-0">Total Special Leave</div>
                        <div className="text-lg font-semibold text-orange-600 print:text-xs print:text-orange-700">{report.summary.totalSpecialLeaveDays} days</div>
                    </div>
                </div>

                {/* Attendance Table */}
                <div className="rounded-md border overflow-x-auto print:overflow-visible print:border-gray-300">
                    <Table>
                        <TableHeader>
                            <TableRow className="print:h-[26px]">
                                <TableHead className="w-[60px] text-center print:text-[11px] print:py-0.5 print:h-[26px]">Date</TableHead>
                                <TableHead className="w-[60px] text-center print:text-[11px] print:py-0.5 print:h-[26px]">Day</TableHead>
                                <TableHead className="w-[110px] text-center print:text-[11px] print:py-0.5 print:h-[26px]">Check In</TableHead>
                                <TableHead className="w-[110px] text-center print:text-[11px] print:py-0.5 print:h-[26px]">Check Out</TableHead>
                                <TableHead className="w-[80px] text-center print:text-[11px] print:py-0.5 print:h-[26px]">Break</TableHead>
                                <TableHead className="w-[80px] text-center print:text-[11px] print:py-0.5 print:h-[26px]">Work Hrs</TableHead>
                                <TableHead className="w-[80px] text-center print:text-[11px] print:py-0.5 print:h-[26px]">Paid Leave</TableHead>
                                <TableHead className="w-[80px] text-center print:text-[11px] print:py-0.5 print:h-[26px]">Overtime</TableHead>
                                <TableHead className="w-[120px] print:text-[11px] print:py-0.5 print:h-[26px]">Notifications</TableHead>
                                <TableHead className="w-[80px] text-right print:hidden">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {report.dailyRecords.map((record) => {
                                const isEditing = editingDate === record.date
                                const isRestDay = record.isRestDay
                                const isWeekend = record.dayOfWeek === 'Sat' || record.dayOfWeek === 'Sun'

                                return (
                                    <TableRow
                                        key={record.date}
                                        className={`${isRestDay ? 'bg-red-50/50 print:bg-red-50' : 'print:border-gray-200'} print:h-[26px]`}
                                    >
                                        <TableCell className="text-center font-medium print:text-[11px] print:py-0.5 print:h-[26px]">
                                            <div className={isRestDay ? 'text-red-600' : ''}>
                                                {record.dayNumber.toString().padStart(2, '0')}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center print:text-[11px] print:py-0.5 print:h-[26px]">
                                            <div className={isRestDay ? 'text-red-600 font-medium' : ''}>
                                                {record.dayOfWeek}
                                            </div>
                                            {isRestDay && !record.isHoliday && !record.eventTitle && (
                                                <div className="text-[10px] text-red-500 print:text-[9px]">Rest</div>
                                            )}
                                            {record.isHoliday && record.eventTitle && (
                                                <div className="text-[10px] text-red-500 truncate max-w-[60px] print:text-[9px]">
                                                    {record.eventTitle}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center text-sm print:text-[11px] print:py-0.5 print:h-[26px]">
                                            {isEditing ? (
                                                <Input
                                                    type="time"
                                                    className="h-8 text-xs"
                                                    value={editForm.checkIn}
                                                    onChange={(e) => setEditForm({ ...editForm, checkIn: e.target.value })}
                                                />
                                            ) : (
                                                formatTime(record.checkIn)
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center text-sm print:text-[11px] print:py-0.5 print:h-[26px]">
                                            {isEditing ? (
                                                <Input
                                                    type="time"
                                                    className="h-8 text-xs"
                                                    value={editForm.checkOut}
                                                    onChange={(e) => setEditForm({ ...editForm, checkOut: e.target.value })}
                                                />
                                            ) : (
                                                formatTime(record.checkOut)
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center text-sm print:text-[11px] print:py-0.5 print:h-[26px]">
                                            {formatMinutesToHours(record.breakMinutes)}
                                        </TableCell>
                                        <TableCell className="text-center text-sm font-medium print:text-[11px] print:py-0.5 print:h-[26px]">
                                            {formatMinutesToHours(record.workMinutes)}
                                        </TableCell>
                                        <TableCell className="text-center text-sm font-medium text-blue-600 print:text-[11px] print:py-0.5 print:h-[26px] print:text-blue-700">
                                            {record.paidLeaveMinutes ? formatMinutesToHours(record.paidLeaveMinutes) : '-'}
                                        </TableCell>
                                        <TableCell className="text-center text-sm font-medium text-purple-600 print:text-[11px] print:py-0.5 print:h-[26px] print:text-purple-700">
                                            {record.overtimeMinutes ? formatMinutesToHours(record.overtimeMinutes) : '-'}
                                        </TableCell>
                                        <TableCell className="print:text-[11px] print:py-0.5 print:h-[26px]">
                                            <div className="flex flex-wrap gap-1">
                                                {record.notifications.map((notif, idx) => (
                                                    <TooltipProvider key={idx}>
                                                        <Tooltip>
                                                            <TooltipTrigger>
                                                                <Badge
                                                                    variant="outline"
                                                                    className={`h-5 px-1.5 print:h-4 print:px-1 print:text-[9px] ${notif.type === 'break_exceeded' ? 'bg-red-50 text-red-700 border-red-200' :
                                                                        notif.type === 'missing_checkin' || notif.type === 'missing_checkout' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                                                            notif.type === 'no_break' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                                                notif.type === 'business_trip' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                                                    notif.type === 'paid_leave' ? 'bg-green-50 text-green-700 border-green-200' :
                                                                                        notif.type === 'half_paid_leave' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                                                            notif.type === 'special_leave' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                                                                                'bg-blue-50 text-blue-700 border-blue-200'
                                                                        }`}
                                                                >
                                                                    {getNotificationIcon(notif.type)}
                                                                </Badge>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p className="text-xs">{notif.message}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right print:hidden">
                                            {isEditing ? (
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                        onClick={() => handleSaveEdit(record.date)}
                                                        disabled={saving}
                                                    >
                                                        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        onClick={handleCancelEdit}
                                                        disabled={saving}
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                                                    onClick={() => handleEditClick(record)}
                                                >
                                                    <Pencil className="h-3 w-3" />
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>

                {/* Print PDF Button */}
                <div className="flex justify-end print:hidden">
                    <Button
                        onClick={handlePrintPDF}
                        variant="default"
                        className="gap-2"
                    >
                        <Printer className="h-4 w-4" />
                        Print PDF
                    </Button>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2 border-t print:text-[10px] print:gap-2">
                    <div className="flex items-center gap-1.5">
                        <AlertTriangle className="h-3 w-3 text-amber-600" />
                        <span>Late check-in</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <LogOut className="h-3 w-3 text-amber-600" />
                        <span>Early out</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Coffee className="h-3 w-3 text-red-600" />
                        <span>Break exceeded</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <AlertCircle className="h-3 w-3 text-orange-600" />
                        <span>Missing check-in/out</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-yellow-600" />
                        <span>No break logged</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Pencil className="h-3 w-3 text-blue-600" />
                        <span>Admin edited</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Briefcase className="h-3 w-3 text-purple-600" />
                        <span>Business trip</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Briefcase className="h-3 w-3 text-green-600" />
                        <span>Paid leave</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Briefcase className="h-3 w-3 text-yellow-600" />
                        <span>Half paid leave</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <CalendarOff className="h-3 w-3 text-orange-600" />
                        <span>Special leave</span>
                    </div>
                </div>
            </CardContent >
        </Card >
    )
}
