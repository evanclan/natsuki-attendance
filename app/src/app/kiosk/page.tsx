import { PersonList } from '@/components/kiosk/PersonList'
import { ActionLog } from '@/components/kiosk/ActionLog'
import { Button } from '@/components/ui/button'
import { LiveClock } from '@/components/kiosk/LiveClock'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function StudentKioskPage() {
    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 font-sans">
            <header className="px-6 py-4 flex justify-between items-center sticky top-4 z-20 mx-4 mt-4 rounded-3xl bg-white/80 backdrop-blur-md shadow-lg border border-white/50">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-orange-400 rounded-full flex items-center justify-center shadow-inner">
                        <span className="text-2xl">🌻</span>
                    </div>
                    <h1 className="text-2xl font-extrabold text-orange-600 tracking-tight drop-shadow-sm">
                        Happy Garden <span className="text-orange-300 font-bold text-sm ml-1">v.1.0</span>
                    </h1>
                </div>

                <div className="flex items-center gap-4">
                    <LiveClock />
                    <Link href="/kiosk/employee">
                        <Button
                            variant="secondary"
                            className="rounded-full px-6 bg-sky-100 text-sky-700 hover:bg-sky-200 border border-sky-200 font-bold shadow-sm transition-all hover:scale-105 active:scale-95"
                        >
                            Staff Access
                        </Button>
                    </Link>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6">
                <PersonList role="student" />
            </main>

            <footer className="p-4 mx-4 mb-4 rounded-3xl bg-white/60 backdrop-blur-sm border border-white/50 shadow-inner">
                <ActionLog role="student" />
            </footer>
        </div>
    )
}
