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
import { AddPersonDialog } from "@/components/admin/AddPersonDialog"
import { Trash2 } from 'lucide-react'
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

export default function ManageStudentPage() {
    const [students, setStudents] = useState<any[]>([])
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchStudents = async () => {
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
            .eq('role', 'student')
            .order('full_name', { ascending: true })

        if (fetchError) {
            setError(fetchError.message)
            setLoading(false)
            return
        }

        setStudents(data || [])
        setLoading(false)
    }

    useEffect(() => {
        fetchStudents()
    }, [])

    if (error) {
        return <div className="p-8 text-red-500">Error loading data: {error}</div>
    }

    const handleDelete = async (id: string) => {
        const result = await deletePerson(id)
        if (result.success) {
            fetchStudents()
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
                <AddPersonDialog role="student" onSuccess={fetchStudents} />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Manage Students</CardTitle>
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
                                {students?.map((student) => (
                                    <TableRow
                                        key={student.id}
                                        className="cursor-pointer hover:bg-muted/50"
                                    >
                                        <TableCell className="font-medium">
                                            <Link
                                                href={`/admin/manage_student/${student.code}`}
                                                className="block w-full"
                                            >
                                                {student.code || '-'}
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <Link
                                                href={`/admin/manage_student/${student.code}`}
                                                className="block w-full"
                                            >
                                                {student.full_name}
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <Link
                                                href={`/admin/manage_student/${student.code}`}
                                                className="block w-full"
                                            >
                                                {student.categories?.name || '-'}
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <Link
                                                href={`/admin/manage_student/${student.code}`}
                                                className="block w-full"
                                            >
                                                {student.registration_date ? new Date(student.registration_date).toLocaleDateString() : '-'}
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <Link
                                                href={`/admin/manage_student/${student.code}`}
                                                className="block w-full"
                                            >
                                                <Badge variant={student.status === 'active' ? 'default' : 'secondary'}>
                                                    {student.status}
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
                                                            This action cannot be undone. This will permanently delete {student.full_name} and all their data.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            className="bg-red-600 hover:bg-red-700"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleDelete(student.id)
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
                                {students?.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            No students found.
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
