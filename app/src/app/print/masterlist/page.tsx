
import { getMonthlyMasterList } from '@/app/admin/masterlist/actions'
import { getLegends } from '@/app/admin/settings/legends/actions'
import { MasterListPrintComponent } from '@/components/admin/MasterListPrintComponent'
import { redirect } from 'next/navigation'
import PrintTrigger from './PrintTrigger'

export default async function PrintMasterListPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams
    const now = new Date()
    // Default logic matching the main page
    const nextMonth = now.getMonth() + 1
    const defaultYear = nextMonth > 11 ? now.getFullYear() + 1 : now.getFullYear()
    const defaultMonth = nextMonth > 11 ? 0 : nextMonth

    const year = params.year ? parseInt(params.year as string) : defaultYear
    const month = params.month ? parseInt(params.month as string) : defaultMonth

    const result = await getMonthlyMasterList(year, month)
    const legendsResult = await getLegends()

    if (!result.success || !result.data) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-red-500">Error loading master list: {result.error}</div>
            </div>
        )
    }

    const days = Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) => i + 1)

    return (
        <div className="min-h-screen bg-white">
            <PrintTrigger />
            <MasterListPrintComponent
                year={year}
                month={month}
                employees={(result.data.people as any[]).filter(p => p.role === 'employee')}
                days={days}
                shifts={result.data.shifts}
                events={result.data.events}
                attendance={result.data.attendance}
                legends={legendsResult.success && legendsResult.data ? legendsResult.data : []}
            />
        </div>
    )
}
