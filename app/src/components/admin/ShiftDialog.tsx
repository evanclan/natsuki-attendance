'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createShift, updateShift, deleteShift, type ShiftData } from '@/app/admin/shift-actions/actions'
import { formatLocalDate } from '@/lib/utils'

type Shift = {
    id: number
    person_id: string
    date: string
    shift_type?: string
    shift_name?: string | null
    start_time?: string | null
    end_time?: string | null
    location?: string | null
    memo?: string | null
    created_by?: string | null
    updated_by?: string | null
    created_at: string
    updated_at: string
}

type ShiftDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    personId: string
    selectedDate: Date | null
    existingShift?: Shift | null
    onShiftSaved: () => void
    readOnly?: boolean
}

export function ShiftDialog({
    open,
    onOpenChange,
    personId,
    selectedDate,
    existingShift,
    onShiftSaved,
    readOnly = false,
}: ShiftDialogProps) {
    const [loading, setLoading] = useState(false)
    const [shiftType, setShiftType] = useState('work')
    const [shiftName, setShiftName] = useState('')
    const [startTime, setStartTime] = useState('')
    const [endTime, setEndTime] = useState('')
    const [location, setLocation] = useState('')
    const [memo, setMemo] = useState('')
    const [fixHalf, setFixHalf] = useState(true)

    // Reset form when dialog opens or existing shift changes
    useEffect(() => {
        if (open) {
            if (existingShift) {
                setShiftType(existingShift.shift_type || 'work')
                setShiftName(existingShift.shift_name || '')
                setStartTime(existingShift.start_time || '')
                setEndTime(existingShift.end_time || '')
                setLocation(existingShift.location || '')
                setMemo(existingShift.memo || '')
                // If half_paid_leave and has times, it's not fixed. Otherwise default to fixed.
                if (existingShift.shift_type === 'half_paid_leave') {
                    setFixHalf(!existingShift.start_time && !existingShift.end_time)
                } else {
                    setFixHalf(true)
                }
            } else {
                setShiftType('work')
                setShiftName('')
                setStartTime('')
                setEndTime('')
                setLocation('')
                setMemo('')
                setFixHalf(true)
            }
        }
    }, [open, existingShift])

    const formatDateForDisplay = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })
    }

    const formatDateForDB = (date: Date) => {
        return formatLocalDate(date)
    }

    const handleSave = async () => {
        if (!selectedDate) return

        // Validate required fields
        if (!memo.trim()) {
            alert('Memo is required')
            return
        }

        setLoading(true)

        const shiftData: ShiftData = {
            date: formatDateForDB(selectedDate),
            shift_type: shiftType,
            shift_name: shiftName || undefined,
            start_time: (shiftType === 'work' || shiftType === 'flex' || shiftType === 'business_trip' || (shiftType === 'half_paid_leave' && !fixHalf)) ? (startTime || undefined) : undefined,
            end_time: (shiftType === 'work' || shiftType === 'flex' || shiftType === 'business_trip' || (shiftType === 'half_paid_leave' && !fixHalf)) ? (endTime || undefined) : undefined,
            location: (shiftType === 'work' || shiftType === 'flex' || shiftType === 'business_trip') ? (location || undefined) : undefined,
            memo: memo,
        }

        let result
        if (existingShift) {
            result = await updateShift(existingShift.id, shiftData)
        } else {
            result = await createShift(personId, shiftData)
        }

        setLoading(false)

        if (result.success) {
            onShiftSaved()
            onOpenChange(false)
        } else {
            console.error('Failed to save shift:', result.error)
            alert(result.error || 'Failed to save shift')
        }
    }

    const handleDelete = async () => {
        if (!existingShift) return

        if (!confirm('Are you sure you want to delete this shift assignment?')) {
            return
        }

        setLoading(true)
        const result = await deleteShift(existingShift.id)
        setLoading(false)

        if (result.success) {
            onShiftSaved()
            onOpenChange(false)
        } else {
            alert(result.error || 'Failed to delete shift')
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {readOnly ? 'View' : (existingShift ? 'Edit' : 'Add')} Shift Assignment
                    </DialogTitle>
                    <DialogDescription>
                        {selectedDate && formatDateForDisplay(selectedDate)}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="shift-type">Shift Type</Label>
                        <Select value={shiftType} onValueChange={setShiftType} disabled={readOnly}>
                            <SelectTrigger id="shift-type">
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="work">Work</SelectItem>
                                <SelectItem value="flex">Flex</SelectItem>
                                <SelectItem value="paid_leave">Paid Leave</SelectItem>
                                <SelectItem value="half_paid_leave">Half Paid Leave</SelectItem>
                                <SelectItem value="special_leave">Special Leave</SelectItem>
                                <SelectItem value="business_trip">Business Trip</SelectItem>
                                <SelectItem value="rest">Rest</SelectItem>
                                <SelectItem value="absent">Absent</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="shift-name">Shift Name (Optional)</Label>
                        <Input
                            id="shift-name"
                            value={shiftName}
                            onChange={(e) => setShiftName(e.target.value)}
                            placeholder="e.g., Morning Shift, Branch Assignment"
                            disabled={readOnly}
                        />
                    </div>

                    {shiftType === 'half_paid_leave' && (
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="fix-half"
                                checked={fixHalf}
                                onCheckedChange={setFixHalf}
                                disabled={readOnly}
                            />
                            <Label htmlFor="fix-half">Fix Half (4h)</Label>
                        </div>
                    )}

                    {(shiftType === 'work' || shiftType === 'flex' || shiftType === 'business_trip' || (shiftType === 'half_paid_leave' && !fixHalf)) && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="start-time">Start Time (Optional)</Label>
                                    <Input
                                        id="start-time"
                                        type="time"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        disabled={readOnly}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="end-time">End Time (Optional)</Label>
                                    <Input
                                        id="end-time"
                                        type="time"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        disabled={readOnly}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="location">Location (Optional)</Label>
                                <Input
                                    id="location"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    placeholder="e.g., North Branch, Headquarters"
                                    disabled={readOnly}
                                />
                            </div>
                        </>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="memo">Task/Memo *</Label>
                        <Textarea
                            id="memo"
                            value={memo}
                            onChange={(e) => setMemo(e.target.value)}
                            placeholder="Describe the task or assignment for this date..."
                            rows={4}
                            required={!readOnly}
                            disabled={readOnly}
                        />
                    </div>
                </div>

                <DialogFooter className="sm:justify-between">
                    {!readOnly && existingShift && (
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={loading}
                        >
                            Delete
                        </Button>
                    )}
                    <div className="flex gap-2 sm:ml-auto">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                        >
                            {readOnly ? 'Close' : 'Cancel'}
                        </Button>
                        {!readOnly && (
                            <Button
                                type="button"
                                onClick={handleSave}
                                disabled={loading}
                            >
                                {loading ? 'Saving...' : 'Save'}
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
