import { getPeople } from '@/app/actions/kiosk'
import { PersonCard } from './PersonCard'

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
        <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4">
            {people.map((person) => (
                <PersonCard key={person.id} person={person} role={role} />
            ))}
        </div>
    )
}
