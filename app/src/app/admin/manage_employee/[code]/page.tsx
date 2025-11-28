'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { updateEmployeeDetails, updateEmployeeMemo } from './actions'
import { updateAttendanceRecord } from '../../attendance-actions/actions'
import { ShiftCalendar } from '@/components/admin/ShiftCalendar'
import { MonthlyReport } from '@/components/admin/MonthlyReport'
import { Pencil, Save, X, AlertCircle } from 'lucide-react'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

export default function EmployeeDetailPage() {
    const router = useRouter()
    const params = useParams()
    const code = params?.code as string
    const [employee, setEmployee] = useState<any>(null)
    const [categories, setCategories] = useState<any[]>([])
    const [attendanceHistory, setAttendanceHistory] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Form states
    const [fullName, setFullName] = useState('')
    const [categoryId, setCategoryId] = useState('')
    const [registrationDate, setRegistrationDate] = useState('')
    const [status, setStatus] = useState('')
    const [memo, setMemo] = useState('')

    // Edit states
    const [editingId, setEditingId] = useState<number | null>(null)
    const [editForm, setEditForm] = useState<{
        check_in_at: string
        check_out_at: string
        status: string
        admin_note: string
    }>({
        check_in_at: '',
        check_out_at: '',
        status: '',
        admin_note: ''
    })

    useEffect(() => {
        if (!code) return

        const fetchData = async () => {
            setLoading(true)
            const supabase = createClient()

            // Fetch employee details
            const { data: employeeData, error: employeeError } = await supabase
                .from('people')
                .select(`
                    *,
                    categories (
                        id,
                        name
                    )
                `)
                .eq('code', code)
                .eq('role', 'employee')
                .single()

            if (employeeError || !employeeData) {
                setError('Employee not found')
                setLoading(false)
                return
            }

            setEmployee(employeeData)
            setFullName(employeeData.full_name || '')
            setCategoryId(employeeData.category_id || '')
            setRegistrationDate(employeeData.registration_date || '')
            setStatus(employeeData.status || 'active')
            setMemo(employeeData.memo || '')

            // Fetch categories
            const { data: categoriesData } = await supabase
                .from('categories')
                .select('id, name')
                .eq('for_role', 'employee')
                .eq('is_active', true)
                .order('sort_order')

            setCategories(categoriesData || [])

            // Fetch attendance history
            const { data: attendanceData } = await supabase
                .from('attendance_days')
                .select('*')
                .eq('person_id', employeeData.id)
                .order('date', { ascending: false })
                .limit(20)

            setAttendanceHistory(attendanceData || [])
            setLoading(false)
        }

        fetchData()
    }, [code])

    const handleSaveDetails = async () => {
        if (!code) return

        setSaving(true)
        const result = await updateEmployeeDetails(code, {
            full_name: fullName,
            category_id: categoryId || null,
            registration_date: registrationDate,
            status: status
        })

        if (result.success) {
            router.refresh()
        } else {
            setError(result.error || 'Failed to update')
        }
        setSaving(false)
    }

    const handleSaveMemo = async () => {
        if (!code) return

        setSaving(true)
        const result = await updateEmployeeMemo(code, memo)

        if (result.success) {
            router.refresh()
        } else {
            setError(result.error || 'Failed to update memo')
        }
        setSaving(false)
        setSaving(false)
    }

    const formatForInput = (isoString: string | null) => {
        if (!isoString) return ''
        const date = new Date(isoString)
        const offset = date.getTimezoneOffset() * 60000
        return new Date(date.getTime() - offset).toISOString().slice(0, 16)
    }

    const handleEditClick = (record: any) => {
        setEditingId(record.id)
        setEditForm({
            check_in_at: formatForInput(record.check_in_at),
            check_out_at: formatForInput(record.check_out_at),
            status: record.status,
            admin_note: record.admin_note || ''
        })
    }

    const handleCancelEdit = () => {
        setEditingId(null)
        setEditForm({
            check_in_at: '',
            check_out_at: '',
            status: '',
            admin_note: ''
        })
    }

    const handleSaveAttendance = async (recordId: number) => {
        if (!employee) return

        // Convert local time back to ISO
        const toISO = (localStr: string) => {
            if (!localStr) return null
            return new Date(localStr).toISOString()
        }

        setSaving(true)
        const result = await updateAttendanceRecord(recordId, employee.id, {
            check_in_at: toISO(editForm.check_in_at),
            check_out_at: toISO(editForm.check_out_at),
            break_start_at: null,
            break_end_at: null,
            status: editForm.status,
            admin_note: editForm.admin_note
        })

        if (result.success) {
            // Refresh data
            const supabase = createClient()
            const { data: attendanceData } = await supabase
                .from('attendance_days')
                .select('*')
                .eq('person_id', employee.id)
                .order('date', { ascending: false })
                .limit(20)

            setAttendanceHistory(attendanceData || [])
            setEditingId(null)
            router.refresh()
        } else {
            setError(result.error || 'Failed to update attendance')
        }
        setSaving(false)
    }

    if (loading) {
        return (
            <div className="container mx-auto py-8">
                <div className="text-center py-8 text-muted-foreground">
                    Loading...
                </div>
            </div>
        )
    }

    if (error || !employee) {
        return (
            <div className="container mx-auto py-8">
                <div className="text-center py-8 text-red-500">
                    {error || 'Employee not found'}
                </div>
                <div className="text-center">
                    <Link href="/admin/manage_employee">
                        <Button variant="ghost">← Back to Employees</Button>
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-8">
            <div className="mb-6">
                <Link href="/admin/manage_employee">
                    <Button variant="ghost">← Back to Employees</Button>
                </Link>
            </div>

            <div className="space-y-6">
                {/* Personal Details Section */}
                <Card>
                    <CardHeader>
                        <CardTitle>Personal Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="code">Code</Label>
                                <Input
                                    id="code"
                                    value={code || ''}
                                    disabled
                                    className="bg-muted"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="fullName">Full Name</Label>
                                <Input
                                    id="fullName"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="category">Category</Label>
                                <Select value={categoryId} onValueChange={setCategoryId}>
                                    <SelectTrigger id="category">
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
                            <div className="space-y-2">
                                <Label htmlFor="registrationDate">Registration Date</Label>
                                <Input
                                    id="registrationDate"
                                    type="date"
                                    value={registrationDate}
                                    onChange={(e) => setRegistrationDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="status">Status</Label>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger id="status">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <Button
                                onClick={handleSaveDetails}
                                disabled={saving}
                            >
                                {saving ? 'Saving...' : 'Save Details'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Activity Section */}
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {attendanceHistory.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                No attendance records found
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Check In</TableHead>
                                        <TableHead>Check Out</TableHead>
                                        <TableHead>Work Time</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {attendanceHistory.map((record) => (
                                        <>
                                            <TableRow key={record.id} className={editingId === record.id ? "bg-muted/50 border-b-0" : ""}>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        {new Date(record.date).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric'
                                                        })}
                                                        {record.is_edited && (
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger>
                                                                        <Badge variant="outline" className="h-5 px-1 bg-yellow-500/10 text-yellow-600 border-yellow-200 text-[10px]">
                                                                            Edited
                                                                        </Badge>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>Manually edited by admin</p>
                                                                        {record.admin_note && <p className="text-xs text-muted-foreground mt-1">Note: {record.admin_note}</p>}
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {editingId === record.id ? (
                                                        <Select
                                                            value={editForm.status}
                                                            onValueChange={(val) => setEditForm({ ...editForm, status: val })}
                                                        >
                                                            <SelectTrigger className="w-[100px] h-8">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="present">Present</SelectItem>
                                                                <SelectItem value="absent">Absent</SelectItem>
                                                                <SelectItem value="late">Late</SelectItem>
                                                                <SelectItem value="half_day">Half Day</SelectItem>
                                                                <SelectItem value="off">Off</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    ) : (
                                                        <Badge variant={record.status === 'present' ? 'default' : 'secondary'}>
                                                            {record.status}
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {editingId === record.id ? (
                                                        <Input
                                                            type="datetime-local"
                                                            className="h-8 w-[180px]"
                                                            value={editForm.check_in_at}
                                                            onChange={(e) => setEditForm({ ...editForm, check_in_at: e.target.value })}
                                                        />
                                                    ) : (
                                                        record.check_in_at ? new Date(record.check_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {editingId === record.id ? (
                                                        <Input
                                                            type="datetime-local"
                                                            className="h-8 w-[180px]"
                                                            value={editForm.check_out_at}
                                                            onChange={(e) => setEditForm({ ...editForm, check_out_at: e.target.value })}
                                                        />
                                                    ) : (
                                                        record.check_out_at ? new Date(record.check_out_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {record.total_work_minutes ? `${Math.floor(record.total_work_minutes / 60)}h ${record.total_work_minutes % 60}m` : '-'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {editingId === record.id ? (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                                onClick={() => handleSaveAttendance(record.id)}
                                                                disabled={saving}
                                                            >
                                                                <Save className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                onClick={handleCancelEdit}
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-8 w-8 p-0"
                                                            onClick={() => handleEditClick(record)}
                                                        >
                                                            <Pencil className="h-4 w-4 text-muted-foreground" />
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                            {editingId === record.id && (
                                                <TableRow className="bg-muted/50 border-t-0">
                                                    <TableCell colSpan={6} className="pt-0 pb-4">
                                                        <div className="flex items-center gap-2 px-2">
                                                            <AlertCircle className="h-4 w-4 text-muted-foreground" />
                                                            <Input
                                                                placeholder="Reason for edit (optional)"
                                                                className="h-8 text-sm bg-transparent border-none shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/70"
                                                                value={editForm.admin_note}
                                                                onChange={(e) => setEditForm({ ...editForm, admin_note: e.target.value })}
                                                            />
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* Monthly Attendance Report */}
                <MonthlyReport personId={employee.id} />

                {/* Admin Memo Section */}
                <Card>
                    <CardHeader>
                        <CardTitle>Admin Memo</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="memo">Notes</Label>
                            <Textarea
                                id="memo"
                                value={memo}
                                onChange={(e) => setMemo(e.target.value)}
                                placeholder="Add notes or comments about this employee..."
                                rows={6}
                            />
                        </div>
                        <div className="flex justify-end">
                            <Button
                                onClick={handleSaveMemo}
                                disabled={saving}
                            >
                                {saving ? 'Saving...' : 'Save Memo'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Shift & Task Schedule Section */}
                <Card>
                    <CardHeader>
                        <CardTitle>Shift & Task Schedule</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {employee && <ShiftCalendar personId={employee.id} />}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
