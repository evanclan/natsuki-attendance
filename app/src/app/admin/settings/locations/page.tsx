'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Plus, Trash2, MapPin } from 'lucide-react'
import { getLocations, createLocation, deleteLocation, Location } from '../actions'

export default function LocationsPage() {
    const [locations, setLocations] = useState<Location[]>([])
    const [newLocationName, setNewLocationName] = useState('')
    const [loading, setLoading] = useState(false)
    const [deleting, setDeleting] = useState<string | null>(null)

    useEffect(() => {
        loadLocations()
    }, [])

    const loadLocations = async () => {
        const result = await getLocations()
        if (result.success && result.data) {
            setLocations(result.data)
        } else {
            alert('Failed to load locations')
        }
    }

    const handleCreate = async () => {
        if (!newLocationName.trim()) {
            alert('Please enter a location name')
            return
        }

        setLoading(true)
        try {
            const result = await createLocation(newLocationName.trim())
            if (result.success) {
                alert('Location added successfully')
                setNewLocationName('')
                loadLocations()
            } else {
                alert(result.error || 'Failed to add location')
            }
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"?`)) {
            return
        }

        setDeleting(id)
        try {
            const result = await deleteLocation(id)
            if (result.success) {
                alert('Location deleted successfully')
                loadLocations()
            } else {
                alert(result.error || 'Failed to delete location')
            }
        } finally {
            setDeleting(null)
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
                <h1 className="text-2xl font-bold">Manage Locations</h1>
            </div>

            <div className="grid gap-6 max-w-2xl">
                {/* Add New Location */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Plus className="h-5 w-5" />
                            Add New Location
                        </CardTitle>
                        <CardDescription>
                            Add a custom location for work shifts
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <Label htmlFor="location-name" className="sr-only">
                                    Location Name
                                </Label>
                                <Input
                                    id="location-name"
                                    placeholder="e.g. Tokyo Office"
                                    value={newLocationName}
                                    onChange={(e) => setNewLocationName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleCreate()
                                        }
                                    }}
                                />
                            </div>
                            <Button onClick={handleCreate} disabled={loading}>
                                {loading ? 'Adding...' : 'Add Location'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Locations List */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MapPin className="h-5 w-5" />
                            Available Locations
                        </CardTitle>
                        <CardDescription>
                            Manage all shift locations. Default locations cannot be deleted.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {locations.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    No locations found
                                </p>
                            ) : (
                                locations.map((location) => (
                                    <div
                                        key={location.id}
                                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <MapPin className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="font-medium">{location.name}</p>
                                                {location.is_default && (
                                                    <p className="text-xs text-muted-foreground">
                                                        Default location
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        {!location.is_default && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(location.id, location.name)}
                                                disabled={deleting === location.id}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
