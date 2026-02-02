'use client'

import { useState, useEffect } from 'react'
import { Person } from '@/app/actions/kiosk'
import { MultiSelectPersonList } from './MultiSelectPersonList'
import { Button } from '@/components/ui/button'
import { LiveClock } from '@/components/kiosk/LiveClock'
import { NewsCorner } from '@/components/kiosk/NewsCorner'
import Link from 'next/link'
import { ToggleLeft, ToggleRight } from 'lucide-react'

interface StudentKioskClientProps {
    initialPeople: Person[]
    actionLog: React.ReactNode
}

const REGULAR_CATEGORIES = ['Academy', 'Ex', 'C-Lab']

export function StudentKioskClient({ initialPeople, actionLog }: StudentKioskClientProps) {
    const [showSatasaurus, setShowSatasaurus] = useState(false)
    const [people, setPeople] = useState<Person[]>(initialPeople)

    // Sync state when props update (e.g. from router.refresh)
    useEffect(() => {
        setPeople(initialPeople)
    }, [initialPeople])

    const updatePerson = (personId: string, updates: Partial<Person['attendance_today']>) => {
        setPeople(current => current.map(p => {
            if (p.id !== personId) return p

            // If p.attendance_today is null and we have updates, create object
            // Use current state to preserve non-updated fields if exists
            const currentAttendance = p.attendance_today || {
                check_in_at: null,
                check_out_at: null,
                break_start_at: null,
                break_end_at: null,
                status: 'present'
            }

            return {
                ...p,
                attendance_today: {
                    ...currentAttendance,
                    ...updates
                }
            }
        }))
    }

    // Determine visible categories based on toggle
    const visibleCategories = showSatasaurus
        ? ['Satursaurus']
        : REGULAR_CATEGORIES

    // Filter people based on toggle
    const visiblePeople = people.filter(person => {
        // Person is visible if they have AT LEAST ONE of the visible categories
        // OR if they have NO categories (render in "Other") - but only for regular mode?
        // Let's stick to the visibleCategories intersection logic.
        // If a person has ['Academy', 'Satasaurus']:
        // - Regular mode (Academy visible): Visible.
        // - Satasaurus mode (Satasaurus visible): Visible.

        const hasVisibleCategory = person.categories.some(cat => visibleCategories.includes(cat))

        // If strict filtering is desired (e.g. don't show "Other" in regular mode), this logic works.
        // However, "Other" people usually have empty categories or non-standard ones.
        // If we want to show 'Other' people in Regular mode, we should allow them.
        // If showSatasaurus is true, we ONLY show Satasaurus.

        if (showSatasaurus) {
            return hasVisibleCategory
        } else {
            // In regular mode, show if they have a regular category OR no categories (likely 'Other')
            // But we must NOT show if they ONLY have Satasaurus.

            // Actually, simplest is:
            // exclude if their ONLY category is Satasaurus?
            // "visibleCategories" logic handles intersection well.
            // If I have NO categories, hasVisibleCategory is false.
            // But I want "Other" people to show up in default mode.

            if (person.categories.length === 0) return true

            // If they have standard categories, check intersection
            if (hasVisibleCategory) return true

            // If they have weird categories not in our lists? Show in "Other" (Regular mode)
            // But if they are "Satasaurus" ONLY, we shouldn't show them.
            // So: if they have 'Satasaurus' but NO regular categories, hide them.

            const isOnlySatasaurus = person.categories.length === 1 && person.categories[0] === 'Satursaurus'
            if (isOnlySatasaurus) return false

            // What if they are ['Satasaurus', 'SomeOther']?
            // If 'SomeOther' is not in REGULAR, they might go to 'Other'.
            // Let's stick to the intersection logic combined with "allow others in regular".

            // If they match a visible category, show them.
            if (hasVisibleCategory) return true

            // If they DON'T match a visible category:
            // If we are in Regular mode, we usually allow "Other".
            // So return true?
            // Except for the Satasaurus-only case we just handled implicitly?
            // If visibleCategories=['Academy', 'Ex'].
            // Person=['Satasaurus']. hasVisible=false. Returns true? No, that would show them.

            // Let's refine:
            // showSatasaurus=true: Strict. Must have 'Satasaurus'.
            // showSatasaurus=false: Hide 'Satasaurus'?
            // Logic:
            // return !person.categories.includes('Satasaurus')
            // This was the OLD logic. It failed for dual categories ['Academy', 'Satasaurus'].

            // New Logic for Regular Mode:
            // Show if:
            // 1. Has a Regular Category
            // OR
            // 2. Has NO 'Satasaurus' category (pure 'Other')

            const hasSatasaurus = person.categories.includes('Satursaurus')
            if (hasVisibleCategory) return true

            // If no visible category matches (e.g. empty, or 'Satasaurus' only, or 'Random')
            // If they have Satasaurus, and we didn't match a visible category (meaning no Academy etc),
            // then they are "Satasaurus Only" (or Satasaurus+Random). Hide them.
            if (hasSatasaurus) return false

            // Otherwise (Empty or Random), show in Other.
            return true
        }
    })

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

            <main className="flex-1 overflow-y-auto p-2 md:p-6 pt-0">
                <div className="flex justify-end mb-2 px-1 items-center gap-3">
                    <span className="text-sm font-bold text-gray-600 bg-white/80 px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
                        現在人数: {people.filter(p =>
                            p.attendance_today?.check_in_at && !p.attendance_today?.check_out_at
                        ).length}
                    </span>
                    {/* Toggle Button moved here */}
                    <Button
                        variant={showSatasaurus ? "default" : "outline"}
                        onClick={() => setShowSatasaurus(!showSatasaurus)}
                        className={`rounded-full px-3 font-bold shadow-sm transition-all hover:scale-105 active:scale-95 text-xs h-7 border ${showSatasaurus
                            ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                            }`}
                    >
                        {showSatasaurus ? (
                            <>
                                <ToggleRight className="mr-1 h-3 w-3" />
                                Satursaurus
                            </>
                        ) : (
                            <>
                                <ToggleLeft className="mr-1 h-3 w-3" />
                                Regular Class
                            </>
                        )}
                    </Button>
                </div>
                {visiblePeople.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        No students found.
                    </div>
                ) : (
                    <MultiSelectPersonList
                        people={visiblePeople}
                        role="student"
                        visibleCategories={visibleCategories}
                        onPersonUpdate={updatePerson}
                    />
                )}
            </main>

            <footer className="p-4 mx-4 mb-4 rounded-3xl bg-white/60 backdrop-blur-sm border border-white/50 shadow-inner">
                {actionLog}
            </footer>
        </div >
    )
}
