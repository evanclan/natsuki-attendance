'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { MonthlyReport } from '@/components/admin/MonthlyReport'
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, Printer, ChevronLeft, ChevronRight, CheckCircle2, Loader2 } from "lucide-react"
import Link from 'next/link'

export default function PrintAllPage() {
    const [date, setDate] = useState<Date>(new Date())
    const [employees, setEmployees] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [loadedCount, setLoadedCount] = useState(0)

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
                setLoadedCount(0)
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
        setLoadedCount(0)
    }

    const prevMonth = () => {
        setDate(new Date(date.getFullYear(), date.getMonth() - 1, 1))
        setLoadedCount(0)
    }

    const handleReportLoaded = useCallback(() => {
        setLoadedCount(prev => prev + 1)
    }, [])

    const totalEmployees = employees.length
    const progress = totalEmployees > 0 ? (loadedCount / totalEmployees) * 100 : 0
    const isReady = totalEmployees > 0 && loadedCount >= totalEmployees

    return (
        <div className="container mx-auto py-8 print:p-0 print:max-w-none w-full">
            {/* Controls - Hidden in Print */}
            <div className="flex flex-col gap-6 mb-8 print:hidden bg-background sticky top-0 z-10 py-4 border-b">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/manage_employee">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold">Batch Print Monthly Reports</h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                {isReady
                                    ? <span className="text-green-600 font-medium flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> All {totalEmployees} reports loaded and ready to print</span>
                                    : <span className="text-amber-600 font-medium flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Loading reports ({loadedCount}/{totalEmployees})...</span>
                                }
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg">
                            <Button variant="ghost" size="icon" onClick={prevMonth} disabled={!isReady}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="font-medium min-w-[140px] text-center">
                                {date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </span>
                            <Button variant="ghost" size="icon" onClick={nextMonth} disabled={!isReady}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>

                        <Button onClick={handlePrint} className="gap-2" disabled={!isReady}>
                            {isReady ? <Printer className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}
                            {isReady ? 'Print All Reports' : 'Generating...'}
                        </Button>
                    </div>
                </div>

                {!isReady && (
                    <div className="w-full space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Progress</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                    </div>
                )}
            </div>

            {loading ? (
                <div className="text-center py-12">Loading employees list...</div>
            ) : (
                <div id="print-all-container" className="space-y-8 print:space-y-0 block w-full">
                    {/* Render reports but maybe hide them visually until ready? Or just show them loading. User said 'rendering all the files'. */}
                    {employees.map((emp) => (
                        <div key={emp.id} className="print:block w-full" style={{ pageBreakAfter: 'always', breakAfter: 'page' }}>
                            <div className="print:pt-4 w-full">
                                <MonthlyReport
                                    personId={emp.id}
                                    initialDate={date}
                                    mode="batch"
                                    onLoadComplete={handleReportLoaded}
                                />
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
