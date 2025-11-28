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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function ManageEmployeePage() {
    const [employees, setEmployees] = useState<any[]>([])
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
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
            setLoading(false)
        }

        fetchEmployees()
    }, [])

    if (error) {
        return <div className="p-8 text-red-500">Error loading data: {error}</div>
    }

    return (
        <div className="container mx-auto py-8">
            <div className="mb-6">
                <Link href="/admin">
                    <Button variant="ghost">← Back to Admin</Button>
                </Link>
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
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {employees?.map((employee) => (
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
                                    </TableRow>
                                ))}
                                {employees?.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
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
