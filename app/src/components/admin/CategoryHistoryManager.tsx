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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Trash2, Pencil, Loader2, Info, GraduationCap } from 'lucide-react'
import {
    getCategoryHistory,
    addCategoryPeriod,
    updateCategoryPeriod,
    deleteCategoryPeriod,
    type CategoryPeriod
} from '@/actions/category_history'
import { getAvailableCategories } from '@/app/actions/people'
import { toast } from 'sonner'

interface CategoryHistoryManagerProps {
    personId: string
}

export function CategoryHistoryManager({ personId }: CategoryHistoryManagerProps) {
    const [history, setHistory] = useState<CategoryPeriod[]>([])
    const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
    const [loading, setLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [saving, setSaving] = useState(false)

    // Edit mode
    const [editingPeriod, setEditingPeriod] = useState<CategoryPeriod | null>(null)

    // Delete confirmation
    const [deleteTarget, setDeleteTarget] = useState<CategoryPeriod | null>(null)

    // Form state
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
    const [validFrom, setValidFrom] = useState('')
    const [validUntil, setValidUntil] = useState('')
    const [note, setNote] = useState('')
    const [closeExisting, setCloseExisting] = useState(false)

    useEffect(() => {
        loadData()
    }, [personId])

    const loadData = async () => {
        setLoading(true)
        const [historyResult, cats] = await Promise.all([
            getCategoryHistory(personId),
            getAvailableCategories('student')
        ])
        if (historyResult.success && historyResult.data) {
            setHistory(historyResult.data)
        }
        setCategories(cats)
        setLoading(false)
    }

    const openAddDialog = () => {
        setEditingPeriod(null)
        resetForm()
        setIsDialogOpen(true)
    }

    const openEditDialog = (period: CategoryPeriod) => {
        setEditingPeriod(period)
        setSelectedCategoryIds(period.categories.map(c => c.id))
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

        if (selectedCategoryIds.length === 0) {
            toast.error("Please select at least one category")
            return
        }

        setSaving(true)

        if (editingPeriod) {
            const result = await updateCategoryPeriod(editingPeriod.id, personId, {
                category_ids: selectedCategoryIds,
                valid_from: validFrom,
                valid_until: validUntil || null,
                note: note || null
            })

            if (result.success) {
                toast.success("Category period updated")
                setIsDialogOpen(false)
                resetForm()
                loadData()
            } else {
                toast.error(result.error || "Failed to update period")
            }
        } else {
            const result = await addCategoryPeriod({
                person_id: personId,
                category_ids: selectedCategoryIds,
                valid_from: validFrom,
                valid_until: validUntil || null,
                note: note || null,
                closeExisting: closeExisting
            })

            if (result.success) {
                toast.success("Category period added")
                setIsDialogOpen(false)
                resetForm()
                loadData()
            } else {
                toast.error(result.error || "Failed to add period")
            }
        }
        setSaving(false)
    }

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return

        const result = await deleteCategoryPeriod(deleteTarget.id, personId)
        if (result.success) {
            toast.success("Period deleted")
            loadData()
        } else {
            toast.error(result.error || "Failed to delete period")
        }
        setDeleteTarget(null)
    }

    const resetForm = () => {
        setSelectedCategoryIds([])
        setValidFrom('')
        setValidUntil('')
        setNote('')
        setCloseExisting(false)
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

    const isCurrentPeriod = (period: CategoryPeriod) => {
        const today = new Date().toISOString().split('T')[0]
        return period.valid_from <= today && (period.valid_until === null || period.valid_until >= today)
    }

    const isFuturePeriod = (period: CategoryPeriod) => {
        const today = new Date().toISOString().split('T')[0]
        return period.valid_from > today
    }

    const toggleCategory = (catId: string) => {
        setSelectedCategoryIds(prev =>
            prev.includes(catId)
                ? prev.filter(id => id !== catId)
                : [...prev, catId]
        )
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    Category History
                </CardTitle>
                <Button size="sm" variant="outline" className="gap-1" onClick={openAddDialog}>
                    <Plus className="h-4 w-4" />
                    Add Period
                </Button>
            </CardHeader>
            <CardContent>
                {/* Info banner */}
                <div className="flex items-start gap-2 p-3 mb-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                    <Info className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-purple-700 dark:text-purple-300">
                        Category history tracks which class(es) this student belongs to over time.
                        Multiple periods can overlap — the student&apos;s active categories are the combined result of all periods covering today&apos;s date.
                        Check &quot;Close existing open periods&quot; when adding a new period if the student is fully leaving their current class(es).
                    </p>
                </div>

                {loading ? (
                    <div className="text-center py-4 text-muted-foreground">Loading...</div>
                ) : history.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                        No category history found. Add a period to start tracking category changes.
                    </div>
                ) : (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Categories</TableHead>
                                    <TableHead>From</TableHead>
                                    <TableHead>Until</TableHead>
                                    <TableHead>Note</TableHead>
                                    <TableHead className="w-[80px]">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {history.map((period) => (
                                    <TableRow
                                        key={period.id}
                                        className={
                                            isCurrentPeriod(period)
                                                ? 'bg-green-50/50 dark:bg-green-950/20'
                                                : isFuturePeriod(period)
                                                    ? 'bg-blue-50/50 dark:bg-blue-950/20'
                                                    : ''
                                        }
                                    >
                                        <TableCell>
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                {period.categories.length > 0
                                                    ? period.categories.map(cat => (
                                                        <Badge key={cat.id} variant="outline" className="text-xs">
                                                            {cat.name}
                                                        </Badge>
                                                    ))
                                                    : <span className="text-muted-foreground text-sm">—</span>
                                                }
                                                {isCurrentPeriod(period) && (
                                                    <Badge variant="outline" className="text-[10px] bg-green-100 text-green-700 border-green-300">
                                                        Current
                                                    </Badge>
                                                )}
                                                {isFuturePeriod(period) && (
                                                    <Badge variant="outline" className="text-[10px] bg-blue-100 text-blue-700 border-blue-300">
                                                        Upcoming
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
                                {editingPeriod ? 'Edit Category Period' : 'Add Category Period'}
                            </DialogTitle>
                            <DialogDescription>
                                {editingPeriod
                                    ? 'Update the date range and categories for this period.'
                                    : 'Add a new category period. By default, existing periods stay open (overlapping). Check "Close existing" if the student is leaving their current class(es).'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            {/* Category selection */}
                            <div className="grid grid-cols-4 items-start gap-4">
                                <Label className="text-right pt-2">
                                    Categories
                                </Label>
                                <div className="col-span-3 border rounded-md p-2 max-h-[150px] overflow-y-auto space-y-2">
                                    {categories.length === 0 && (
                                        <div className="text-sm text-muted-foreground">No categories available</div>
                                    )}
                                    {categories.map((cat) => (
                                        <div key={cat.id} className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                id={`cat-hist-${cat.id}`}
                                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                checked={selectedCategoryIds.includes(cat.id)}
                                                onChange={() => toggleCategory(cat.id)}
                                            />
                                            <Label htmlFor={`cat-hist-${cat.id}`} className="font-normal cursor-pointer">
                                                {cat.name}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {/* From date */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="cat-from" className="text-right">
                                    From
                                </Label>
                                <Input
                                    id="cat-from"
                                    type="date"
                                    value={validFrom}
                                    onChange={(e) => setValidFrom(e.target.value)}
                                    className="col-span-3"
                                />
                            </div>
                            {/* Until date */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="cat-until" className="text-right">
                                    Until
                                </Label>
                                <div className="col-span-3">
                                    <Input
                                        id="cat-until"
                                        type="date"
                                        value={validUntil}
                                        onChange={(e) => setValidUntil(e.target.value)}
                                    />
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                        Leave empty for ongoing (&quot;Present&quot;). Set a date if you know the end date.
                                    </p>
                                </div>
                            </div>
                            {/* Note */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="cat-note" className="text-right">
                                    Note
                                </Label>
                                <Input
                                    id="cat-note"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="Optional reason (e.g., Graduated from Academy)"
                                    className="col-span-3"
                                />
                            </div>
                            {/* Close existing toggle - only show when adding, not editing */}
                            {!editingPeriod && (
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <div className="col-start-2 col-span-3">
                                        <div className="flex items-center space-x-2 p-2 rounded-md border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30">
                                            <input
                                                type="checkbox"
                                                id="close-existing"
                                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                checked={closeExisting}
                                                onChange={(e) => setCloseExisting(e.target.checked)}
                                            />
                                            <Label htmlFor="close-existing" className="font-normal cursor-pointer text-xs">
                                                Close existing open periods (use when student is <strong>leaving</strong> current class)
                                            </Label>
                                        </div>
                                    </div>
                                </div>
                            )}
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
                            <AlertDialogTitle>Delete Category Period</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to delete this category period ({deleteTarget?.categories.map(c => c.name).join(', ')}: {formatDate(deleteTarget?.valid_from || null)} → {formatDate(deleteTarget?.valid_until || null)})?
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
