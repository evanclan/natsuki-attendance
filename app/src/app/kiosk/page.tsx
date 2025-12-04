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
            <header className="px-3 py-2 md:px-6 md:py-4 flex flex-nowrap justify-between items-center sticky top-2 md:top-4 z-20 mx-2 md:mx-4 mt-2 md:mt-4 mb-4 md:mb-6 rounded-3xl bg-white/80 backdrop-blur-md shadow-lg border border-white/50 gap-2">
                <div className="flex items-center gap-2 shrink-0">
                    <img
                        src="/images/happy_island_logo_v4.jpg"
                        alt="Happy Island Logo"
                        className="h-14 w-14 md:h-20 md:w-20 rounded-full object-contain bg-white shadow-lg border-2 md:border-4 border-white ring-1 md:ring-2 ring-orange-200"
                    />
                    <div className="flex flex-col justify-center h-14 md:h-16">
                        <h1 className="text-lg md:text-2xl font-black text-orange-500 tracking-wide leading-none drop-shadow-sm font-comic whitespace-nowrap">
                            HAPPY
                        </h1>
                        <h1 className="text-lg md:text-2xl font-black text-sky-500 tracking-wide leading-none drop-shadow-sm font-comic whitespace-nowrap">
                            ISLAND
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2 md:gap-4 shrink-0">
                    <LiveClock />
                    <Link href="/kiosk/employee">
                        <Button
                            variant="secondary"
                            className="rounded-full px-3 md:px-6 bg-sky-100 text-sky-700 hover:bg-sky-200 border border-sky-200 font-bold shadow-sm transition-all hover:scale-105 active:scale-95 text-xs md:text-sm h-8 md:h-10"
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
