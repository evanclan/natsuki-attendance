'use client'

import { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from 'lucide-react'
import { upsertAttendanceRecord } from '@/app/admin/attendance-actions/actions'
import { formatLocalDate } from '@/lib/utils'

type AttendanceRecord = {
    id: number
    person_id: string
    date: string
    check_in_at: string | null
    check_out_at: string | null
    status: string
    admin_note: string | null
}

type AttendanceEditDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    employeeName: string
    employeeId: string
    date: Date
    currentAttendance: AttendanceRecord | null
    onSave: () => void
}

export function AttendanceEditDialog({
    open,
    onOpenChange,
    employeeName,
    employeeId,
    date,
    currentAttendance,
    onSave
}: AttendanceEditDialogProps) {
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Helper to extract HH:MM from ISO string for input
    const getInputValue = (isoString: string | null) => {
        if (!isoString) return ''
        const date = new Date(isoString)
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    }

    const [checkIn, setCheckIn] = useState(getInputValue(currentAttendance?.check_in_at || null))
    const [checkOut, setCheckOut] = useState(getInputValue(currentAttendance?.check_out_at || null))
    const [status, setStatus] = useState(currentAttendance?.status || 'present')
    const [adminNote, setAdminNote] = useState(currentAttendance?.admin_note || '')

    const handleSave = async () => {
        setSaving(true)
        setError(null)

        // Construct ISO strings for the backend
        const constructDateTime = (timeStr: string) => {
            if (!timeStr) return null
            const [hours, minutes] = timeStr.split(':').map(Number)
            const dateObj = new Date(date)
            dateObj.setHours(hours, minutes, 0, 0)
            return dateObj.toISOString()
        }

        const dateStr = formatLocalDate(date)

        const result = await upsertAttendanceRecord(employeeId, dateStr, {
            check_in_at: constructDateTime(checkIn),
            check_out_at: constructDateTime(checkOut),
            status: status,
            admin_note: adminNote || undefined
        })

        if (result.success) {
            onSave()
            onOpenChange(false)
        } else {
            setError(result.error || 'Failed to save attendance')
        }

        setSaving(false)
    }

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Edit Raw Attendance</DialogTitle>
                    <DialogDescription>
                        {employeeName} - {formatDate(date)}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="checkIn">Check In Time</Label>
                            <Input
                                id="checkIn"
                                type="time"
                                value={checkIn}
                                onChange={(e) => setCheckIn(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="checkOut">Check Out Time</Label>
                            <Input
                                id="checkOut"
                                type="time"
                                value={checkOut}
                                onChange={(e) => setCheckOut(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger id="status">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="present">Present</SelectItem>
                                <SelectItem value="absent">Absent</SelectItem>
                                <SelectItem value="late">Late</SelectItem>
                                <SelectItem value="half_day">Half Day</SelectItem>
                                <SelectItem value="off">Off</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="adminNote">Admin Note (Optional)</Label>
                        <Textarea
                            id="adminNote"
                            placeholder="Reason for edit..."
                            value={adminNote}
                            onChange={(e) => setAdminNote(e.target.value)}
                            rows={3}
                        />
                    </div>

                    {error && (
                        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                            {error}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={saving}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
