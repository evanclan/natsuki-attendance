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
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { createSystemEvent, updateSystemEvent, deleteSystemEvent, SystemEvent, EventType } from '@/app/admin/settings/actions'
import { formatLocalDate } from '@/lib/utils'

type SystemEventDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    selectedDate: Date | null
    existingEvent: SystemEvent | null
    onEventSaved: () => void
    eventTypes: EventType[]
}

export function SystemEventDialog({
    open,
    onOpenChange,
    selectedDate,
    existingEvent,
    onEventSaved,
    eventTypes
}: SystemEventDialogProps) {
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [eventType, setEventType] = useState<string>('event')
    const [isHoliday, setIsHoliday] = useState(false)
    const [loading, setLoading] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

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
        const dateStr = formatLocalDate(selectedDate)

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
        if (!existingEvent) return

        setLoading(true)
        const result = await deleteSystemEvent(existingEvent.id)
        setLoading(false)
        setShowDeleteConfirm(false)

        if (result.success) {
            onEventSaved()
            onOpenChange(false)
        } else {
            alert('Failed to delete event: ' + result.error)
        }
    }

    return (
        <>
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
                            <Select value={eventType} onValueChange={(val: string) => setEventType(val)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {eventTypes.map(type => (
                                        <SelectItem key={type.slug} value={type.slug}>
                                            <span className="flex items-center gap-2">
                                                <span className={`inline-block w-2.5 h-2.5 rounded-full ${type.color === 'red' ? 'bg-red-500' :
                                                    type.color === 'green' ? 'bg-green-500' :
                                                        type.color === 'purple' ? 'bg-purple-500' :
                                                            type.color === 'orange' ? 'bg-orange-500' :
                                                                type.color === 'yellow' ? 'bg-yellow-500' :
                                                                    'bg-blue-500'
                                                    }`} />
                                                {type.name}
                                            </span>
                                        </SelectItem>
                                    ))}
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
                                    onClick={() => setShowDeleteConfirm(true)}
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

            {/* Delete Event Confirmation */}
            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Event</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this event? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={loading}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {loading ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
