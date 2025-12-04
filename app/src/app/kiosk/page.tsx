import { PersonList } from '@/components/kiosk/PersonList'
import { ActionLog } from '@/components/kiosk/ActionLog'
import { Button } from '@/components/ui/button'
import { LiveClock } from '@/components/kiosk/LiveClock'
import { NewsCorner } from '@/components/kiosk/NewsCorner'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function StudentKioskPage() {
    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 font-sans">
            <header className="px-6 py-4 flex justify-between items-center sticky top-4 z-20 mx-4 mt-4 mb-6 rounded-3xl bg-white/80 backdrop-blur-md shadow-lg border border-white/50">
                <div className="flex items-center gap-2">
                    <img
                        src="/images/happy_island_logo_v4.jpg"
                        alt="Happy Island Logo"
                        className="h-20 w-20 rounded-full object-contain bg-white shadow-lg border-4 border-white ring-2 ring-orange-200"
                    />
                    <div className="flex flex-col justify-center h-16">
                        <h1 className="text-2xl font-black text-orange-500 tracking-wide leading-none drop-shadow-sm font-comic">
                            HAPPY
                        </h1>
                        <h1 className="text-2xl font-black text-sky-500 tracking-wide leading-none drop-shadow-sm font-comic">
                            ISLAND
                        </h1>
                    </div>
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
            </header >

            <NewsCorner />

            <main className="flex-1 overflow-y-auto p-6 pt-0">
                <PersonList role="student" />
            </main>

            <footer className="p-4 mx-4 mb-4 rounded-3xl bg-white/60 backdrop-blur-sm border border-white/50 shadow-inner">
                <ActionLog role="student" />
            </footer>
        </div >
    )
}
