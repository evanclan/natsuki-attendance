import { getPeople, Person } from '@/app/actions/kiosk'
import { MultiSelectPersonList } from './MultiSelectPersonList'

export async function PersonList({ role }: { role: 'student' | 'employee' }) {
    const people = await getPeople(role)

    if (people.length === 0) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                No {role}s found.
            </div>
        )
    }

    return (
        <MultiSelectPersonList people={people} role={role} />
    )
}
