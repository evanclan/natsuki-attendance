import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

import { MasterListShiftData } from '@/app/admin/masterlist/actions'

export function calculateExpectedHours(shift: MasterListShiftData): number {
  if (shift.shift_type === 'work' && shift.start_time && shift.end_time) {
    const [startH, startM] = shift.start_time.split(':').map(Number)
    const [endH, endM] = shift.end_time.split(':').map(Number)
    let duration = (endH + endM / 60) - (startH + startM / 60)
    if (duration < 0) duration += 24 // Handle overnight shifts
    if (duration >= 6 || shift.force_break) {
      duration -= 1 // 1 hour break
    }
    return Math.max(0, duration)
  }
  if (shift.shift_type === 'paid_leave') return 8
  if (shift.shift_type === 'half_paid_leave') {
    if (shift.start_time && shift.end_time) {
      const [startH, startM] = shift.start_time.split(':').map(Number)
      const [endH, endM] = shift.end_time.split(':').map(Number)
      let duration = (endH + endM / 60) - (startH + startM / 60)
      if (duration < 0) duration += 24
      if (duration >= 6) duration -= 1
      return Math.max(0, duration) + 4
    }
    return 4
  }
  if (shift.shift_type === 'business_trip') return 8
  if (shift.shift_type === 'flex') {
    return shift.paid_leave_hours || 8
  }
  return 0
}
