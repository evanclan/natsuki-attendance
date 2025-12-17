import { getMonthlyMasterList } from './actions'
import { getLegends } from '@/app/admin/settings/legends/actions'
import { MasterListTable } from '@/components/admin/MasterListTable'

export default async function MasterListPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams
    const now = new Date()
    const year = params.year ? parseInt(params.year as string) : now.getFullYear()
    const month = params.month ? parseInt(params.month as string) : now.getMonth()

    const result = await getMonthlyMasterList(year, month)
    const legendsResult = await getLegends()

    if (!result.success || !result.data) {
        return (
            <div className="p-8 text-red-500">
                Error loading master list: {result.error || 'Unknown error'}
            </div>
        )
    }

    return (
        <div className="container mx-auto py-8 max-w-[95vw]">
            <h1 className="text-3xl font-bold mb-6">Master Shift List</h1>
            <MasterListTable
                year={year}
                month={month}
                people={result.data.people as any}
                shifts={result.data.shifts}
                events={result.data.events}
                attendance={result.data.attendance}
                legends={legendsResult.success && legendsResult.data ? legendsResult.data : []}
            />
        </div>
    )
}
