import { MasterListShiftData } from '@/app/admin/masterlist/actions'
import { Check } from 'lucide-react'
import { calculateExpectedHours } from '@/lib/utils'
import { memo } from 'react'

type Person = {
    id: string
    full_name: string
    code: string
    role: string
    job_type?: string
    display_order?: number
    categories?: { name: string }[] | any
}

type ShiftCellProps = {
    person: Person
    day: number
    shift?: MasterListShiftData
    isHoliday?: boolean
    isWeekend?: boolean
    workHours?: number
    showComputedHours?: boolean
    isSelected?: boolean
    isSelectionMode?: boolean
    onCellClick: (person: Person, day: number) => void
}

export const ShiftCell = memo(function ShiftCell({
    person,
    day,
    shift,
    isHoliday,
    isWeekend,
    workHours,
    showComputedHours = true,
    isSelected = false,
    isSelectionMode = false,
    onCellClick
}: ShiftCellProps) {
    // Determine background color
    let bgColor = 'bg-white'
    let textColor = 'text-foreground'
    let mainContent: React.ReactNode = ''
    let memoContent: string | undefined = undefined

    const formatTime = (timeStr?: string) => {
        if (!timeStr) return ''
        const [h, m] = timeStr.split(':')
        return `${parseInt(h)}:${m}`
    }

    if (shift) {
        if (shift.shift_type === 'rest') {
            bgColor = 'bg-red-50'
            textColor = 'text-red-700'
            mainContent = 'Rest'
        } else if (shift.shift_type === 'preferred_rest') {
            bgColor = 'bg-red-50'
            textColor = 'text-red-700'
            mainContent = 'Preferred\nRest'
        } else if (shift.shift_type === 'absent') {
            bgColor = 'bg-gray-100'
            textColor = 'text-gray-500'
            mainContent = 'Absent'
        } else if (shift.shift_type === 'paid_leave') {
            bgColor = 'bg-green-50'
            textColor = 'text-green-700'
            mainContent = 'Paid Leave'
        } else if (shift.shift_type === 'half_paid_leave') {
            bgColor = 'bg-green-50'
            textColor = 'text-green-700'
            mainContent = 'Half Paid\nLeave'
        } else if (shift.shift_type === 'special_leave') {
            bgColor = 'bg-yellow-50'
            textColor = 'text-yellow-700'
            mainContent = 'Special\nLeave'
        } else if (shift.shift_type === 'business_trip') {
            bgColor = 'bg-purple-50'
            textColor = 'text-purple-700'
            mainContent = 'Business\nTrip'
        } else if (shift.shift_type === 'flex') {
            bgColor = 'bg-blue-50'
            textColor = 'text-blue-700'
            mainContent = 'Flex'
        } else if (shift.shift_type === 'present') {
            bgColor = 'bg-blue-50'
            textColor = 'text-blue-700'
            mainContent = 'Present'
            memoContent = shift.memo
        } else if (shift.shift_type === 'sick_absent') {
            bgColor = 'bg-red-50'
            textColor = 'text-red-700'
            mainContent = 'Sick\nAbsent'
            memoContent = shift.memo
        } else if (shift.shift_type === 'planned_absent') {
            bgColor = 'bg-orange-50'
            textColor = 'text-orange-700'
            mainContent = 'Planned\nAbsent'
            memoContent = shift.memo
        } else if (shift.shift_type === 'family_reason') {
            bgColor = 'bg-purple-50'
            textColor = 'text-purple-700'
            mainContent = 'Family\nMatters'
            memoContent = shift.memo
        } else if (shift.shift_type === 'other_reason') {
            bgColor = 'bg-gray-50'
            textColor = 'text-gray-700'
            mainContent = 'Other\nReason'
            memoContent = shift.memo
        } else if (shift.shift_type === 'work') {
            bgColor = 'bg-white'
            if (shift.color) {
                // Use inline style for custom colors, but we need to override the class
                // We'll handle this in the style prop of the div
            }
            const start = formatTime(shift.start_time)
            const end = formatTime(shift.end_time)
            mainContent = `${start} - ${end}`
            // Only show location if it's NOT "academy" (since 80% are academy, no need to show it)
            if (shift.location && shift.location.toLowerCase() !== 'academy') {
                mainContent += `\n${shift.location}`
            }
        }
    } else {
        // Default state (no shift assigned)
        if (isHoliday || isWeekend) {
            bgColor = 'bg-red-50'
            textColor = 'text-red-700'
            mainContent = 'Rest'
        } else {
            mainContent = '-'
            textColor = 'text-muted-foreground'
        }
    }

    const formatWorkHours = (hours: number) => {
        const h = Math.floor(hours)
        const m = Math.round((hours - h) * 60)
        return `${h}.${m.toString().padStart(2, '0')}`
    }

    return (
        <div
            className={`
                h-16 w-[100px] min-w-[100px] max-w-[100px] p-1 border-r border-b border-border 
                flex flex-col items-center justify-center text-[10px] text-center cursor-pointer
                hover:bg-accent transition-colors whitespace-pre-line relative overflow-hidden
                ${!shift?.color ? bgColor : ''} ${textColor}
                ${isSelected ? 'ring-2 ring-inset ring-blue-500 z-10' : ''}
            `}
            style={shift?.color ? { backgroundColor: shift.color } : undefined}
            onClick={() => onCellClick(person, day)}
        >
            {isSelected && (
                <div className="absolute top-0.5 right-0.5 bg-blue-500 text-white rounded-full p-0.5 z-20">
                    <Check className="h-3 w-3" />
                </div>
            )}

            <div className="flex flex-col items-center justify-center w-full h-full p-0.5">
                <div className="font-medium leading-tight whitespace-pre-line overflow-visible text-[10px]">{mainContent}</div>
                {memoContent && (
                    <div className="text-[9px] opacity-80 line-clamp-1 leading-tight mt-0.5 w-full overflow-hidden text-ellipsis px-0.5" title={memoContent}>
                        {memoContent}
                    </div>
                )}
            </div>

            {/* Expected Shift Hours (Top Middle) */}
            {!['present', 'sick_absent', 'planned_absent', 'family_reason', 'other_reason'].includes(shift?.shift_type || '') && shift && (() => {
                const expected = calculateExpectedHours(shift)
                if (expected > 0) {
                    return <div className="absolute top-0.5 left-1/2 -translate-x-1/2 text-[9px] font-bold opacity-60 tabular-nums tracking-tighter">{expected}h</div>
                }
                return null
            })()}
            {showComputedHours && (
                <div className="absolute bottom-0.5 right-1 text-[9px] font-mono text-muted-foreground bg-white/80 px-1 rounded">
                    {workHours !== undefined ? `${formatWorkHours(workHours)}h` : '-'}
                </div>
            )}
        </div>
    )
})
