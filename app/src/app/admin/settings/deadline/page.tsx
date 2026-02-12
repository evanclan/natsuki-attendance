'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save, CalendarClock } from 'lucide-react'
import { getDeadlineSetting, updateDeadlineSetting } from './actions'
import { toast } from "sonner"

export default function DeadlineSettingsPage() {
    const router = useRouter()
    const [deadlineDay, setDeadlineDay] = useState<string>('21')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        const fetchSetting = async () => {
            const result = await getDeadlineSetting()
            if (result.success && result.data) {
                setDeadlineDay(result.data.toString())
            }
            setLoading(false)
        }
        fetchSetting()
    }, [])

    const handleSave = async () => {
        setSaving(true)
        const day = parseInt(deadlineDay, 10)

        const result = await updateDeadlineSetting(day)

        if (result.success) {
            toast.success(`Deadline updated to the ${day}${getDaySuffix(day)} of the month`)
            router.refresh()
        } else {
            toast.error(result.error || "Failed to update deadline")
        }
        setSaving(false)
    }

    const getDaySuffix = (day: number) => {
        if (day >= 11 && day <= 13) return 'th'
        switch (day % 10) {
            case 1: return 'st'
            case 2: return 'nd'
            case 3: return 'rd'
            default: return 'th'
        }
    }

    // Generate days 1-28
    const days = Array.from({ length: 28 }, (_, i) => i + 1)

    return (
        <div className="container mx-auto py-8">
            <div className="flex items-center gap-4 mb-6">
                <Link href="/admin/settings">
                    <Button variant="outline" size="sm">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Settings
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold">Preferred Rest Deadline</h1>
            </div>

            <div className="max-w-2xl mx-auto">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CalendarClock className="h-5 w-5" />
                            Configure Deadline
                        </CardTitle>
                        <CardDescription>
                            Set the monthly deadline day for employees to submit their preferred rest days.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Deadline Day (of current month)</label>
                            <Select
                                value={deadlineDay}
                                onValueChange={setDeadlineDay}
                                disabled={loading}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a day" />
                                </SelectTrigger>
                                <SelectContent>
                                    {days.map((day) => (
                                        <SelectItem key={day} value={day.toString()}>
                                            {day}{getDaySuffix(day)} of the month
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-sm text-muted-foreground">
                                All submissions will be closed after 23:59:59 on this day.
                            </p>
                        </div>

                        <div className="flex justify-end">
                            <Button
                                onClick={handleSave}
                                disabled={loading || saving}
                                className="w-full sm:w-auto"
                            >
                                {saving ? (
                                    <>Saving...</>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4 mr-2" />
                                        Save Changes
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
