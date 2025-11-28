import { PersonList } from '@/components/kiosk/PersonList'
import { ActionLog } from '@/components/kiosk/ActionLog'
import { Button } from '@/components/ui/button'
import { LiveClock } from '@/components/kiosk/LiveClock'
import { ViewShiftButton } from '@/components/kiosk/ViewShiftButton'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function EmployeeKioskPage() {
    return (
        <div className="min-h-screen flex flex-col bg-slate-100">
            <header className="bg-white shadow p-4 flex justify-between items-center sticky top-0 z-10 gap-4">
                <h1 className="text-2xl font-bold text-slate-800">Employee Kiosk</h1>
                <LiveClock />
                <Link href="/kiosk">
                    <Button variant="secondary">Go to Student Kiosk</Button>
                </Link>
            </header>

            <main className="flex-1 overflow-y-auto p-4">
                <PersonList role="employee" />
            </main>

            <footer className="p-4 bg-white border-t sticky bottom-0 z-10 shadow-inner">
                <ActionLog role="employee" />
            </footer>

            <ViewShiftButton />
        </div>
    )
}
