'use client'

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
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AddPersonDialog } from "@/components/admin/AddPersonDialog"
import { Trash2, Printer, AlertTriangle, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { deletePerson } from "@/app/actions/people"

export default function ManageEmployeePage() {
    const router = useRouter()
    const [employees, setEmployees] = useState<any[]>([])
    const [filteredEmployees, setFilteredEmployees] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    // Delete confirmation state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [employeeToDelete, setEmployeeToDelete] = useState<any | null>(null)
    const [confirmationText, setConfirmationText] = useState('')
    const [isDeleting, setIsDeleting] = useState(false)

    const fetchEmployees = async () => {
        setLoading(true)
        const supabase = createClient()

        const { data, error: fetchError } = await supabase
            .from('people')
            .select(`
                *,
                categories (
                    name
                )
            `)
            .eq('role', 'employee')
            .order('full_name', { ascending: true })

        if (fetchError) {
            setError(fetchError.message)
            setLoading(false)
            return
        }

        setEmployees(data || [])
        setFilteredEmployees(data || [])
        setLoading(false)
    }

    useEffect(() => {
        const filtered = employees.filter(employee =>
            employee.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (employee.code && employee.code.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        setFilteredEmployees(filtered)
    }, [searchQuery, employees])

    useEffect(() => {
        fetchEmployees()
    }, [])

    if (error) {
        return <div className="p-8 text-red-500">Error loading data: {error}</div>
    }

    const openDeleteDialog = (employee: any) => {
        setEmployeeToDelete(employee)
        setConfirmationText('')
        setDeleteDialogOpen(true)
    }

    const handleDelete = async () => {
        if (!employeeToDelete) return

        setIsDeleting(true)
        const result = await deletePerson(employeeToDelete.id)
        setIsDeleting(false)

        if (result.success) {
            setDeleteDialogOpen(false)
            setEmployeeToDelete(null)
            setConfirmationText('')
            fetchEmployees()
        } else {
            setError(result.error || 'Failed to delete')
        }
    }

    const requiredConfirmation = employeeToDelete
        ? `DELETE ${employeeToDelete.full_name}`
        : ''
    const isConfirmationValid = confirmationText === requiredConfirmation

    return (
        <div className="container mx-auto py-8">
            <div className="mb-6 flex justify-between items-center">
                <Link href="/admin">
                    <Button variant="ghost">← Back to Admin</Button>
                </Link>
                <div className="flex gap-2">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" className="gap-2">
                                <Printer className="h-4 w-4" />
                                Download Reports
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Download Monthly Reports?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will open a print-ready view for all employees' monthly attendance reports.
                                    You can print or save as PDF from that page.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => router.push('/admin/manage_employee/print_all')}>
                                    Continue
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <AddPersonDialog role="employee" onSuccess={fetchEmployees} />
                </div>
            </div>

            <div className="flex items-center space-x-2 mb-4">
                <Input
                    placeholder="Search employees..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-sm"
                />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Manage Employees</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Loading...
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Full Name</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Registration Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredEmployees?.map((employee) => (
                                    <TableRow
                                        key={employee.id}
                                        className="cursor-pointer hover:bg-muted/50"
                                    >
                                        <TableCell className="font-medium">
                                            <Link
                                                href={`/admin/manage_employee/${employee.code}`}
                                                className="block w-full"
                                            >
                                                {employee.code || '-'}
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <Link
                                                href={`/admin/manage_employee/${employee.code}`}
                                                className="block w-full"
                                            >
                                                {employee.full_name}
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <Link
                                                href={`/admin/manage_employee/${employee.code}`}
                                                className="block w-full"
                                            >
                                                {employee.categories?.name || '-'}
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <Link
                                                href={`/admin/manage_employee/${employee.code}`}
                                                className="block w-full"
                                            >
                                                {employee.registration_date ? new Date(employee.registration_date).toLocaleDateString() : '-'}
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <Link
                                                href={`/admin/manage_employee/${employee.code}`}
                                                className="block w-full"
                                            >
                                                <Badge variant={employee.status === 'active' ? 'default' : 'secondary'}>
                                                    {employee.status}
                                                </Badge>
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-red-600"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    e.preventDefault()
                                                    openDeleteDialog(employee)
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {filteredEmployees?.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            No employees found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={(open) => {
                if (!isDeleting) {
                    setDeleteDialogOpen(open)
                    if (!open) {
                        setEmployeeToDelete(null)
                        setConfirmationText('')
                    }
                }
            }}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="h-5 w-5" />
                            Permanently Delete Employee
                        </DialogTitle>
                        <DialogDescription className="pt-2 space-y-3">
                            <span className="block">
                                You are about to <strong className="text-red-600">permanently delete</strong>{' '}
                                <strong>{employeeToDelete?.full_name}</strong> ({employeeToDelete?.code}).
                            </span>
                            <span className="block text-red-600 font-medium">
                                This will remove ALL data associated with this employee including:
                            </span>
                            <span className="block text-sm">
                                • All attendance records (check-in/check-out history)<br />
                                • All shift schedules<br />
                                • Status history<br />
                                • Category assignments<br />
                                • Monthly memos<br />
                                • All other associated data
                            </span>
                            <span className="block font-semibold text-destructive">
                                ⚠️ This action is IRREVERSIBLE. There is no way to recover the data.
                            </span>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        <Label htmlFor="delete-confirmation" className="text-sm">
                            To confirm, type{' '}
                            <code className="px-1.5 py-0.5 bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 rounded text-xs font-bold">
                                DELETE {employeeToDelete?.full_name}
                            </code>{' '}
                            below:
                        </Label>
                        <Input
                            id="delete-confirmation"
                            value={confirmationText}
                            onChange={(e) => setConfirmationText(e.target.value)}
                            placeholder={`DELETE ${employeeToDelete?.full_name || ''}`}
                            className="font-mono"
                            disabled={isDeleting}
                            autoComplete="off"
                        />
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setDeleteDialogOpen(false)
                                setEmployeeToDelete(null)
                                setConfirmationText('')
                            }}
                            disabled={isDeleting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={!isConfirmationValid || isDeleting}
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                'Permanently Delete'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
