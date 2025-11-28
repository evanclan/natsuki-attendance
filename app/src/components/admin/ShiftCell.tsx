'use client'

import { MasterListShiftData } from '@/app/admin/masterlist/actions'

type ShiftCellProps = {
    shift?: MasterListShiftData
    isHoliday?: boolean
    isWeekend?: boolean
    workHours?: number
    showComputedHours?: boolean
    onClick: () => void
}

export function ShiftCell({ shift, isHoliday, isWeekend, workHours, showComputedHours = true, onClick }: ShiftCellProps) {
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
                ${bgColor} ${textColor}
            `}
            onClick={onClick}
        >
            <div className="line-clamp-2 leading-tight">
                {content}
            </div>
            {/* Expected Shift Hours (Top Middle) */}
            {shift && (
                <div className="absolute top-0.5 left-1/2 -translate-x-1/2 text-[9px] font-mono text-muted-foreground bg-white/80 px-1 rounded">
                    {(() => {
                        if (shift.shift_type === 'work' && shift.start_time && shift.end_time) {
                            const [startH, startM] = shift.start_time.split(':').map(Number)
                            const [endH, endM] = shift.end_time.split(':').map(Number)
                            let duration = (endH + endM / 60) - (startH + startM / 60)
                            if (duration >= 6) {
                                duration -= 1 // 1 hour break
                            }
                            return `${Math.max(0, duration)}h`
                        }
                        if (shift.shift_type === 'paid_leave') return '8h'
                        if (shift.shift_type === 'half_paid_leave') {
                            if (shift.start_time && shift.end_time) return '8h'
                            return '4h'
                        }
                        if (shift.shift_type === 'business_trip') return '8h'
                        if (shift.shift_type === 'flex') return '8h'
                        return '0h'
                    })()}
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
