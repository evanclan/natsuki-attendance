
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
    const type = (params.type as string) || 'employees' // 'employees' | 'students' | 'satursaurus'

    const result = await getAllEmployeesAttendance(year, month)

    if (!result.success || !result.data) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-red-500">Error loading data: {result.error}</div>
            </div>
        )
    }

    let peopleToPrint = result.data.employees
    let days = Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) => i + 1)

    if (type === 'students') {
        // Filter students logic matching MasterList and AllListTable
        peopleToPrint = result.data.students.filter((p: any) => {
            // Hide students with ONLY the "Satasaurus" category
            // Students with multiple categories (e.g., Academy + Satasaurus) should still be shown
            const categories = p.categories || []
            if (categories.length === 1 && categories[0]?.name?.toLowerCase() === 'satursaurus') {
                return false
            }
            return true
        })
    } else if (type === 'satursaurus') {
        peopleToPrint = result.data.students.filter((p: any) => {
            const categories = p.categories || []
            return categories.some((c: any) => c?.name?.toLowerCase() === 'satursaurus')
        })

        // Filter days for Satursaurus (Saturdays only)
        days = days.filter(day => {
            const date = new Date(year, month, day)
            return date.getDay() === 6
        })
    }

    // Sort logic is already handled in getAllEmployeesAttendance actions

    return (
        <div className="min-h-screen bg-white">
            <PrintTrigger />
            <AllListPrintComponent
                year={year}
                month={month}
                employees={peopleToPrint}
                days={days}
                shifts={result.data.shifts}
                events={result.data.events}
                attendance={result.data.attendance}
                type={type}
            />
        </div>
    )
}
