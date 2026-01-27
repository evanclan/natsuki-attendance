
import { getAllEmployeesAttendance } from '@/app/admin/all_list/actions'
import { AllListPrintComponent } from '@/components/admin/AllListPrintComponent'
import PrintTrigger from './PrintTrigger'

export default async function PrintAllListPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams
    const now = new Date()

    // Default to current year/month if not specified, matching generic logic
    const defaultYear = now.getFullYear()
    const defaultMonth = now.getMonth()

    const year = params.year ? parseInt(params.year as string) : defaultYear
    const month = params.month ? parseInt(params.month as string) : defaultMonth

    const result = await getAllEmployeesAttendance(year, month)

    if (!result.success || !result.data) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-red-500">Error loading data: {result.error}</div>
            </div>
        )
    }

    const days = Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) => i + 1)

    // Sort logic is already handled in getAllEmployeesAttendance actions

    return (
        <div className="min-h-screen bg-white">
            <PrintTrigger />
            <AllListPrintComponent
                year={year}
                month={month}
                employees={result.data.employees}
                days={days}
                shifts={result.data.shifts}
                events={result.data.events}
                attendance={result.data.attendance}
            />
        </div>
    )
}
