'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { MasterListShiftData, ShiftType } from '@/app/admin/masterlist/actions'
import { getLocations, Location } from '@/app/admin/settings/actions'

type ShiftEditDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    personName: string
    date: Date
    currentShift?: MasterListShiftData | null
    onSave: (data: MasterListShiftData) => Promise<void>
}

export function ShiftEditDialog({
    open,
    onOpenChange,
    personName,
    date,
    currentShift,
    onSave
}: ShiftEditDialogProps) {
    const [loading, setLoading] = useState(false)
    const [shiftType, setShiftType] = useState<ShiftType>('work')
    const [startTime, setStartTime] = useState('')
    const [endTime, setEndTime] = useState('')
    const [location, setLocation] = useState('')
    const [memo, setMemo] = useState('')
    const [paidLeaveHours, setPaidLeaveHours] = useState<number>(8)
    const [locations, setLocations] = useState<Location[]>([])
    const [fixHalf, setFixHalf] = useState(true)

    // Load locations on mount
    useEffect(() => {
        const loadLocations = async () => {
            const result = await getLocations()
            if (result.success && result.data) {
                setLocations(result.data)
            }
        }
        loadLocations()
    }, [])

    useEffect(() => {
        if (open) {
            if (currentShift) {
                setShiftType(currentShift.shift_type)
                setStartTime(currentShift.start_time || '')
                setEndTime(currentShift.end_time || '')
                setLocation(currentShift.location || '')
                setMemo(currentShift.memo || '')
                setMemo(currentShift.memo || '')
                setPaidLeaveHours(currentShift.paid_leave_hours || 8)
                if (currentShift.shift_type === 'half_paid_leave') {
                    setFixHalf(!currentShift.start_time && !currentShift.end_time)
                } else {
                    setFixHalf(true)
                }
            } else {
                // Default values for new shift
                setShiftType('work')
                setStartTime('09:00')
                setEndTime('18:00')
                setLocation('academy') // Set default to academy
                setMemo('')
                setPaidLeaveHours(8)
                setFixHalf(true)
            }
        }
    }, [open, currentShift])

    const handleSave = async () => {
        setLoading(true)
        try {
            const dateStr = date.toISOString().split('T')[0]
            await onSave({
                date: dateStr,
                shift_type: shiftType,
                start_time: (shiftType === 'work' || shiftType === 'flex' || shiftType === 'business_trip' || (shiftType === 'half_paid_leave' && !fixHalf)) ? startTime : undefined,
                end_time: (shiftType === 'work' || shiftType === 'flex' || shiftType === 'business_trip' || (shiftType === 'half_paid_leave' && !fixHalf)) ? endTime : undefined,
                location: (shiftType === 'work' || shiftType === 'flex' || shiftType === 'business_trip' || (shiftType === 'half_paid_leave' && !fixHalf)) ? location : undefined,
                paid_leave_hours: shiftType === 'paid_leave' ? paidLeaveHours : undefined,
                memo: memo
            })
            onOpenChange(false)
        } catch (error) {
            console.error('Failed to save shift', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Shift - {personName}</DialogTitle>
                    <div className="text-sm text-muted-foreground">
                        {date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="shift-type" className="text-right">
                            Status
                        </Label>
                        <Select value={shiftType} onValueChange={(v) => setShiftType(v as ShiftType)}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select status" />
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

                    {shiftType === 'half_paid_leave' && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="fix-half" className="text-right">
                                Fix Half (4h)
                            </Label>
                            <div className="col-span-3 flex items-center">
                                <Switch
                                    id="fix-half"
                                    checked={fixHalf}
                                    onCheckedChange={setFixHalf}
                                />
                            </div>
                        </div>
                    )}

                    {(shiftType === 'work' || shiftType === 'flex' || shiftType === 'business_trip' || (shiftType === 'half_paid_leave' && !fixHalf)) && (
                        <>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="start-time" className="text-right">
                                    Start
                                </Label>
                                <Input
                                    id="start-time"
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="end-time" className="text-right">
                                    End
                                </Label>
                                <Input
                                    id="end-time"
                                    type="time"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="location" className="text-right">
                                    Location
                                </Label>
                                <Select
                                    value={location}
                                    onValueChange={(value) => {
                                        if (value === '__add_new__') {
                                            // Open settings in new tab
                                            window.open('/admin/settings/locations', '_blank')
                                        } else {
                                            setLocation(value)
                                        }
                                    }}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select location" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {locations.map((loc) => (
                                            <SelectItem key={loc.id} value={loc.name}>
                                                {loc.name}
                                            </SelectItem>
                                        ))}
                                        <SelectItem value="__add_new__" className="text-primary font-medium">
                                            + Add Location
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </>
                    )}

                    {shiftType === 'paid_leave' && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="paid-leave-hours" className="text-right">
                                Hours
                            </Label>
                            <Input
                                id="paid-leave-hours"
                                type="number"
                                min="1"
                                max="12"
                                step="0.5"
                                value={paidLeaveHours}
                                onChange={(e) => setPaidLeaveHours(parseFloat(e.target.value) || 8)}
                                className="col-span-3"
                                placeholder="8"
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="memo" className="text-right">
                            Memo
                        </Label>
                        <Input
                            id="memo"
                            value={memo}
                            onChange={(e) => setMemo(e.target.value)}
                            className="col-span-3"
                            placeholder="Optional note"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={loading}>
                        {loading ? 'Saving...' : 'Save changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
