'use client'

import { Calendar } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

export default function AdminPage() {
    const [attendance, setAttendance] = useState<any[]>([])
    const [availableDates, setAvailableDates] = useState<string[]>([])
    const [selectedDate, setSelectedDate] = useState<string>('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    // Get today's date in YYYY-MM-DD format (JST)
    const getTodayDate = () => {
        return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' })
    }

    // Format date to "Monday, September 16" format
    const formatDateDisplay = (dateStr: string) => {
        const date = new Date(dateStr + 'T00:00:00')
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
        })
    }

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            const supabase = createClient()

            // Fetch all unique dates
            const { data: datesData, error: datesError } = await supabase
                .from('attendance_days')
                .select('date')
                .order('date', { ascending: false })

            if (datesError) {
                setError(datesError.message)
                setLoading(false)
                return
            }

            // Get unique dates
            const uniqueDates = [...new Set(datesData?.map(d => d.date) || [])] as string[]
            setAvailableDates(uniqueDates)

            // Set today as default if it exists in the data, otherwise use the most recent date
            const today = getTodayDate()
            const defaultDate = uniqueDates.includes(today) ? today : (uniqueDates[0] || today)
            setSelectedDate(defaultDate)

            setLoading(false)
        }

        fetchData()
    }, [])

    const fetchAttendance = async () => {
        if (!selectedDate) return

        const supabase = createClient()

        const { data, error: fetchError } = await supabase
            .from('attendance_days')
            .select(`
                *,
                people (
                    full_name,
                    code
                )
            `)
            .eq('date', selectedDate)
            .order('created_at', { ascending: false })

        if (fetchError) {
            setError(fetchError.message)
            return
        }

        setAttendance(data || [])
    }

    useEffect(() => {
        fetchAttendance()

        if (!selectedDate) return

        const supabase = createClient()
        const channel = supabase
            .channel('admin_attendance_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'attendance_days',
                    filter: `date=eq.${selectedDate}`,
                },
                () => {
                    fetchAttendance()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [selectedDate])

    if (error) {
        return <div className="p-8 text-red-500">Error loading data: {error}</div>
    }

    return (
        <div className="container mx-auto py-8">
            <div className="flex gap-4 mb-6">
                <Link href="/admin/manage_student">
                    <Button variant="outline">Manage Student</Button>
                </Link>
                <Link href="/admin/manage_employee">
                    <Button variant="outline">Manage Employee</Button>
                </Link>
                <Link href="/admin/settings">
                    <Button variant="outline">Settings</Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Today's Log</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                                {selectedDate && formatDateDisplay(selectedDate)}
                            </p>
                        </div>
                        <Select
                            value={selectedDate}
                            onValueChange={setSelectedDate}
                            disabled={loading}
                        >
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Select date" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableDates.map((date) => (
                                    <SelectItem key={date} value={date}>
                                        {formatDateDisplay(date)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Check In</TableHead>
                                <TableHead>Check Out</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {attendance?.map((record) => (
                                <TableRow key={record.id}>
                                    <TableCell className="font-medium">
                                        {record.people?.full_name || 'Unknown'}
                                        <span className="ml-2 text-xs text-muted-foreground">
                                            ({record.people?.code})
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        {record.check_in_at ? new Date(record.check_in_at).toLocaleTimeString() : '-'}
                                    </TableCell>
                                    <TableCell>
                                        {record.check_out_at ? new Date(record.check_out_at).toLocaleTimeString() : '-'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={record.status === 'present' ? 'default' : 'secondary'}>
                                            {record.status}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {attendance?.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                        No attendance records found for this date.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="fixed bottom-8 right-8 flex gap-3">
                <Link href="/admin/all_list">
                    <Button size="lg" className="shadow-lg" variant="outline">
                        <Calendar className="mr-2 h-5 w-5" />
                        All List
                    </Button>
                </Link>
                <Link href="/admin/masterlist">
                    <Button size="lg" className="shadow-lg">
                        <Calendar className="mr-2 h-5 w-5" />
                        Master List
                    </Button>
                </Link>
            </div>
        </div>
    )
}
