import { MasterListShiftData } from '@/app/admin/masterlist/actions'
import { Check } from 'lucide-react'
import { calculateExpectedHours } from '@/lib/utils'

type ShiftCellProps = {
    shift?: MasterListShiftData
    isHoliday?: boolean
    isWeekend?: boolean
    workHours?: number
    showComputedHours?: boolean
    isSelected?: boolean
    isSelectionMode?: boolean
    onClick: () => void
}

export function ShiftCell({
    shift,
    isHoliday,
    isWeekend,
    workHours,
    showComputedHours = true,
    isSelected = false,
    isSelectionMode = false,
    onClick
}: ShiftCellProps) {
    // Determine background color
    let bgColor = 'bg-white'
    let textColor = 'text-foreground'
    let content = ''

    const formatTime = (timeStr?: string) => {
        if (!timeStr) return ''
        const [h, m] = timeStr.split(':')
        return `${parseInt(h)}:${m}`
    }

    if (shift) {
        if (shift.shift_type === 'rest') {
            bgColor = 'bg-red-50'
            textColor = 'text-red-700'
            content = 'Rest'
        } else if (shift.shift_type === 'preferred_rest') {
            bgColor = 'bg-red-50'
            textColor = 'text-red-700'
            content = 'Preferred\nRest'
        } else if (shift.shift_type === 'absent') {
            bgColor = 'bg-gray-100'
            textColor = 'text-gray-500'
            content = 'Absent'
        } else if (shift.shift_type === 'paid_leave') {
            bgColor = 'bg-green-50'
            textColor = 'text-green-700'
            content = 'Paid Leave'
        } else if (shift.shift_type === 'half_paid_leave') {
            bgColor = 'bg-green-50'
            textColor = 'text-green-700'
            content = 'Half Paid\nLeave'
        } else if (shift.shift_type === 'special_leave') {
            bgColor = 'bg-yellow-50'
            textColor = 'text-yellow-700'
            content = 'Special\nLeave'
        } else if (shift.shift_type === 'business_trip') {
            bgColor = 'bg-purple-50'
            textColor = 'text-purple-700'
            content = 'Business\nTrip'
        } else if (shift.shift_type === 'flex') {
            bgColor = 'bg-blue-50'
            textColor = 'text-blue-700'
            content = 'Flex'
        } else if (shift.shift_type === 'work') {
            bgColor = 'bg-white'
            if (shift.color) {
                // Use inline style for custom colors, but we need to override the class
                // We'll handle this in the style prop of the div
            }
            const start = formatTime(shift.start_time)
            const end = formatTime(shift.end_time)
            content = `${start} - ${end}`
            if (shift.location) {
                content += `\n${shift.location}`
            }
        }
    } else {
        // Default state (no shift assigned)
        if (isHoliday || isWeekend) {
            bgColor = 'bg-red-50'
            textColor = 'text-red-700'
            content = 'Rest'
        } else {
            content = '-'
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
            onClick={onClick}
        >
            {isSelected && (
                <div className="absolute top-0.5 right-0.5 bg-blue-500 text-white rounded-full p-0.5 z-20">
                    <Check className="h-3 w-3" />
                </div>
            )}

            <div className="line-clamp-2 leading-tight">
                {content}
            </div>
            {/* Expected Shift Hours (Top Middle) */}
            {shift && (
                <div className="absolute top-0.5 left-1/2 -translate-x-1/2 text-[9px] font-mono text-muted-foreground bg-white/80 px-1 rounded">
                    {`${calculateExpectedHours(shift)}h`}
                </div>
            )}
            {showComputedHours && (
                <div className="absolute bottom-0.5 right-1 text-[9px] font-mono text-muted-foreground bg-white/80 px-1 rounded">
                    {workHours !== undefined ? `${formatWorkHours(workHours)}h` : '-'}
                </div>
            )}
        </div>
    )
}
