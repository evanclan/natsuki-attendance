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
import { Trash2, Printer } from 'lucide-react'
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
import { deletePerson } from "@/app/actions/people"

export default function ManageEmployeePage() {
    const router = useRouter()
    const [employees, setEmployees] = useState<any[]>([])
    const [filteredEmployees, setFilteredEmployees] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

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

    const handleDelete = async (id: string) => {
        const result = await deletePerson(id)
        if (result.success) {
            fetchEmployees()
        } else {
            setError(result.error || 'Failed to delete')
        }
    }

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
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-red-600"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you really sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This action cannot be undone. This will permanently delete {employee.full_name} and all their data.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            className="bg-red-600 hover:bg-red-700"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleDelete(employee.id)
                                                            }}
                                                        >
                                                            Delete
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
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
        </div>
    )
}
