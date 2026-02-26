'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    ChevronLeft,
    ChevronRight,
    Save,
    Loader2,
    ArrowLeft,
    Users,
    Trash2,
    CheckCircle2,
    AlertCircle,
    Zap,
} from 'lucide-react'
import {
    getEmployeeList,
    bulkUpsertAttendance,
} from './actions'
import {
    getMonthlyAttendanceReport,
    getMonthlyMemos,
    addMonthlyMemo,
    deleteMonthlyMemo,
} from '@/app/admin/manage_employee/[code]/actions'
import type { DailyAttendance, MonthlyAttendanceReport as MonthlyAttendanceReportType, MonthlyMemoEntry } from '@/app/admin/manage_employee/[code]/actions'

interface TimeEntry {
    date: string
    dayNumber: number
    dayOfWeek: string
    isRestDay: boolean
    isHoliday: boolean
    eventTitle?: string
    shiftType?: string
    originalCheckIn: string
    originalCheckOut: string
    checkIn: string
    checkOut: string
    isModified: boolean
}

export default function QuickActionPage() {
    // Employee selection
    const [employees, setEmployees] = useState<Array<{ id: string; code: string; full_name: string }>>([])
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')
    const [loadingEmployees, setLoadingEmployees] = useState(true)

    // Report data
    const [report, setReport] = useState<MonthlyAttendanceReportType | null>(null)
    const [currentDate, setCurrentDate] = useState(new Date())
    const [loadingReport, setLoadingReport] = useState(false)

    // Bulk time entries
    const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])

    // Saving state
    const [saving, setSaving] = useState(false)
    const [saveProgress, setSaveProgress] = useState(0)
    const [saveResult, setSaveResult] = useState<{ success: number; failed: number } | null>(null)

    // Memo state
    const [memoList, setMemoList] = useState<MonthlyMemoEntry[]>([])
    const [newMemoText, setNewMemoText] = useState('')
    const [savingMemo, setSavingMemo] = useState(false)
    const [deletingMemoId, setDeletingMemoId] = useState<string | null>(null)

    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth() + 1
    const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    // Count modified entries
    const modifiedEntries = useMemo(() => timeEntries.filter(e => e.isModified), [timeEntries])

    // Load employees on mount
    useEffect(() => {
        const load = async () => {
            setLoadingEmployees(true)
            const result = await getEmployeeList()
            if (result.success && result.data) {
                setEmployees(result.data)
            }
            setLoadingEmployees(false)
        }
        load()
    }, [])

    // Load report when employee or month changes
    useEffect(() => {
        if (!selectedEmployeeId) return
        loadReport()
    }, [selectedEmployeeId, currentYear, currentMonth])

    const loadReport = async () => {
        if (!selectedEmployeeId) return

        setLoadingReport(true)
        setSaveResult(null)

        const result = await getMonthlyAttendanceReport(selectedEmployeeId, currentYear, currentMonth)
        if (result.success && result.data) {
            setReport(result.data)

            // Build time entries from report
            const entries: TimeEntry[] = result.data.dailyRecords.map((record: DailyAttendance) => ({
                date: record.date,
                dayNumber: record.dayNumber,
                dayOfWeek: record.dayOfWeek,
                isRestDay: record.isRestDay,
                isHoliday: record.isHoliday,
                eventTitle: record.eventTitle,
                shiftType: record.shiftType || undefined,
                originalCheckIn: extractTime(record.checkIn),
                originalCheckOut: extractTime(record.checkOut),
                checkIn: extractTime(record.checkIn),
                checkOut: extractTime(record.checkOut),
                isModified: false,
            }))
            setTimeEntries(entries)
        }

        // Load memos
        const formattedMonth = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`
        const memosResult = await getMonthlyMemos(selectedEmployeeId, formattedMonth)
        if (memosResult.success) {
            setMemoList(memosResult.data || [])
        } else {
            setMemoList([])
        }

        setLoadingReport(false)
    }

    const extractTime = (isoString: string | null): string => {
        if (!isoString) return ''
        const date = new Date(isoString)
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    }

    const handleTimeChange = (index: number, field: 'checkIn' | 'checkOut', value: string) => {
        setTimeEntries(prev => {
            const updated = [...prev]
            updated[index] = {
                ...updated[index],
                [field]: value,
                isModified: true,
            }
            // Check if it's actually different from original
            const entry = updated[index]
            if (entry.checkIn === entry.originalCheckIn && entry.checkOut === entry.originalCheckOut) {
                updated[index].isModified = false
            }
            return updated
        })
    }

    const handleBulkSave = async () => {
        if (modifiedEntries.length === 0 || !selectedEmployeeId) return

        setSaving(true)
        setSaveProgress(0)
        setSaveResult(null)

        const entries: Array<{ date: string; checkIn: string; checkOut: string }> = modifiedEntries.map(e => ({
            date: e.date,
            checkIn: e.checkIn,
            checkOut: e.checkOut,
        }))

        const result = await bulkUpsertAttendance(selectedEmployeeId, entries)

        setSaveResult({ success: result.succeeded, failed: result.failed })
        setSaving(false)

        // Reload to get fresh data
        if (result.succeeded > 0) {
            await loadReport()
        }
    }

    const handlePreviousMonth = () => {
        setCurrentDate(new Date(currentYear, currentMonth - 2, 1))
    }

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentYear, currentMonth, 1))
    }

    // Memo handlers
    const handleAddMemo = async () => {
        if (!newMemoText.trim() || !selectedEmployeeId) return
        setSavingMemo(true)
        const formattedMonth = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`
        const result = await addMonthlyMemo(selectedEmployeeId, formattedMonth, newMemoText.trim())
        if (result.success) {
            setNewMemoText('')
            const memosResult = await getMonthlyMemos(selectedEmployeeId, formattedMonth)
            if (memosResult.success) {
                setMemoList(memosResult.data || [])
            }
        } else {
            alert(result.error || "Failed to add memo")
        }
        setSavingMemo(false)
    }

    const handleDeleteMemo = async (memoId: string) => {
        setDeletingMemoId(memoId)
        const result = await deleteMonthlyMemo(memoId)
        if (result.success) {
            setMemoList(prev => prev.filter(m => m.id !== memoId))
        } else {
            alert(result.error || "Failed to delete memo")
        }
        setDeletingMemoId(null)
    }

    const formatShiftType = (type: string | undefined | null) => {
        if (!type) return ''
        return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    }

    const selectedEmployee = employees.find(e => e.id === selectedEmployeeId)

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-slate-200/60 shadow-sm">
                <div className="max-w-2xl mx-auto px-4 py-3">
                    <div className="flex items-center gap-3">
                        <Link href="/admin">
                            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-1.5 rounded-lg shadow-md shadow-indigo-200/50">
                                <Zap className="h-4 w-4 text-white" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-base font-bold text-slate-800 truncate">Quick Action</h1>
                                <p className="text-[11px] text-slate-500 leading-tight">Bulk attendance entry</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 py-4 space-y-4 pb-32">
                {/* Employee Selector */}
                <Card className="border-slate-200/80 shadow-sm">
                    <CardContent className="pt-4 pb-4">
                        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
                            <Users className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" />
                            Select Employee
                        </Label>
                        <Select
                            value={selectedEmployeeId}
                            onValueChange={setSelectedEmployeeId}
                            disabled={loadingEmployees}
                        >
                            <SelectTrigger className="w-full h-11 text-base">
                                <SelectValue placeholder={loadingEmployees ? "Loading employees..." : "Choose an employee..."} />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                {employees.map((emp) => (
                                    <SelectItem key={emp.id} value={emp.id} className="py-2.5">
                                        <span className="font-medium">{emp.full_name}</span>
                                        <span className="text-muted-foreground ml-2 text-xs">({emp.code})</span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                {/* Content when employee is selected */}
                {selectedEmployeeId && (
                    <>
                        {/* Month Navigator */}
                        <Card className="border-slate-200/80 shadow-sm">
                            <CardContent className="pt-4 pb-4">
                                <div className="flex items-center justify-between">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={handlePreviousMonth}
                                        disabled={loadingReport}
                                        className="h-9 w-9"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <div className="text-center">
                                        <div className="text-sm font-bold text-slate-800">{monthName}</div>
                                        {selectedEmployee && (
                                            <div className="text-xs text-slate-500">{selectedEmployee.full_name}</div>
                                        )}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={handleNextMonth}
                                        disabled={loadingReport}
                                        className="h-9 w-9"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Summary Stats */}
                        {report && !loadingReport && (
                            <div className="grid grid-cols-4 gap-2">
                                <div className="bg-white rounded-xl border border-slate-200/80 p-3 text-center shadow-sm">
                                    <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Working</div>
                                    <div className="text-lg font-bold text-slate-800 mt-0.5">{report.summary.workingDays}</div>
                                </div>
                                <div className="bg-white rounded-xl border border-emerald-200/80 p-3 text-center shadow-sm">
                                    <div className="text-[10px] font-medium text-emerald-500 uppercase tracking-wider">Attended</div>
                                    <div className="text-lg font-bold text-emerald-600 mt-0.5">{report.summary.daysAttended}</div>
                                </div>
                                <div className="bg-white rounded-xl border border-red-200/80 p-3 text-center shadow-sm">
                                    <div className="text-[10px] font-medium text-red-400 uppercase tracking-wider">Absent</div>
                                    <div className="text-lg font-bold text-red-600 mt-0.5">{report.summary.daysAbsent}</div>
                                </div>
                                <div className="bg-white rounded-xl border border-purple-200/80 p-3 text-center shadow-sm">
                                    <div className="text-[10px] font-medium text-purple-400 uppercase tracking-wider">OT</div>
                                    <div className="text-lg font-bold text-purple-600 mt-0.5">{report.summary.totalOvertimeHours}</div>
                                </div>
                            </div>
                        )}

                        {/* Loading State */}
                        {loadingReport && (
                            <Card className="border-slate-200/80 shadow-sm">
                                <CardContent className="py-12">
                                    <div className="flex flex-col items-center gap-3">
                                        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                                        <p className="text-sm text-slate-500">Loading attendance data...</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Bulk Time Entry Grid */}
                        {!loadingReport && timeEntries.length > 0 && (
                            <Card className="border-slate-200/80 shadow-sm overflow-hidden">
                                <CardHeader className="pb-2 pt-4 px-4">
                                    <CardTitle className="text-sm font-bold text-slate-700 flex items-center justify-between">
                                        <span>Time Entry — {monthName}</span>
                                        {modifiedEntries.length > 0 && (
                                            <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 font-semibold">
                                                {modifiedEntries.length} modified
                                            </Badge>
                                        )}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="px-0 pb-2">
                                    {/* Column headers */}
                                    <div className="grid grid-cols-[52px_1fr_1fr] gap-1.5 px-4 py-2 bg-slate-50 border-y border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                        <div>Day</div>
                                        <div>Time In</div>
                                        <div>Time Out</div>
                                    </div>

                                    <div className="divide-y divide-slate-50">
                                        {timeEntries.map((entry, index) => {
                                            const isWeekend = entry.dayOfWeek === 'Sat' || entry.dayOfWeek === 'Sun'

                                            return (
                                                <div
                                                    key={entry.date}
                                                    className={`
                                                        grid grid-cols-[52px_1fr_1fr] gap-1.5 px-4 py-2 items-center
                                                        transition-all duration-200
                                                        ${entry.isModified ? 'bg-indigo-50/60 border-l-[3px] border-l-indigo-500' : 'border-l-[3px] border-l-transparent'}
                                                        ${entry.isRestDay ? 'bg-red-50/40' : ''}
                                                        ${entry.isHoliday ? 'bg-amber-50/40' : ''}
                                                    `}
                                                >
                                                    {/* Day info */}
                                                    <div className="min-w-0">
                                                        <div className={`text-sm font-bold ${entry.isRestDay ? 'text-red-500' : 'text-slate-700'}`}>
                                                            {entry.dayNumber.toString().padStart(2, '0')}
                                                        </div>
                                                        <div className={`text-[10px] leading-tight ${entry.isRestDay ? 'text-red-400' : 'text-slate-400'}`}>
                                                            {entry.dayOfWeek}
                                                        </div>
                                                        {entry.shiftType && entry.shiftType !== 'work' && (
                                                            <div className="text-[9px] leading-tight text-indigo-500 font-medium truncate">
                                                                {formatShiftType(entry.shiftType)}
                                                            </div>
                                                        )}
                                                        {entry.isHoliday && (
                                                            <div className="text-[9px] leading-tight text-amber-600 font-medium truncate">
                                                                {entry.eventTitle || 'Holiday'}
                                                            </div>
                                                        )}
                                                        {entry.isRestDay && !entry.isHoliday && (
                                                            <div className="text-[9px] leading-tight text-red-400 font-medium">
                                                                Rest
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Time In */}
                                                    <Input
                                                        type="time"
                                                        value={entry.checkIn}
                                                        onChange={(e) => handleTimeChange(index, 'checkIn', e.target.value)}
                                                        className={`h-9 text-sm font-mono ${entry.isModified && entry.checkIn !== entry.originalCheckIn ? 'border-indigo-300 bg-indigo-50/50 ring-1 ring-indigo-200' : ''}`}
                                                    />

                                                    {/* Time Out */}
                                                    <Input
                                                        type="time"
                                                        value={entry.checkOut}
                                                        onChange={(e) => handleTimeChange(index, 'checkOut', e.target.value)}
                                                        className={`h-9 text-sm font-mono ${entry.isModified && entry.checkOut !== entry.originalCheckOut ? 'border-indigo-300 bg-indigo-50/50 ring-1 ring-indigo-200' : ''}`}
                                                    />
                                                </div>
                                            )
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Monthly Admin Memo */}
                        {!loadingReport && selectedEmployeeId && (
                            <Card className="border-slate-200/80 shadow-sm">
                                <CardHeader className="pb-2 pt-4 px-4">
                                    <CardTitle className="text-sm font-bold text-slate-700">
                                        Monthly Admin Memo
                                        <span className="text-slate-400 font-normal ml-1.5 text-xs">({monthName})</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 px-4 pb-4">
                                    {/* Add memo input */}
                                    <div className="flex gap-2">
                                        <Input
                                            value={newMemoText}
                                            onChange={(e) => setNewMemoText(e.target.value)}
                                            placeholder={`Add a memo for ${monthName}...`}
                                            className="flex-1 h-10"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault()
                                                    handleAddMemo()
                                                }
                                            }}
                                        />
                                        <Button
                                            onClick={handleAddMemo}
                                            disabled={savingMemo || !newMemoText.trim()}
                                            size="sm"
                                            className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700"
                                        >
                                            {savingMemo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                            <span className="ml-1.5">Add</span>
                                        </Button>
                                    </div>

                                    {/* Saved memos list */}
                                    {memoList.length > 0 ? (
                                        <div className="space-y-2 max-h-[250px] overflow-y-auto">
                                            {memoList.map((memo) => (
                                                <div
                                                    key={memo.id}
                                                    className="flex items-start gap-2 p-3 bg-slate-50/80 rounded-lg border border-slate-200/60 group"
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm whitespace-pre-wrap break-words text-slate-700">{memo.memo_text}</p>
                                                        <p className="text-[10px] text-slate-400 mt-1">
                                                            {new Date(memo.created_at).toLocaleDateString('en-US', {
                                                                month: 'short', day: 'numeric'
                                                            })} · {new Date(memo.created_at).toLocaleTimeString([], {
                                                                hour: '2-digit', minute: '2-digit', hour12: true
                                                            })}
                                                        </p>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 shrink-0 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                                        onClick={() => handleDeleteMemo(memo.id)}
                                                        disabled={deletingMemoId === memo.id}
                                                    >
                                                        {deletingMemoId === memo.id ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        )}
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-400 text-center py-4 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                                            No memos for {monthName} yet.
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </>
                )}

                {/* Empty state when no employee selected */}
                {!selectedEmployeeId && !loadingEmployees && (
                    <div className="text-center py-16">
                        <div className="bg-slate-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Users className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="text-base font-semibold text-slate-600 mb-1">Select an Employee</h3>
                        <p className="text-sm text-slate-400 max-w-xs mx-auto">
                            Choose an employee from the dropdown above to start bulk editing their monthly attendance.
                        </p>
                    </div>
                )}
            </div>

            {/* Sticky Bottom Save Bar */}
            {modifiedEntries.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
                    <div className="max-w-2xl mx-auto px-4 py-3">
                        {saveResult && (
                            <div className={`flex items-center gap-2 text-xs mb-2 ${saveResult.failed > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                {saveResult.failed > 0 ? (
                                    <AlertCircle className="h-3.5 w-3.5" />
                                ) : (
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                )}
                                <span>
                                    {saveResult.success} saved successfully
                                    {saveResult.failed > 0 && `, ${saveResult.failed} failed`}
                                </span>
                            </div>
                        )}
                        <Button
                            onClick={handleBulkSave}
                            disabled={saving}
                            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-200/50"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-5 w-5 mr-2" />
                                    Save {modifiedEntries.length} {modifiedEntries.length === 1 ? 'Entry' : 'Entries'}
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
