'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ArrowLeft, Plus, Trash2, Pencil, Save, X, Loader2 } from 'lucide-react'
import { getCategories, createCategory, deleteCategory, updateCategory } from './actions'
import { useToast } from "@/components/ui/use-toast"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function CategoriesPage() {
    const [categories, setCategories] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [newCategory, setNewCategory] = useState('')
    const [isAdding, setIsAdding] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState('')
    const { toast } = useToast()

    useEffect(() => {
        loadCategories()
    }, [])

    const loadCategories = async () => {
        setLoading(true)
        const data = await getCategories()
        setCategories(data)
        setLoading(false)
    }

    const handleAdd = async () => {
        if (!newCategory.trim()) return

        setIsAdding(true)
        const result = await createCategory(newCategory.trim())

        if (result.success) {
            setNewCategory('')
            await loadCategories()
            toast({
                title: "Success",
                description: "Category added successfully",
            })
        } else {
            toast({
                title: "Error",
                description: result.error || "Failed to add category",
                variant: "destructive",
            })
        }
        setIsAdding(false)
    }

    const handleDelete = async (id: string) => {
        const result = await deleteCategory(id)

        if (result.success) {
            await loadCategories()
            toast({
                title: "Success",
                description: "Category deleted successfully",
            })
        } else {
            toast({
                title: "Error",
                description: result.error || "Failed to delete category",
                variant: "destructive",
            })
        }
    }

    const startEdit = (category: any) => {
        setEditingId(category.id)
        setEditName(category.name)
    }

    const cancelEdit = () => {
        setEditingId(null)
        setEditName('')
    }

    const handleUpdate = async (id: string) => {
        if (!editName.trim()) return

        const result = await updateCategory(id, editName.trim())

        if (result.success) {
            setEditingId(null)
            await loadCategories()
            toast({
                title: "Success",
                description: "Category updated successfully",
            })
        } else {
            toast({
                title: "Error",
                description: result.error || "Failed to update category",
                variant: "destructive",
            })
        }
    }

    return (
        <div className="container mx-auto py-8 max-w-4xl">
            <div className="flex items-center gap-4 mb-6">
                <Link href="/admin/settings">
                    <Button variant="outline" size="sm">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Settings
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold">Employee Categories</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Manage Categories</CardTitle>
                    <CardDescription>
                        Add or remove employee categories (e.g., Fulltime, Parttime).
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex gap-4">
                        <Input
                            placeholder="New category name..."
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                        />
                        <Button onClick={handleAdd} disabled={isAdding || !newCategory.trim()}>
                            {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                            Add Category
                        </Button>
                    </div>

                    {loading ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Loading...
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {categories.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg">
                                    No categories found. Add one above.
                                </div>
                            ) : (
                                categories.map((category) => (
                                    <div
                                        key={category.id}
                                        className="flex items-center justify-between p-3 bg-card border rounded-lg hover:bg-accent/10 transition-colors"
                                    >
                                        {editingId === category.id ? (
                                            <div className="flex items-center gap-2 flex-1 mr-4">
                                                <Input
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    className="h-8"
                                                    autoFocus
                                                />
                                                <Button size="sm" variant="ghost" onClick={() => handleUpdate(category.id)} className="h-8 w-8 p-0 text-green-600">
                                                    <Save className="h-4 w-4" />
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-8 w-8 p-0 text-red-600">
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <span className="font-medium">{category.name}</span>
                                        )}

                                        <div className="flex items-center gap-2">
                                            {editingId !== category.id && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => startEdit(category)}
                                                    className="h-8 w-8 p-0"
                                                >
                                                    <Pencil className="h-4 w-4 text-muted-foreground" />
                                                </Button>
                                            )}

                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Delete Category?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Are you sure you want to delete "{category.name}"? This action cannot be undone.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={() => handleDelete(category.id)}
                                                            className="bg-red-500 hover:bg-red-600"
                                                        >
                                                            Delete
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
