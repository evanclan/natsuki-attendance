import { getAllEmployeesAttendance } from './actions'
import { AllListTable } from '@/components/admin/AllListTable'

export default async function AllListPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams
    const now = new Date()
    const year = params.year ? parseInt(params.year as string) : now.getFullYear()
    const month = params.month ? parseInt(params.month as string) : now.getMonth()

    const result = await getAllEmployeesAttendance(year, month)

    if (!result.success || !result.data) {
        return (
            <div className="p-8 text-red-500">
                Error loading all list: {result.error || 'Unknown error'}
            </div>
        )
    }

    return (
        <div className="container mx-auto py-8 max-w-[95vw]">
            <h1 className="text-3xl font-bold mb-6">All List - Raw Attendance</h1>
            <AllListTable
                year={year}
                month={month}
                employees={result.data.employees}
                attendance={result.data.attendance}
                events={result.data.events}
            />
        </div>
    )
}
