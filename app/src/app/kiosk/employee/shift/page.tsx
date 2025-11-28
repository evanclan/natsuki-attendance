'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { ShiftCalendar } from '@/components/admin/ShiftCalendar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function EmployeeShiftViewPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const employeeId = searchParams?.get('id')

    const [employee, setEmployee] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchEmployee = async () => {
            if (!employeeId) {
                setError('No employee ID provided')
                setLoading(false)
                return
            }

            setLoading(true)
            const supabase = createClient()

            const { data, error: fetchError } = await supabase
                .from('people')
                .select('id, full_name, code, role')
                .eq('id', employeeId)
                .eq('role', 'employee')
                .single()

            if (fetchError || !data) {
                setError('Employee not found')
                setLoading(false)
                return
            }

            setEmployee(data)
            setLoading(false)
        }

        fetchEmployee()
    }, [employeeId])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800 mx-auto"></div>
                    <p className="mt-4 text-slate-600">Loading...</p>
                </div>
            </div>
        )
    }

    if (error || !employee) {
        return (
            <div className="min-h-screen flex flex-col bg-slate-100">
                <header className="bg-white shadow p-4">
                    <div className="max-w-7xl mx-auto flex items-center gap-4">
                        <Link href="/kiosk/employee">
                            <Button variant="outline" size="sm">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Kiosk
                            </Button>
                        </Link>
                        <h1 className="text-2xl font-bold text-slate-800">Shift View</h1>
                    </div>
                </header>
                <main className="flex-1 flex items-center justify-center p-4">
                    <Card className="max-w-md w-full">
                        <CardHeader>
                            <CardTitle className="text-red-600">Error</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-slate-600 mb-4">{error}</p>
                            <Link href="/kiosk/employee">
                                <Button className="w-full">
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Return to Kiosk
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </main>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col bg-slate-100">
            <header className="bg-white shadow p-4 sticky top-0 z-20">
                <div className="max-w-7xl mx-auto flex items-center gap-4">
                    <Link href="/kiosk/employee">
                        <Button variant="outline" size="sm">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Kiosk
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Shift Schedule</h1>
                        <p className="text-sm text-slate-600">
                            {employee.full_name} ({employee.code})
                        </p>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4">
                <div className="max-w-7xl mx-auto">
                    <Card>
                        <CardHeader>
                            <CardTitle>Monthly Schedule</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ShiftCalendar personId={employee.id} readOnly={true} />
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    )
}
