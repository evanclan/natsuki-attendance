'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { createSystemEvent, updateSystemEvent, deleteSystemEvent, SystemEvent } from '@/app/admin/settings/actions'

type SystemEventDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    selectedDate: Date | null
    existingEvent: SystemEvent | null
    onEventSaved: () => void
}

export function SystemEventDialog({
    open,
    onOpenChange,
    selectedDate,
    existingEvent,
    onEventSaved
}: SystemEventDialogProps) {
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [eventType, setEventType] = useState<'holiday' | 'event' | 'other' | 'work_day' | 'rest_day'>('event')
    const [isHoliday, setIsHoliday] = useState(false)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (existingEvent) {
            setTitle(existingEvent.title)
            setDescription(existingEvent.description || '')
            setEventType(existingEvent.event_type)
            setIsHoliday(existingEvent.is_holiday)
        } else {
            setTitle('')
            setDescription('')
            setEventType('event')
            setIsHoliday(false)
        }
    }, [existingEvent, open])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedDate) return

        setLoading(true)
        const dateStr = selectedDate.toISOString().split('T')[0]

        const eventData = {
            title,
            description,
            event_date: dateStr,
            event_type: eventType,
            is_holiday: isHoliday
        }

        let result
        if (existingEvent) {
            result = await updateSystemEvent(existingEvent.id, eventData)
        } else {
            result = await createSystemEvent(eventData)
        }

        setLoading(false)

        if (result.success) {
            onEventSaved()
            onOpenChange(false)
        } else {
            alert('Failed to save event: ' + result.error)
        }
    }

    const handleDelete = async () => {
        if (!existingEvent || !confirm('Are you sure you want to delete this event?')) return

        setLoading(true)
        const result = await deleteSystemEvent(existingEvent.id)
        setLoading(false)

        if (result.success) {
            onEventSaved()
            onOpenChange(false)
        } else {
            alert('Failed to delete event: ' + result.error)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{existingEvent ? 'Edit Event' : 'Add Event'}</DialogTitle>
                    <DialogDescription>
                        {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="type">Type</Label>
                        <Select value={eventType} onValueChange={(val: any) => setEventType(val)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="event">Event (Blue)</SelectItem>
                                <SelectItem value="holiday">Holiday (Red)</SelectItem>
                                <SelectItem value="rest_day">Rest Day (Red)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                    <DialogFooter className="flex justify-between sm:justify-between">
                        {existingEvent && (
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={handleDelete}
                                disabled={loading}
                            >
                                Delete
                            </Button>
                        )}
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Saving...' : 'Save'}
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
