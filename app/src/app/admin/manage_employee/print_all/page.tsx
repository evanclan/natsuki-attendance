'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { MonthlyReport } from '@/components/admin/MonthlyReport'
import { Button } from "@/components/ui/button"
import { ArrowLeft, Printer, ChevronLeft, ChevronRight } from "lucide-react"
import Link from 'next/link'

export default function PrintAllPage() {
    const [date, setDate] = useState<Date>(new Date())
    const [employees, setEmployees] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchEmployees = async () => {
            setLoading(true)
            const supabase = createClient()

            const { data, error } = await supabase
                .from('people')
                .select('id, full_name, code')
                .eq('role', 'employee')
                .eq('status', 'active') // Only active employees usually? Or maybe all? User said "all the employees". Usually means active on the list.
                .order('code', { ascending: true }) // Order by code is usually better for reports

            if (!error && data) {
                setEmployees(data)
            }
            setLoading(false)
        }

        fetchEmployees()
    }, [])

    const handlePrint = () => {
        window.print()
    }

    const nextMonth = () => {
        setDate(new Date(date.getFullYear(), date.getMonth() + 1, 1))
    }

    const prevMonth = () => {
        setDate(new Date(date.getFullYear(), date.getMonth() - 1, 1))
    }

    return (
        <div className="container mx-auto py-8 print:p-0 print:max-w-none w-full">
            {/* Controls - Hidden in Print */}
            <div className="flex justify-between items-center mb-8 print:hidden bg-background sticky top-0 z-10 py-4 border-b">
                <div className="flex items-center gap-4">
                    <Link href="/admin/manage_employee">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold">Batch Print Monthly Reports</h1>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg">
                        <Button variant="ghost" size="icon" onClick={prevMonth}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="font-medium min-w-[140px] text-center">
                            {date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </span>
                        <Button variant="ghost" size="icon" onClick={nextMonth}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    <Button onClick={handlePrint} className="gap-2">
                        <Printer className="h-4 w-4" />
                        Print All Reports
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12">Loading employees...</div>
            ) : (
                <div id="print-all-container" className="space-y-8 print:space-y-0 block w-full">
                    {employees.map((emp) => (
                        <div key={emp.id} className="print:block w-full" style={{ pageBreakAfter: 'always', breakAfter: 'page' }}>
                            <div className="print:pt-4 w-full">
                                <MonthlyReport personId={emp.id} initialDate={date} mode="batch" />
                            </div>
                        </div>
                    ))}
                    {employees.length === 0 && (
                        <div className="text-center text-muted-foreground">No active employees found.</div>
                    )}
                </div>
            )}
        </div>
    )
}
