'use client'

import { useState } from 'react'
import { Plus, Trash2, Edit2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { createLegend, updateLegend, deleteLegend, ShiftLegend } from '@/app/admin/settings/legends/actions'
import { useToast } from '@/components/ui/use-toast'

export function LegendManager({ initialLegends }: { initialLegends: ShiftLegend[] }) {
    const [legends, setLegends] = useState<ShiftLegend[]>(initialLegends)
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [currentLegend, setCurrentLegend] = useState<ShiftLegend | null>(null)
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    // Form states
    const [fromLocation, setFromLocation] = useState('')
    const [toLocation, setToLocation] = useState('')
    const [color, setColor] = useState('#FDBA74')

    const resetForm = () => {
        setFromLocation('')
        setToLocation('')
        setColor('#FDBA74')
    }

    const openEdit = (legend: ShiftLegend) => {
        setCurrentLegend(legend)
        setFromLocation(legend.from_location)
        setToLocation(legend.to_location)
        setColor(legend.color)
        setIsEditOpen(true)
    }

    const handleCreate = async () => {
        if (!fromLocation || !toLocation) {
            toast({
                title: "Error",
                description: "Both 'From' and 'To' locations are required.",
                variant: "destructive"
            })
            return
        }

        setLoading(true)
        try {
            const result = await createLegend({
                from_location: fromLocation,
                to_location: toLocation,
                color: color
            })

            if (result.success && result.data) {
                setLegends([result.data, ...legends])
                setIsAddOpen(false)
                resetForm()
                toast({ title: "Success", description: "Legend created successfully" })
            } else {
                toast({ title: "Error", description: result.error || "Failed to create legend", variant: "destructive" })
            }
        } catch (error) {
            console.error(error)
            toast({ title: "Error", description: "An unexpected error occurred", variant: "destructive" })
        } finally {
            setLoading(false)
        }
    }

    const handleUpdate = async () => {
        if (!currentLegend) return
        if (!fromLocation || !toLocation) {
            toast({
                title: "Error",
                description: "Both 'From' and 'To' locations are required.",
                variant: "destructive"
            })
            return
        }

        setLoading(true)
        try {
            const result = await updateLegend(currentLegend.id, {
                from_location: fromLocation,
                to_location: toLocation,
                color: color
            })

            if (result.success && result.data) {
                setLegends(legends.map(l => l.id === currentLegend.id ? result.data! : l))
                setIsEditOpen(false)
                resetForm()
                toast({ title: "Success", description: "Legend updated successfully" })
            } else {
                toast({ title: "Error", description: result.error || "Failed to update legend", variant: "destructive" })
            }
        } catch (error) {
            console.error(error)
            toast({ title: "Error", description: "An unexpected error occurred", variant: "destructive" })
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this legend?')) return

        try {
            const result = await deleteLegend(id)
            if (result.success) {
                setLegends(legends.filter(l => l.id !== id))
                toast({ title: "Success", description: "Legend deleted" })
            } else {
                toast({ title: "Error", description: result.error || "Failed to delete legend", variant: "destructive" })
            }
        } catch (error) {
            console.error(error)
            toast({ title: "Error", description: "An unexpected error occurred", variant: "destructive" })
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-card p-6 rounded-lg border shadow-sm">
                <div>
                    <h2 className="text-lg font-semibold">Shift Legends</h2>
                    <p className="text-sm text-muted-foreground">Create color-coded legends for shift location changes.</p>
                </div>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={resetForm}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Legend
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Legend</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">From</Label>
                                <Input
                                    value={fromLocation}
                                    onChange={e => setFromLocation(e.target.value)}
                                    className="col-span-3"
                                    placeholder="e.g. Branch X"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">To</Label>
                                <Input
                                    value={toLocation}
                                    onChange={e => setToLocation(e.target.value)}
                                    className="col-span-3"
                                    placeholder="e.g. Branch Y"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Color</Label>
                                <div className="col-span-3 flex items-center gap-3">
                                    <Input
                                        type="color"
                                        value={color}
                                        onChange={e => setColor(e.target.value)}
                                        className="w-12 h-12 p-1 cursor-pointer"
                                    />
                                    <span className="text-sm text-muted-foreground">{color}</span>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreate} disabled={loading}>
                                {loading ? 'Saving...' : 'Create Legend'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Legend</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">From</Label>
                            <Input
                                value={fromLocation}
                                onChange={e => setFromLocation(e.target.value)}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">To</Label>
                            <Input
                                value={toLocation}
                                onChange={e => setToLocation(e.target.value)}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Color</Label>
                            <div className="col-span-3 flex items-center gap-3">
                                <Input
                                    type="color"
                                    value={color}
                                    onChange={e => setColor(e.target.value)}
                                    className="w-12 h-12 p-1 cursor-pointer"
                                />
                                <span className="text-sm text-muted-foreground">{color}</span>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                        <Button onClick={handleUpdate} disabled={loading}>
                            {loading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {legends.map((legend) => (
                    <Card key={legend.id} className="relative group">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div
                                    className="w-12 h-12 rounded-full border shadow-sm flex-shrink-0"
                                    style={{ backgroundColor: legend.color }}
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 text-sm font-medium mb-1">
                                        <span className="truncate" title={legend.from_location}>{legend.from_location}</span>
                                        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        <span className="truncate" title={legend.to_location}>{legend.to_location}</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground uppercase">{legend.color}</div>
                                </div>
                            </div>

                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(legend)}>
                                    <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(legend.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {legends.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                        No legends found. Create one to get started.
                    </div>
                )}
            </div>
        </div>
    )
}
