
import { getMonthlyMasterList } from '@/app/admin/masterlist/actions'
import { StudentMasterListPrintComponent } from '@/components/admin/StudentMasterListPrintComponent'
import PrintTrigger from '@/app/print/masterlist/PrintTrigger'

export default async function PrintStudentMasterListPage({
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

    if (!result.success || !result.data) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-red-500">Error loading master list: {result.error}</div>
            </div>
        )
    }

    const days = Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) => i + 1)

    // Filter for students based on role
    // Assuming 'student' role. Also maybe need to filter out 'Satursaurus' if intended? 
    // The user didn't specify excluding Satursaurus for the PRINT table of STUDENTS. 
    // Usually "Student Table" in Admin implies all students or the main student list. 
    // In `MasterListTable`, 'students' excludes simple Satursaurus. Satursaurus are separate.
    // I should check `MasterListTable` logic again.
    // Step 21: line 576
    // Students -> role === 'student' && !(categories.length === 1 && name === 'satursaurus')

    const allStudents = (result.data.people as any[]).filter(p => p.role === 'student');

    // Apply same logic as MasterListTable to separate regular students who might be printed here?
    // User request: "I want also a "Print Table" button on the Student table."
    // This implies printing the content of that table. 
    // That table excludes "Satursaurus only" students.
    // So I should filter them out too.

    const studentsToPrint = allStudents.filter(p => {
        const categories = p.categories || []
        if (categories.length === 1 && categories[0]?.name?.toLowerCase() === 'satursaurus') {
            return false
        }
        return true
    })

    return (
        <div className="min-h-screen bg-white">
            <PrintTrigger />
            <StudentMasterListPrintComponent
                year={year}
                month={month}
                students={studentsToPrint}
                days={days}
                shifts={result.data.shifts}
                events={result.data.events}
                attendance={result.data.attendance}
            />
        </div>
    )
}
