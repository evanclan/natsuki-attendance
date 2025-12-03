'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Plus } from 'lucide-react'
import { createPerson, getAvailableCategories } from '@/app/actions/people'
import { useRouter } from 'next/navigation'

interface AddPersonDialogProps {
    role: 'employee' | 'student'
    onSuccess?: () => void
}

export function AddPersonDialog({ role, onSuccess }: AddPersonDialogProps) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [categories, setCategories] = useState<any[]>([])
    const [error, setError] = useState<string | null>(null)

    const [formData, setFormData] = useState({
        full_name: '',
        category_id: '',
        job_type: '',
        registration_date: new Date().toISOString().split('T')[0]
    })

    useEffect(() => {
        if (open) {
            const fetchCategories = async () => {
                const cats = await getAvailableCategories(role)
                setCategories(cats)
            }
            fetchCategories()
        }
    }, [open, role])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        if (!formData.full_name) {
            setError('Name is required')
            setLoading(false)
            return
        }

        const result = await createPerson({
            ...formData,
            role,
            category_id: formData.category_id || null,
            job_type: role === 'employee' ? formData.job_type : undefined
        })

        if (result.success) {
            setOpen(false)
            setFormData({
                full_name: '',
                category_id: '',
                job_type: '',
                registration_date: new Date().toISOString().split('T')[0]
            })
            router.refresh()
            if (onSuccess) {
                onSuccess()
            }
        } else {
            setError(result.error || 'Failed to create')
        }
        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add {role === 'employee' ? 'Employee' : 'Student'}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New {role === 'employee' ? 'Employee' : 'Student'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="text-sm text-red-500 bg-red-50 p-2 rounded">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="full_name">Full Name</Label>
                        <Input
                            id="full_name"
                            value={formData.full_name}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            placeholder="John Doe"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select
                            value={formData.category_id}
                            onValueChange={(val) => setFormData({ ...formData, category_id: val })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {categories.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id}>
                                        {cat.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {role === 'employee' && (
                        <div className="space-y-2">
                            <Label htmlFor="job_type">Job Type</Label>
                            <Input
                                id="job_type"
                                value={formData.job_type}
                                onChange={(e) => setFormData({ ...formData, job_type: e.target.value })}
                                placeholder="e.g. Developer"
                            />
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="registration_date">Registration Date</Label>
                        <Input
                            id="registration_date"
                            type="date"
                            value={formData.registration_date}
                            onChange={(e) => setFormData({ ...formData, registration_date: e.target.value })}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Creating...' : 'Create'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
