'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Trash2, Pencil, Loader2, Info } from 'lucide-react'
import { getStatusHistory, addStatusPeriod, updateStatusPeriod, deleteStatusPeriod, type StatusPeriod } from '@/actions/status_history'
import { toast } from 'sonner'

interface StatusHistoryManagerProps {
    personId: string
    currentStatus: string
}

export function StatusHistoryManager({ personId, currentStatus }: StatusHistoryManagerProps) {
    const [history, setHistory] = useState<StatusPeriod[]>([])
    const [loading, setLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [saving, setSaving] = useState(false)

    // Edit mode
    const [editingPeriod, setEditingPeriod] = useState<StatusPeriod | null>(null)

    // Delete confirmation
    const [deleteTarget, setDeleteTarget] = useState<StatusPeriod | null>(null)

    // Form state
    const [status, setStatus] = useState<'active' | 'inactive'>('active')
    const [validFrom, setValidFrom] = useState('')
    const [validUntil, setValidUntil] = useState('')
    const [note, setNote] = useState('')

    useEffect(() => {
        loadHistory()
    }, [personId])

    const loadHistory = async () => {
        setLoading(true)
        const result = await getStatusHistory(personId)
        if (result.success && result.data) {
            setHistory(result.data)
        }
        setLoading(false)
    }

    const openAddDialog = () => {
        setEditingPeriod(null)
        resetForm()
        setIsDialogOpen(true)
    }

    const openEditDialog = (period: StatusPeriod) => {
        setEditingPeriod(period)
        setStatus(period.status)
        setValidFrom(period.valid_from)
        setValidUntil(period.valid_until || '')
        setNote(period.note || '')
        setIsDialogOpen(true)
    }

    const handleSave = async () => {
        if (!validFrom) {
            toast.error("Start date is required")
            return
        }

        setSaving(true)

        if (editingPeriod) {
            // Update existing period
            const result = await updateStatusPeriod(editingPeriod.id, personId, {
                status,
                valid_from: validFrom,
                valid_until: validUntil || null,
                note: note || null
            })

            if (result.success) {
                toast.success("Status period updated")
                setIsDialogOpen(false)
                resetForm()
                loadHistory()
            } else {
                toast.error(result.error || "Failed to update period")
            }
        } else {
            // Add new period
            const result = await addStatusPeriod({
                person_id: personId,
                status,
                valid_from: validFrom,
                valid_until: validUntil || null,
                note: note || null
            })

            if (result.success) {
                toast.success("Status period added")
                setIsDialogOpen(false)
                resetForm()
                loadHistory()
            } else {
                toast.error(result.error || "Failed to add period")
            }
        }
        setSaving(false)
    }

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return

        const result = await deleteStatusPeriod(deleteTarget.id, personId)
        if (result.success) {
            toast.success("Period deleted")
            loadHistory()
        } else {
            toast.error(result.error || "Failed to delete period")
        }
        setDeleteTarget(null)
    }

    const resetForm = () => {
        setStatus('active')
        setValidFrom('')
        setValidUntil('')
        setNote('')
        setEditingPeriod(null)
    }

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'Present'
        return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }

    // Determine if a period is the "current" one covering today
    const isCurrentPeriod = (period: StatusPeriod) => {
        const today = new Date().toISOString().split('T')[0]
        return period.valid_from <= today && (period.valid_until === null || period.valid_until >= today)
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">
                    Status History
                </CardTitle>
                <Button size="sm" variant="outline" className="gap-1" onClick={openAddDialog}>
                    <Plus className="h-4 w-4" />
                    Add Period
                </Button>
            </CardHeader>
            <CardContent>
                {/* Info banner */}
                <div className="flex items-start gap-2 p-3 mb-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                    <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                        Status history determines when this person appears in the masterlist and all list tables.
                        If &quot;Until&quot; is set to a specific date, they will automatically become inactive after that date.
                        Leave &quot;Until&quot; empty for ongoing active status.
                    </p>
                </div>

                {loading ? (
                    <div className="text-center py-4 text-muted-foreground">Loading...</div>
                ) : history.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                        No history records found. The current status is used.
                    </div>
                ) : (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Status</TableHead>
                                    <TableHead>From</TableHead>
                                    <TableHead>Until</TableHead>
                                    <TableHead>Note</TableHead>
                                    <TableHead className="w-[80px]">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {history.map((period) => (
                                    <TableRow key={period.id} className={isCurrentPeriod(period) ? 'bg-green-50/50 dark:bg-green-950/20' : ''}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Badge variant={period.status === 'active' ? 'default' : 'secondary'}>
                                                    {period.status}
                                                </Badge>
                                                {isCurrentPeriod(period) && (
                                                    <Badge variant="outline" className="text-[10px] bg-green-100 text-green-700 border-green-300">
                                                        Current
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm">{formatDate(period.valid_from)}</TableCell>
                                        <TableCell className="text-sm">
                                            {period.valid_until ? (
                                                formatDate(period.valid_until)
                                            ) : (
                                                <span className="text-green-600 font-medium">Present</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm max-w-[150px] truncate">
                                            {period.note}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => openEditDialog(period)}
                                                    className="h-8 w-8 text-muted-foreground hover:text-blue-600"
                                                    title="Edit period"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setDeleteTarget(period)}
                                                    className="h-8 w-8 text-muted-foreground hover:text-red-600"
                                                    title="Delete period"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}

                {/* Add/Edit Dialog */}
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open)
                    if (!open) resetForm()
                }}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {editingPeriod ? 'Edit Status Period' : 'Add Status Period'}
                            </DialogTitle>
                            <DialogDescription>
                                {editingPeriod
                                    ? 'Update the date range and status for this period.'
                                    : 'Set a date range for when this person is active or inactive.'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="status" className="text-right">
                                    Status
                                </Label>
                                <Select
                                    value={status}
                                    onValueChange={(val: 'active' | 'inactive') => setStatus(val)}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="from" className="text-right">
                                    From
                                </Label>
                                <Input
                                    id="from"
                                    type="date"
                                    value={validFrom}
                                    onChange={(e) => setValidFrom(e.target.value)}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="until" className="text-right">
                                    Until
                                </Label>
                                <div className="col-span-3">
                                    <Input
                                        id="until"
                                        type="date"
                                        value={validUntil}
                                        onChange={(e) => setValidUntil(e.target.value)}
                                        placeholder="Leave empty for indefinite"
                                    />
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                        Leave empty for ongoing (&quot;Present&quot;). Set a date if you know when this person will leave.
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="note" className="text-right">
                                    Note
                                </Label>
                                <Input
                                    id="note"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="Optional reason"
                                    className="col-span-3"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleSave} disabled={saving}>
                                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                {editingPeriod ? 'Update' : 'Save'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Delete Confirmation Dialog */}
                <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Status Period</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to delete this status period ({deleteTarget?.status}: {formatDate(deleteTarget?.valid_from || null)} → {formatDate(deleteTarget?.valid_until || null)})?
                                This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDeleteConfirm}
                                className="bg-red-600 hover:bg-red-700"
                            >
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
    )
}
