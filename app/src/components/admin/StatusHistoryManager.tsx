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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Trash2, Calendar, Loader2 } from 'lucide-react'
import { getStatusHistory, addStatusPeriod, deleteStatusPeriod, type StatusPeriod } from '@/actions/status_history'
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

    const handleAdd = async () => {
        if (!validFrom) {
            toast.error("Start date is required")
            return
        }

        setSaving(true)
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
            // Reload page to reflect potential current status change?
            // window.location.reload() // Might be too aggressive, but ensures consistency
        } else {
            toast.error(result.error || "Failed to add period")
        }
        setSaving(false)
    }

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this period?")) return

        const result = await deleteStatusPeriod(id, personId)
        if (result.success) {
            toast.success("Period deleted")
            loadHistory()
        } else {
            toast.error(result.error || "Failed to delete period")
        }
    }

    const resetForm = () => {
        setStatus('active')
        setValidFrom('')
        setValidUntil('')
        setNote('')
    }

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'Present' // or "Indefinite"
        return new Date(dateStr).toLocaleDateString()
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">
                    Status History
                </CardTitle>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="gap-1">
                            <Plus className="h-4 w-4" />
                            Add Period
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Status Period</DialogTitle>
                            <DialogDescription>
                                Set a date range for when this person is active or inactive.
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
                                    <p className="text-[10px] text-muted-foreground mt-1">Leave empty if ongoing</p>
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
                            <Button onClick={handleAdd} disabled={saving}>
                                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Save
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
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
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {history.map((period) => (
                                    <TableRow key={period.id}>
                                        <TableCell>
                                            <Badge variant={period.status === 'active' ? 'default' : 'secondary'}>
                                                {period.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{formatDate(period.valid_from)}</TableCell>
                                        <TableCell>{formatDate(period.valid_until)}</TableCell>
                                        <TableCell className="text-muted-foreground text-sm max-w-[150px] truncate">
                                            {period.note}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(period.id)}
                                                className="h-8 w-8 text-muted-foreground hover:text-red-600"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
