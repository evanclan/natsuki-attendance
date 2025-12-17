'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { MasterListShiftData, ShiftType, upsertShift } from '@/app/admin/masterlist/actions'
import { getLocations, Location } from '@/app/admin/settings/actions'
import { useRouter } from 'next/navigation'

type MonthlyStatusDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    personId: string
    personName: string
    year: number
    month: number
}

export function MonthlyStatusDialog({
    open,
    onOpenChange,
    personId,
    personName,
    year,
    month
}: MonthlyStatusDialogProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [shiftType, setShiftType] = useState<ShiftType>('flex')
    const [startTime, setStartTime] = useState('09:00')
    const [endTime, setEndTime] = useState('18:00')
    const [location, setLocation] = useState('academy')
    const [memo, setMemo] = useState('')
    const [paidLeaveHours, setPaidLeaveHours] = useState<number>(8)
    const [locations, setLocations] = useState<Location[]>([])
    const [fixHalf, setFixHalf] = useState(true)
    const [color, setColor] = useState<string>('')
    const [forceBreak, setForceBreak] = useState(false)
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
            setColorHistory([
                '#FDE047', '#FDBA74', '#15803D', '#1D4ED8', '#86EFAC', '#FDA4AF'
            ])
        }
    }, [])

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

    // Reset to defaults when dialog opens
    useEffect(() => {
        if (open) {
            setShiftType('flex')
            setStartTime('09:00')
            setEndTime('18:00')
            setLocation('academy')
            setMemo('')
            setPaidLeaveHours(8)
            setFixHalf(true)
            setColor('')
            setForceBreak(false)
        }
    }, [open])

    const addToHistory = (newColor: string) => {
        if (!newColor) return
        const updatedHistory = [newColor, ...colorHistory.filter(c => c !== newColor)].slice(0, 6)
        setColorHistory(updatedHistory)
        localStorage.setItem('shift_color_history', JSON.stringify(updatedHistory))
    }

    const handleSave = async () => {
        setLoading(true)
        try {
            // Get all weekdays (Mon-Fri) in the month
            const daysInMonth = new Date(year, month + 1, 0).getDate()
            const weekdays: Date[] = []

            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(year, month, day)
                const dayOfWeek = date.getDay()
                // Monday = 1, Tuesday = 2, ... Friday = 5
                // Skip Saturday (6) and Sunday (0)
                if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                    weekdays.push(date)
                }
            }

            let successCount = 0
            let failCount = 0

            for (const date of weekdays) {
                const dateStr = date.toISOString().split('T')[0]
                const shiftData: MasterListShiftData = {
                    date: dateStr,
                    shift_type: shiftType,
                    start_time: (shiftType === 'work' || shiftType === 'flex' || shiftType === 'business_trip' || (shiftType === 'half_paid_leave' && !fixHalf)) ? startTime : undefined,
                    end_time: (shiftType === 'work' || shiftType === 'flex' || shiftType === 'business_trip' || (shiftType === 'half_paid_leave' && !fixHalf)) ? endTime : undefined,
                    location: (shiftType === 'work' || shiftType === 'business_trip' || (shiftType === 'half_paid_leave' && !fixHalf)) ? location : undefined,
                    paid_leave_hours: (shiftType === 'paid_leave' || shiftType === 'flex') ? paidLeaveHours : undefined,
                    memo: memo,
                    color: shiftType === 'work' ? color : undefined,
                    force_break: shiftType === 'work' ? forceBreak : undefined
                }

                const result = await upsertShift(personId, shiftData)
                if (result.success) successCount++
                else failCount++
            }

            // Add to history if color is selected
            if (shiftType === 'work' && color) {
                addToHistory(color)
            }

            if (failCount > 0) {
                alert(`Applied to ${successCount} weekdays. Failed for ${failCount} days.`)
            }

            router.refresh()
            onOpenChange(false)
        } catch (error) {
            console.error('Failed to apply monthly status', error)
            alert('Failed to apply monthly status')
        } finally {
            setLoading(false)
        }
    }

    const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Monthly Status - {personName}</DialogTitle>
                    <div className="text-sm text-muted-foreground">
                        Apply status to all weekdays (Mon-Fri) in {monthName}
                    </div>
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
                                <SelectItem value="work">Work</SelectItem>
                                <SelectItem value="flex">Flex</SelectItem>
                                <SelectItem value="paid_leave">Paid Leave</SelectItem>
                                <SelectItem value="half_paid_leave">Half Paid Leave</SelectItem>
                                <SelectItem value="special_leave">Special Leave</SelectItem>
                                <SelectItem value="business_trip">Business Trip</SelectItem>
                                <SelectItem value="rest">Rest</SelectItem>
                                <SelectItem value="preferred_rest">Preferred Rest</SelectItem>
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

                    {(shiftType === 'work' || shiftType === 'business_trip' || (shiftType === 'half_paid_leave' && !fixHalf)) && (
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
                                min="1"
                                max="24"
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

                    {shiftType === 'work' && (
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
                                                onChange={(e) => setColor(e.target.value)}
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
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={loading}>
                        {loading ? 'Applying...' : 'Apply to All Weekdays'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
