'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, Plus, Trash2, Edit, Save, X, Eye, EyeOff } from 'lucide-react'
import { getAllNews, createNews, updateNews, deleteNews, NewsItem } from '@/app/actions/news'
import { toast } from 'sonner'

export default function NewsSettingsPage() {
    const [news, setNews] = useState<NewsItem[]>([])
    const [loading, setLoading] = useState(true)
    const [isEditing, setIsEditing] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)

    // Form state
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [imageUrl, setImageUrl] = useState('')
    const [targetAudience, setTargetAudience] = useState<'student' | 'employee'>('student')
    const [isActive, setIsActive] = useState(true)
    const [displayDate, setDisplayDate] = useState(new Date().toISOString().split('T')[0])

    useEffect(() => {
        loadNews()
    }, [])

    async function loadNews() {
        setLoading(true)
        try {
            const data = await getAllNews()
            setNews(data)
        } catch (error) {
            toast.error('Failed to load news')
        } finally {
            setLoading(false)
        }
    }

    function resetForm() {
        setTitle('')
        setDescription('')
        setImageUrl('')
        setTargetAudience('student')
        setIsActive(true)
        setDisplayDate(new Date().toISOString().split('T')[0])
        setIsEditing(false)
        setEditingId(null)
    }

    function handleEdit(item: NewsItem) {
        setTitle(item.title)
        setDescription(item.description)
        setImageUrl(item.image_url || '')
        setTargetAudience(item.target_audience)
        setIsActive(item.is_active)
        setDisplayDate(item.display_date)
        setEditingId(item.id)
        setIsEditing(true)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        try {
            if (isEditing && editingId) {
                await updateNews(editingId, {
                    title,
                    description,
                    image_url: imageUrl || undefined,
                    target_audience: targetAudience,
                    is_active: isActive,
                    display_date: displayDate
                })
                toast.success('News updated successfully')
            } else {
                await createNews({
                    title,
                    description,
                    image_url: imageUrl || undefined,
                    target_audience: targetAudience,
                    is_active: isActive,
                    display_date: displayDate
                })
                toast.success('News created successfully')
            }
            resetForm()
            loadNews()
        } catch (error) {
            toast.error('Failed to save news')
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Are you sure you want to delete this news item?')) return
        try {
            await deleteNews(id)
            toast.success('News deleted successfully')
            loadNews()
        } catch (error) {
            toast.error('Failed to delete news')
        }
    }

    async function toggleVisibility(item: NewsItem) {
        try {
            await updateNews(item.id, { is_active: !item.is_active })
            toast.success(item.is_active ? 'News hidden' : 'News visible')
            loadNews()
        } catch (error) {
            toast.error('Failed to update visibility')
        }
    }

    return (
        <div className="container mx-auto py-8">
            <div className="flex items-center gap-4 mb-6">
                <Link href="/admin/settings">
                    <Button variant="outline" size="sm">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Settings
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold">News Settings</h1>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Form Section */}
                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle>{isEditing ? 'Edit News' : 'Add New News'}</CardTitle>
                        </CardHeader>
                        <CardContent>
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
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="imageUrl">Image URL (Optional)</Label>
                                    <Input
                                        id="imageUrl"
                                        value={imageUrl}
                                        onChange={(e) => setImageUrl(e.target.value)}
                                        placeholder="https://..."
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="audience">Target Audience</Label>
                                    <Select
                                        value={targetAudience}
                                        onValueChange={(val: 'student' | 'employee') => setTargetAudience(val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="student">Student</SelectItem>
                                            <SelectItem value="employee">Employee</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="date">Display Date</Label>
                                    <Input
                                        id="date"
                                        type="date"
                                        value={displayDate}
                                        onChange={(e) => setDisplayDate(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="active"
                                        checked={isActive}
                                        onCheckedChange={setIsActive}
                                    />
                                    <Label htmlFor="active">Active</Label>
                                </div>

                                <div className="flex gap-2 pt-4">
                                    <Button type="submit" className="flex-1">
                                        <Save className="h-4 w-4 mr-2" />
                                        {isEditing ? 'Update' : 'Create'}
                                    </Button>
                                    {isEditing && (
                                        <Button type="button" variant="outline" onClick={resetForm}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* List Section */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-xl font-semibold">News List</h2>
                    {loading ? (
                        <p>Loading...</p>
                    ) : news.length === 0 ? (
                        <p className="text-muted-foreground">No news items found.</p>
                    ) : (
                        <div className="grid gap-4">
                            {news.map((item) => (
                                <Card key={item.id} className={!item.is_active ? 'opacity-60' : ''}>
                                    <CardContent className="p-4 flex gap-4">
                                        {item.image_url && (
                                            <img
                                                src={item.image_url}
                                                alt={item.title}
                                                className="w-24 h-24 object-cover rounded-md"
                                            />
                                        )}
                                        <div className="flex-1 flex flex-col">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-bold text-lg">{item.title}</h3>
                                                    <div className="flex gap-2 text-xs text-muted-foreground mb-2">
                                                        <span className="bg-secondary px-2 py-0.5 rounded capitalize">
                                                            {item.target_audience}
                                                        </span>
                                                        <span>{item.display_date}</span>
                                                        {item.is_active ? (
                                                            <span className="text-green-600 font-medium">Active</span>
                                                        ) : (
                                                            <span className="text-red-500">Inactive</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="text-sm text-gray-600 line-clamp-2 mb-4">{item.description}</p>
                                            <div className="flex gap-2 justify-end mt-auto">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => toggleVisibility(item)}
                                                    className={item.is_active ? "text-blue-600 border-blue-200 bg-blue-50" : "text-gray-400"}
                                                >
                                                    {item.is_active ? (
                                                        <>
                                                            <Eye className="h-4 w-4 mr-2" />
                                                            Hide
                                                        </>
                                                    ) : (
                                                        <>
                                                            <EyeOff className="h-4 w-4 mr-2" />
                                                            Show
                                                        </>
                                                    )}
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
                                                    <Edit className="h-4 w-4 mr-2" />
                                                    Edit
                                                </Button>
                                                <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200" onClick={() => handleDelete(item.id)}>
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Delete
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
