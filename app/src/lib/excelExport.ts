import * as XLSX from 'xlsx'
import { formatLocalDate } from './utils'

interface SystemEvent {
    id: string
    event_date: string
    title: string
    event_type: 'holiday' | 'rest_day' | 'work_day' | 'event' | 'other'
    is_holiday: boolean
}

interface Person {
    id: string
    full_name: string
    code: string
    role: string
    job_type?: string
    display_order?: number
    categories?: { name: string }[] | any
}

interface Shift {
    person_id: string
    date: string
    shift_type?: string
    shift_name?: string
    start_time?: string
    end_time?: string
    location?: string
    paid_leave_hours?: number
    memo?: string
    color?: string
    force_break?: boolean
}

interface ShiftLegend {
    id: string
    from_location: string
    to_location: string
    color: string
}

interface ExportMasterListParams {
    year: number
    month: number
    employees: Person[]
    days: number[]
    shifts: Shift[]
    events: SystemEvent[]
    legends: ShiftLegend[]
    calculateExpectedHours: (shift: any) => number
}

export function exportMasterListToExcel({
    year,
    month,
    employees,
    days,
    shifts,
    events,
    legends,
    calculateExpectedHours
}: ExportMasterListParams): void {
    const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    const getDayStatus = (day: number) => {
        const date = new Date(year, month, day)
        const dayOfWeek = date.getDay()
        const dateStr = formatLocalDate(date)
        const dayEvents = events.filter(e => e.event_date === dateStr)

        const isHolidayEvent = dayEvents.some(e => e.event_type === 'holiday' || e.is_holiday)
        const isRestDayEvent = dayEvents.some(e => e.event_type === 'rest_day')
        const isWorkDayEvent = dayEvents.some(e => e.event_type === 'work_day')

        let isRestDay = false
        if (dayOfWeek === 0) {
            isRestDay = true
        }
        if (isWorkDayEvent) {
            isRestDay = false
        } else if (isRestDayEvent || isHolidayEvent) {
            isRestDay = true
        }

        return { isRestDay }
    }

    const getShiftCellText = (shift: Shift | undefined): string => {
        if (!shift) return ''

        if (shift.shift_type === 'work' || shift.shift_type === 'work_no_break') {
            const start = shift.start_time?.slice(0, 5)
            const end = shift.end_time?.slice(0, 5)
            if (start && end) {
                return `${start}\n${end}`
            }
            return 'Work'
        } else if (shift.shift_type === 'paid_leave') {
            return '有休'
        } else if (shift.shift_type === 'half_paid_leave') {
            return '半休'
        } else if (shift.shift_type === 'special_leave') {
            return '特休'
        } else if (shift.shift_type === 'absent') {
            return '欠勤'
        } else if (shift.shift_type === 'business_trip') {
            return '出張'
        } else if (shift.shift_type === 'flex') {
            return 'Flex'
        } else if (shift.shift_type === 'rest') {
            return '休み'
        } else if (shift.shift_type === 'preferred_rest') {
            return '希望休'
        }
        return shift.shift_name || shift.shift_type || ''
    }

    // Build worksheet data
    const wsData: any[][] = []

    // Header row: Name | Day columns | 時間 | 有休 | Name
    const headerRow = ['Name']
    days.forEach(day => {
        const date = new Date(year, month, day)
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)
        headerRow.push(`${day}\n${dayName}`)
    })
    headerRow.push('時間', '有休', 'Name')
    wsData.push(headerRow)

    // Events row
    const eventsRow = ['Events']
    days.forEach(day => {
        const date = new Date(year, month, day)
        const dateStr = formatLocalDate(date)
        const dayEvents = events.filter(e => e.event_date === dateStr)
        eventsRow.push(dayEvents.map(e => e.title).join(', '))
    })
    eventsRow.push('', '', '') // Empty cells for 時間, 有休, and repeated Name
    wsData.push(eventsRow)

    // Employee rows
    employees.forEach(person => {
        const row = [person.full_name]

        // Day cells
        days.forEach(day => {
            const date = new Date(year, month, day)
            const dateStr = formatLocalDate(date)
            const shift = shifts.find(s => s.person_id === person.id && s.date === dateStr)
            row.push(getShiftCellText(shift))
        })

        // Working hours (時間)
        const totalExpectedHours = days.reduce((sum, day) => {
            const date = new Date(year, month, day)
            const dateStr = formatLocalDate(date)
            const shift = shifts.find(s => s.person_id === person.id && s.date === dateStr)
            if (!shift) return sum

            return sum + calculateExpectedHours({
                date: shift.date,
                shift_type: shift.shift_type || 'work',
                shift_name: shift.shift_name,
                start_time: shift.start_time,
                end_time: shift.end_time,
                location: shift.location,
                paid_leave_hours: shift.paid_leave_hours,
                memo: shift.memo,
                color: shift.color,
                force_break: shift.force_break
            })
        }, 0)
        row.push(totalExpectedHours > 0 ? `${totalExpectedHours}h` : '-')

        // Paid Leave (有休)
        const isPartTime = Array.isArray(person.categories)
            ? person.categories?.[0]?.name === 'partime'
            : (person.categories as any)?.name === 'partime'

        if (isPartTime) {
            const totalDays = days.reduce((count, day) => {
                const date = new Date(year, month, day)
                const dateStr = formatLocalDate(date)
                const shift = shifts.find(s => s.person_id === person.id && s.date === dateStr)
                if (shift && (shift.shift_type === 'paid_leave' || shift.shift_type === 'half_paid_leave')) {
                    return count + 1
                }
                return count
            }, 0)
            row.push(totalDays > 0 ? `${totalDays}d` : '-')
        } else {
            const totalHours = days.reduce((sum, day) => {
                const date = new Date(year, month, day)
                const dateStr = formatLocalDate(date)
                const shift = shifts.find(s => s.person_id === person.id && s.date === dateStr)
                if (!shift) return sum
                if (shift.shift_type === 'paid_leave') {
                    return sum + (shift.paid_leave_hours || 8)
                } else if (shift.shift_type === 'half_paid_leave') {
                    return sum + 4
                }
                return sum
            }, 0)
            row.push(totalHours > 0 ? `${totalHours}h` : '-')
        }

        // Repeated Name
        row.push(person.full_name)

        wsData.push(row)
    })

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(wsData)

    // Set column widths
    const colWidths = [
        { wch: 15 }, // Name column
        ...days.map(() => ({ wch: 6 })), // Day columns
        { wch: 6 }, // 時間
        { wch: 6 }, // 有休
        { wch: 15 }, // Repeated Name
    ]
    ws['!cols'] = colWidths

    XLSX.utils.book_append_sheet(wb, ws, monthName)

    // Generate and download file using Blob for browser compatibility
    const filename = `EmployeesShift_${year}_${String(month + 1).padStart(2, '0')}.xlsx`
    console.log('Exporting Excel:', filename)

    // Write workbook to array buffer
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    console.log('Workbook size:', wbout.byteLength)

    // Create Blob
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

    // Create download link
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.style.display = 'none'
    document.body.appendChild(anchor)

    // Trigger download
    anchor.click()

    // Cleanup
    setTimeout(() => {
        document.body.removeChild(anchor)
        window.URL.revokeObjectURL(url)
    }, 100)
}
