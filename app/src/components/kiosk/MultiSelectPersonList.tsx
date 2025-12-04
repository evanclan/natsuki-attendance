'use client'

import { useState } from 'react'
import { Person, bulkCheckIn } from '@/app/actions/kiosk'
import { PersonCard } from './PersonCard'
import { Button } from '@/components/ui/button'
import { CheckSquare, Loader2, Square, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'

const CATEGORY_ORDER = ['Academy', 'Ex', 'C-Lab', 'Satasaurus']

interface MultiSelectPersonListProps {
    people: Person[]
    role: 'student' | 'employee'
}

export function MultiSelectPersonList({ people, role }: MultiSelectPersonListProps) {
    const router = useRouter()
    const [isSelectionMode, setIsSelectionMode] = useState(false)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Group people by category
    const groupedPeople: Record<string, Person[]> = {}
    const otherPeople: Person[] = []

    people.forEach((person) => {
        if (person.category && CATEGORY_ORDER.includes(person.category)) {
            if (!groupedPeople[person.category]) {
                groupedPeople[person.category] = []
            }
            groupedPeople[person.category].push(person)
        } else {
            otherPeople.push(person)
        }
    })

    const toggleSelectionMode = () => {
        setIsSelectionMode(!isSelectionMode)
        setSelectedIds(new Set())
    }

    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedIds)
        if (newSelected.has(id)) {
            newSelected.delete(id)
        } else {
            newSelected.add(id)
        }
        setSelectedIds(newSelected)
    }

    const handleBulkCheckIn = async () => {
        if (selectedIds.size === 0) return
        if (!confirm(`Check in ${selectedIds.size} students?`)) return

        setIsSubmitting(true)
        try {
            const result = await bulkCheckIn(Array.from(selectedIds))
            if (result.success) {
                setIsSelectionMode(false)
                setSelectedIds(new Set())
                router.refresh()
            } else {
                alert('Some check-ins failed. Please check the console for details.')
            }
        } catch (error) {
            console.error(error)
            alert('An error occurred during bulk check-in')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="space-y-8 p-4 animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
            {/* Floating Action Button for Selection Mode */}
            <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 items-end">
                {isSelectionMode && selectedIds.size > 0 && (
                    <Button
                        size="lg"
                        className="rounded-full shadow-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold animate-in slide-in-from-right-10"
                        onClick={handleBulkCheckIn}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        ) : (
                            <CheckSquare className="h-5 w-5 mr-2" />
                        )}
                        Check In ({selectedIds.size})
                    </Button>
                )}

                <Button
                    size="lg"
                    variant={isSelectionMode ? "secondary" : "default"}
                    className={`rounded-full shadow-lg font-bold transition-all ${isSelectionMode ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-orange-500 hover:bg-orange-600 text-white'}`}
                    onClick={toggleSelectionMode}
                >
                    {isSelectionMode ? (
                        <>Cancel Selection</>
                    ) : (
                        <>
                            <Users className="h-5 w-5 mr-2" />
                            Select Multiple
                        </>
                    )}
                </Button>
            </div>

            {CATEGORY_ORDER.map((category) => {
                const categoryPeople = groupedPeople[category]
                if (!categoryPeople || categoryPeople.length === 0) return null

                return (
                    <div key={category} className="space-y-4">
                        <h2 className="text-2xl font-bold text-orange-600 pl-2 border-l-4 border-orange-400">
                            {category}
                        </h2>
                        <div className="grid grid-cols-2 min-[600px]:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 min-[600px]:gap-4">
                            {categoryPeople.map((person) => (
                                <PersonCard
                                    key={person.id}
                                    person={person}
                                    role={role}
                                    selectionMode={isSelectionMode}
                                    isSelected={selectedIds.has(person.id)}
                                    onSelect={() => toggleSelection(person.id)}
                                />
                            ))}
                        </div>
                    </div>
                )
            })}

            {otherPeople.length > 0 && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 min-[600px]:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 min-[600px]:gap-4">
                        {otherPeople.map((person) => (
                            <PersonCard
                                key={person.id}
                                person={person}
                                role={role}
                                selectionMode={isSelectionMode}
                                isSelected={selectedIds.has(person.id)}
                                onSelect={() => toggleSelection(person.id)}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
