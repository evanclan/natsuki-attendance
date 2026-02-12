'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { MasterListShiftData, ShiftType } from '@/app/admin/masterlist/actions'
import { getLocations, Location } from '@/app/admin/settings/actions'
import { formatLocalDate } from '@/lib/utils'

type ShiftEditDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    personName: string
    date: Date
    currentShift?: MasterListShiftData | null
    onSave: (data: MasterListShiftData) => Promise<void>
    onDelete?: () => Promise<void>
    role?: 'employee' | 'student'
}

export function ShiftEditDialog({
    open,
    onOpenChange,
    personName,
    date,
    currentShift,
    onSave,
    onDelete,
    role = 'employee'
}: ShiftEditDialogProps) {
    const [loading, setLoading] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [shiftType, setShiftType] = useState<ShiftType>('work')
    const [startTime, setStartTime] = useState('')
    const [endTime, setEndTime] = useState('')
    const [location, setLocation] = useState('')
    const [memo, setMemo] = useState('')
    const [paidLeaveHours, setPaidLeaveHours] = useState<number>(8)
    const [locations, setLocations] = useState<Location[]>([])
    const [fixHalf, setFixHalf] = useState(true)
    const [color, setColor] = useState<string>('')
    const [forceBreak, setForceBreak] = useState(false)

    // Color history state
    const [colorHistory, setColorHistory] = useState<string[]>([])

    // Load color history on mount
    useEffect(() => {
        const savedHistory = localStorage.getItem('shift_color_history')
        if (savedHistory) {
            try {
                setColorHistory(JSON.parse(savedHistory))
            } catch (e) {
                console.error('Failed to parse color history', e)
            }
        } else {
            // Default initial colors if no history
            setColorHistory([
                '#FDE047', '#FDBA74', '#15803D', '#1D4ED8', '#86EFAC', '#FDA4AF'
            ])
        }
    }, [])

    const addToHistory = (newColor: string) => {
        if (!newColor) return

        const updatedHistory = [newColor, ...colorHistory.filter(c => c !== newColor)].slice(0, 12)
        setColorHistory(updatedHistory)
        localStorage.setItem('shift_color_history', JSON.stringify(updatedHistory))
    }

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
                setPaidLeaveHours(currentShift.paid_leave_hours ?? 8)
                setColor(currentShift.color || '')
                if (currentShift.shift_type === 'half_paid_leave') {
                    setFixHalf(!currentShift.start_time && !currentShift.end_time)
                } else {
                    setFixHalf(true)
                }
                setForceBreak(currentShift.force_break || false)
            } else {
                // Default values for new shift
                if (role === 'student') {
                    setShiftType('sick_absent')
                    setMemo('')
                    setColor('#FDBA74') // Default color for students? Or keep empty.
                } else {
                    setShiftType('work')
                    setStartTime('09:00')
                    setEndTime('18:00')
                    setLocation('academy') // Set default to academy
                    setMemo('')
                    setPaidLeaveHours(8)
                    setFixHalf(true)
                    setColor('')
                    setForceBreak(false)
                }
            }
        }
    }, [open, currentShift, role])

    const handleSave = async () => {
        setLoading(true)
        try {
            const dateStr = formatLocalDate(date)
            await onSave({
                date: dateStr,
                shift_type: shiftType,
                start_time: (shiftType === 'work' || shiftType === 'work_no_break' || shiftType === 'flex' || shiftType === 'business_trip' || (shiftType === 'half_paid_leave' && !fixHalf)) ? startTime : undefined,
                end_time: (shiftType === 'work' || shiftType === 'work_no_break' || shiftType === 'flex' || shiftType === 'business_trip' || (shiftType === 'half_paid_leave' && !fixHalf)) ? endTime : undefined,
                location: (shiftType === 'work' || shiftType === 'work_no_break' || shiftType === 'business_trip' || (shiftType === 'half_paid_leave' && !fixHalf)) ? location : undefined,
                paid_leave_hours: (shiftType === 'paid_leave' || shiftType === 'flex') ? paidLeaveHours : undefined,
                memo: memo,
                color: (shiftType === 'work' || shiftType === 'work_no_break' || (role === 'student' && shiftType !== 'rest')) ? color : undefined,
                force_break: (shiftType === 'work') ? forceBreak : undefined
            })

            // Add to history if color is selected
            if ((shiftType === 'work' || shiftType === 'work_no_break' || role === 'student') && color) {
                addToHistory(color)
            }


            onOpenChange(false)
        } catch (error) {
            console.error('Failed to save shift', error)
        } finally {
            setLoading(false)
        }
    }

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setShowDeleteConfirm(true)
    }

    const handleConfirmDelete = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (!onDelete) return

        setIsDeleting(true)
        try {
            await onDelete()
            onOpenChange(false)
        } catch (error) {
            console.error('Failed to delete shift', error)
        } finally {
            setIsDeleting(false)
            setShowDeleteConfirm(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Shift - {personName}</DialogTitle>
                    <DialogDescription>
                        {date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="shift-type" className="text-right">
                            Status
                        </Label>
                        <Select
                            value={shiftType}
                            onValueChange={(v) => {
                                const newType = v as ShiftType
                                setShiftType(newType)
                                if (newType === 'half_paid_leave') {
                                    setFixHalf(false)
                                } else {
                                    setFixHalf(true)
                                }
                            }}
                        >
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                {role === 'student' ? (
                                    <>

                                        <SelectItem value="user_note">Memo</SelectItem>
                                        <SelectItem value="rest">Rest</SelectItem>
                                        <SelectItem value="sick_absent">Sick Absent</SelectItem>
                                        <SelectItem value="planned_absent">Planned Absent</SelectItem>
                                        <SelectItem value="family_reason">Family Matters</SelectItem>
                                        <SelectItem value="other_reason">Other Reason</SelectItem>
                                    </>
                                ) : (
                                    <>
                                        <SelectItem value="work">Work</SelectItem>
                                        <SelectItem value="work_no_break">Work no break</SelectItem>
                                        <SelectItem value="flex">Flex</SelectItem>

                                        <SelectItem value="paid_leave">Paid Leave</SelectItem>
                                        <SelectItem value="half_paid_leave">Half Paid Leave</SelectItem>
                                        <SelectItem value="special_leave">Special Leave</SelectItem>
                                        <SelectItem value="business_trip">Business Trip</SelectItem>
                                        <SelectItem value="rest">Rest</SelectItem>
                                        <SelectItem value="preferred_rest">Preferred Rest</SelectItem>
                                        <SelectItem value="absent">Absent</SelectItem>
                                    </>
                                )}
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



                    {/* Student inputs or standard employee inputs */}
                    {role === 'employee' && (shiftType === 'work' || shiftType === 'work_no_break' || shiftType === 'business_trip' || (shiftType === 'half_paid_leave' && !fixHalf)) && (

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

                            {shiftType === 'work' && (
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="force-break" className="text-right">
                                        Break Taken (-1h)
                                    </Label>
                                    <div className="col-span-3 flex items-center">
                                        <Switch
                                            id="force-break"
                                            checked={forceBreak}
                                            onCheckedChange={setForceBreak}
                                        />
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {(shiftType === 'paid_leave' || shiftType === 'flex') && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="paid-leave-hours" className="text-right">
                                {shiftType === 'flex' ? 'Expected Hours' : 'Hours'}
                            </Label>
                            <Input
                                id="paid-leave-hours"
                                type="number"
                                min="0"
                                max="24"
                                step="0.5"
                                value={paidLeaveHours}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value)
                                    setPaidLeaveHours(isNaN(val) ? 0 : val)
                                }}
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

                    {(shiftType === 'work' || shiftType === 'work_no_break' || role === 'student') && (

                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label className="text-right pt-2">
                                Color
                            </Label>
                            <div className="col-span-3 space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="relative flex items-center gap-2">
                                        <Input
                                            type="color"
                                            value={color || '#ffffff'}
                                            onChange={(e) => setColor(e.target.value)}
                                            className="w-12 h-12 p-1 rounded-md cursor-pointer"
                                        />
                                        <div className="flex flex-col gap-1">
                                            <Label htmlFor="hex-color" className="text-xs text-muted-foreground">HEX Code</Label>
                                            <Input
                                                id="hex-color"
                                                type="text"
                                                value={color || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value
                                                    // Allow typing, but only update if it looks like it could be a hex
                                                    // or if we want to allow partial updates we might need a separate state for the input text.
                                                    // For simplicity, let's just set it. The color input might complain if invalid,
                                                    // so let's maybe be a bit smarter or just direct bind.
                                                    // Direct bind is usually fine, but let's check validation.
                                                    setColor(val)
                                                }}
                                                placeholder="#000000"
                                                className="w-28 font-mono uppercase"
                                                maxLength={7}
                                            />
                                        </div>
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        Pick a custom color
                                    </div>
                                </div>

                                {colorHistory.length > 0 && (
                                    <div className="space-y-1">
                                        <div className="text-xs text-muted-foreground">Recent Colors:</div>
                                        <div className="flex flex-wrap gap-2">
                                            {colorHistory.map((c, i) => (
                                                <button
                                                    key={`${c}-${i}`}
                                                    type="button"
                                                    className={`w-6 h-6 rounded-full border-2 transition-all ${color === c ? 'border-black scale-110' : 'border-transparent hover:scale-110'}`}
                                                    style={{ backgroundColor: c }}
                                                    onClick={() => setColor(c)}
                                                    title={c}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <DialogFooter className="sm:justify-between">
                    {currentShift && onDelete ? (
                        showDeleteConfirm ? (
                            <div className="flex gap-2 items-center">
                                <span className="text-xs text-muted-foreground hidden sm:inline">Are you sure?</span>
                                <Button
                                    variant="destructive"
                                    onClick={handleConfirmDelete}
                                    disabled={loading || isDeleting}
                                    type="button"
                                    size="sm"
                                >
                                    {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setShowDeleteConfirm(false);
                                    }}
                                    disabled={loading || isDeleting}
                                    type="button"
                                    size="sm"
                                >
                                    Cancel
                                </Button>
                            </div>
                        ) : (
                            <Button
                                variant="destructive"
                                onClick={handleDeleteClick}
                                disabled={loading || isDeleting}
                                type="button"
                            >
                                Delete
                            </Button>
                        )
                    ) : (
                        <div /> /* Spacer */
                    )}
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={loading || isDeleting}>
                            {loading ? 'Saving...' : 'Save changes'}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
