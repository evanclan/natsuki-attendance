import { getPeople } from '@/app/actions/kiosk'
import { ActionLog } from '@/components/kiosk/ActionLog'
import { StudentKioskClient } from '@/components/kiosk/StudentKioskClient'

export const dynamic = 'force-dynamic'

export default async function StudentKioskPage() {
    const people = await getPeople('student')

    return (
        <StudentKioskClient
            initialPeople={people}
            actionLog={<ActionLog role="student" />}
        />
    )
}
