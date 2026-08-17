'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export type AttendanceUpdateData = {
    check_in_at: string | null
    check_out_at: string | null
    break_start_at: string | null
    break_end_at: string | null
    status: string
    admin_note?: string
    total_break_minutes?: number
}

export async function updateAttendanceRecord(
    attendanceId: number,
    personId: string,
    data: AttendanceUpdateData
) {
    const supabase = await createClient()

    // 1. Fetch original record for audit trail
    const { data: originalRecord, error: fetchError } = await supabase
        .from('attendance_days')
        .select('*')
        .eq('id', attendanceId)
        .single()

    if (fetchError) {
        return { success: false, error: 'Record not found' }
    }

    // 2. Fetch the shift for this date to apply proper rounding rules
    const dateStr = originalRecord.date
    const { data: shift } = await supabase
        .from('shifts')
        .select('shift_type, start_time, end_time, paid_leave_hours, force_break')
        .eq('person_id', personId)
        .eq('date', dateStr)
        .limit(1)
        .maybeSingle()

    // 3. Calculate work minutes using the same business rules as kiosk
    let total_work_minutes = 0
    let total_break_minutes = 0
    let break_exceeded = false
    let overtime_minutes = 0
    let paid_leave_minutes = 0
    let rounded_check_in_at = data.check_in_at
    let rounded_check_out_at = data.check_out_at
    let finalStatus = data.status

    if (data.check_in_at && data.check_out_at) {
        // Import the calculateDailyStats function from kiosk actions
        const { calculateDailyStats } = await import('@/app/actions/kiosk-utils')

        const calculation = calculateDailyStats(
            data.check_in_at,
            data.check_out_at,
            data.break_start_at || null,
            data.break_end_at || null,
            shift,
            // Pass the override if it exists in data (we need to add it to the type first, but for now we expect it in 'data' casted or upgraded)
            // But wait, 'data' is typed as AttendanceUpdateData which I need to update first.
            (data as any).total_break_minutes
        )

        total_work_minutes = calculation.total_work_minutes
        total_break_minutes = calculation.total_break_minutes
        break_exceeded = calculation.break_exceeded
        overtime_minutes = calculation.overtime_minutes
        paid_leave_minutes = calculation.paid_leave_minutes
        rounded_check_in_at = calculation.rounded_check_in_at
        rounded_check_out_at = calculation.rounded_check_out_at
    } else {
        // No check-in/out: preserve paid leave minutes and avoid setting status to absent for special shift types
        if (shift) {
            const shiftType = shift.shift_type?.toLowerCase()
            if (shiftType === 'paid_leave') {
                paid_leave_minutes = (shift.paid_leave_hours ?? 8) * 60
                total_work_minutes = 0
                if (finalStatus === 'absent') {
                    finalStatus = 'present'
                }
            } else if (shiftType === 'half_paid_leave') {
                paid_leave_minutes = 240
                total_work_minutes = 0
                if (finalStatus === 'absent') {
                    finalStatus = 'present'
                }
            } else if (shiftType === 'custom_leave') {
                paid_leave_minutes = (shift.paid_leave_hours ?? 0) * 60
                total_work_minutes = 0
                if (finalStatus === 'absent') {
                    finalStatus = 'present'
                }
            } else if (shiftType === 'business_trip') {
                paid_leave_minutes = 0
                total_work_minutes = 480
                if (finalStatus === 'absent') {
                    finalStatus = 'present'
                }
            } else if (shiftType === 'special_leave') {
                paid_leave_minutes = 0
                total_work_minutes = 0
                if (finalStatus === 'absent') {
                    finalStatus = 'present'
                }
            }
        }
    }

    // 4. Update the record
    const updatePayload: any = {
        check_in_at: data.check_in_at,
        check_out_at: data.check_out_at,
        break_start_at: data.break_start_at,
        break_end_at: data.break_end_at,
        status: finalStatus,
        total_work_minutes,
        total_break_minutes,
        break_exceeded,
        overtime_minutes,
        paid_leave_minutes,
        rounded_check_in_at,
        rounded_check_out_at,
        is_edited: true,
        updated_at: new Date().toISOString()
    }


    // Handle admin notes - append break exceeded note if applicable
    if (break_exceeded) {
        const currentNote = data.admin_note || ''
        const breakNote = 'Exceeded break time (>60 min)'
        updatePayload.admin_note = currentNote
            ? `${currentNote}; ${breakNote}`
            : breakNote
    } else if (data.admin_note) {
        updatePayload.admin_note = data.admin_note
    }

    const { error: updateError } = await supabase
        .from('attendance_days')
        .update(updatePayload)
        .eq('id', attendanceId)

    if (updateError) {
        return { success: false, error: updateError.message }
    }

    // 5. Create audit log event
    const { error: eventError } = await supabase
        .from('attendance_events')
        .insert({
            person_id: personId,
            attendance_day_id: attendanceId,
            event_type: 'admin_edit',
            source: 'admin',
            payload: {
                original: {
                    check_in_at: originalRecord.check_in_at,
                    check_out_at: originalRecord.check_out_at,
                    status: originalRecord.status
                },
                new: data
            },
            note: data.admin_note || 'Manual edit by admin'
        })

    if (eventError) {
        console.error('Failed to create audit event:', eventError)
        // Don't fail the whole request just because audit log failed, but good to know
    }

    revalidatePath('/admin/manage_student')
    revalidatePath('/admin/manage_employee')
    revalidatePath('/admin/all_list')
    revalidatePath(`/admin/manage_student/${personId}`) // This might need the code, not ID. The page uses code.
    // We'll rely on the client to refresh or the path revalidation to propagate if possible.
    // Since we don't have the code here easily unless passed, we might just revalidate the general paths.

    return { success: true }
}

export async function upsertAttendanceRecord(
    personId: string,
    date: string,
    data: {
        check_in_at: string | null
        check_out_at: string | null
        status: string
        admin_note?: string
        total_break_minutes?: number
    }
) {
    const supabase = await createClient()

    // 1. Check if record exists
    const { data: existingRecord } = await supabase
        .from('attendance_days')
        .select('id')
        .eq('person_id', personId)
        .eq('date', date)
        .single()

    if (existingRecord) {
        // Update existing
        return updateAttendanceRecord(existingRecord.id, personId, {
            ...data,
            break_start_at: null, // We aren't setting these from the monthly view for now
            break_end_at: null
        })
    } else {
        // Create new record

        // 1b. Fetch shift for proper rounding (mirroring update logic)
        const { data: shift } = await supabase
            .from('shifts')
            .select('shift_type, start_time, end_time, paid_leave_hours, force_break')
            .eq('person_id', personId)
            .eq('date', date)
            .limit(1) // Avoid crash if multiple shifts exist for same day
            .maybeSingle()

        // Calculate work minutes using shared utility
        let total_work_minutes = 0
        let total_break_minutes = 0
        let break_exceeded = false
        let overtime_minutes = 0
        let paid_leave_minutes = 0
        let rounded_check_in_at = data.check_in_at
        let rounded_check_out_at = data.check_out_at
        let finalStatus = data.status

        if (data.check_in_at && data.check_out_at) {
            const { calculateDailyStats } = await import('@/app/actions/kiosk-utils')

            const calculation = calculateDailyStats(
                data.check_in_at,
                data.check_out_at,
                null, // No break times for simple manual creation yet
                null,
                shift,
                data.total_break_minutes
            )

            total_work_minutes = calculation.total_work_minutes
            total_break_minutes = calculation.total_break_minutes
            break_exceeded = calculation.break_exceeded
            overtime_minutes = calculation.overtime_minutes
            paid_leave_minutes = calculation.paid_leave_minutes
            rounded_check_in_at = calculation.rounded_check_in_at
            rounded_check_out_at = calculation.rounded_check_out_at
        } else {
            // No check-in/out: preserve paid leave minutes and avoid setting status to absent for special shift types
            if (shift) {
                const shiftType = shift.shift_type?.toLowerCase()
                if (shiftType === 'paid_leave') {
                    paid_leave_minutes = (shift.paid_leave_hours ?? 8) * 60
                    total_work_minutes = 0
                    if (finalStatus === 'absent') {
                        finalStatus = 'present'
                    }
                } else if (shiftType === 'half_paid_leave') {
                    paid_leave_minutes = 240
                    total_work_minutes = 0
                    if (finalStatus === 'absent') {
                        finalStatus = 'present'
                    }
                } else if (shiftType === 'custom_leave') {
                    paid_leave_minutes = (shift.paid_leave_hours ?? 0) * 60
                    total_work_minutes = 0
                    if (finalStatus === 'absent') {
                        finalStatus = 'present'
                    }
                } else if (shiftType === 'business_trip') {
                    paid_leave_minutes = 0
                    total_work_minutes = 480
                    if (finalStatus === 'absent') {
                        finalStatus = 'present'
                    }
                } else if (shiftType === 'special_leave') {
                    paid_leave_minutes = 0
                    total_work_minutes = 0
                    if (finalStatus === 'absent') {
                        finalStatus = 'present'
                    }
                }
            }
        }

        const { error: insertError } = await supabase
            .from('attendance_days')
            .insert({
                person_id: personId,
                date: date,
                check_in_at: data.check_in_at,
                check_out_at: data.check_out_at,
                status: finalStatus,
                total_work_minutes,
                total_break_minutes,
                break_exceeded,
                overtime_minutes,
                paid_leave_minutes,
                rounded_check_in_at,
                rounded_check_out_at,
                is_edited: true,
                admin_note: data.admin_note || 'Created manually by admin'
            })

        if (insertError) {
            return { success: false, error: insertError.message }
        }

        revalidatePath('/admin/manage_employee')
        revalidatePath('/admin/all_list')
        return { success: true }
    }
}

export async function deleteAttendanceRecord(personId: string, date: string) {
    const supabase = await createClient()

    // 1. Get the record ID first for audit
    const { data: record, error: fetchError } = await supabase
        .from('attendance_days')
        .select('*')
        .eq('person_id', personId)
        .eq('date', date)
        .single()

    if (fetchError || !record) {
        return { success: false, error: 'Record not found' }
    }

    // 2. Unlink associated events first (foreign key constraint)
    // We update them to null so we keep the audit trail but break the link
    const { error: unlinkError } = await supabase
        .from('attendance_events')
        .update({ attendance_day_id: null })
        .eq('attendance_day_id', record.id)

    if (unlinkError) {
        console.error('Failed to unlink events:', unlinkError)
        // We might want to abort or try to delete anyway, but likely it will fail if this failed
        return { success: false, error: 'Failed to unlink related events: ' + unlinkError.message }
    }

    // 3. Delete the record
    const { error: deleteError } = await supabase
        .from('attendance_days')
        .delete()
        .eq('id', record.id)

    if (deleteError) {
        return { success: false, error: deleteError.message }
    }

    // 4. Create audit log
    const { error: eventError } = await supabase
        .from('attendance_events')
        .insert({
            person_id: personId,
            attendance_day_id: null, // Record is deleted, so no link
            event_type: 'admin_edit', // changed from admin_delete to bypass DB ENUM error
            source: 'admin',
            payload: {
                deleted_record: record
            },
            note: 'Manual delete by admin from monthly report'
        })

    if (eventError) {
        console.error('Failed to create audit event:', eventError)
    }

    revalidatePath('/admin/manage_employee')
    revalidatePath('/admin/all_list')
    revalidatePath(`/admin/manage_employee/${record.code}`) // Try to revalidate specific employee page if we had code, but we don't.
    // Just revalidate generic paths.

    return { success: true }
}

/**
 * Bulk-mark selected (person, date) cells as absent from the All List.
 *
 * Deliberately minimal-write: only sets `status = 'absent'` — it NEVER touches
 * check-in/out times or computed minutes, so existing data cannot be destroyed.
 * Cells whose shift is a special leave type (paid leave, business trip, etc.)
 * are skipped, mirroring the protection in upsertAttendanceRecord.
 */
export async function bulkMarkAbsentDays(cells: { personId: string, date: string }[]) {
    const supabase = await createClient()

    const SPECIAL_SHIFT_TYPES = ['paid_leave', 'half_paid_leave', 'custom_leave', 'business_trip', 'special_leave']

    let updated = 0
    const skipped: { personId: string, date: string, reason: string }[] = []
    const failures: { personId: string, date: string, error: string }[] = []

    // Sequential loop: predictable load on the connection pool, per-cell error isolation
    for (const cell of cells) {
        try {
            // 1. Guard: skip cells covered by a special leave shift
            const { data: shift } = await supabase
                .from('shifts')
                .select('shift_type')
                .eq('person_id', cell.personId)
                .eq('date', cell.date)
                .limit(1)
                .maybeSingle()

            if (shift && SPECIAL_SHIFT_TYPES.includes(shift.shift_type?.toLowerCase())) {
                skipped.push({ ...cell, reason: `Has ${shift.shift_type} shift` })
                continue
            }

            // 2. Update existing record's status only, or insert a new absent record
            const { data: existingRecord } = await supabase
                .from('attendance_days')
                .select('id, status')
                .eq('person_id', cell.personId)
                .eq('date', cell.date)
                .maybeSingle()

            let attendanceDayId: number | null = null

            if (existingRecord) {
                const { error: updateError } = await supabase
                    .from('attendance_days')
                    .update({
                        status: 'absent',
                        is_edited: true,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existingRecord.id)

                if (updateError) {
                    failures.push({ ...cell, error: updateError.message })
                    continue
                }
                attendanceDayId = existingRecord.id
            } else {
                const { data: inserted, error: insertError } = await supabase
                    .from('attendance_days')
                    .insert({
                        person_id: cell.personId,
                        date: cell.date,
                        status: 'absent',
                        is_edited: true,
                        admin_note: 'Bulk marked absent by admin'
                    })
                    .select('id')
                    .single()

                if (insertError) {
                    failures.push({ ...cell, error: insertError.message })
                    continue
                }
                attendanceDayId = inserted?.id ?? null
            }

            // 3. Audit trail (non-fatal if it fails, same as single-cell edit)
            const { error: eventError } = await supabase
                .from('attendance_events')
                .insert({
                    person_id: cell.personId,
                    attendance_day_id: attendanceDayId,
                    event_type: 'admin_edit',
                    source: 'admin',
                    payload: {
                        original: existingRecord ? { status: existingRecord.status } : null,
                        new: { status: 'absent' }
                    },
                    note: 'Bulk marked absent by admin from All List'
                })

            if (eventError) {
                console.error('Failed to create audit event for bulk absent:', eventError)
            }

            updated++
        } catch (error: any) {
            failures.push({ ...cell, error: error.message || 'Unknown error' })
        }
    }

    revalidatePath('/admin/all_list')

    if (failures.length > 0) {
        console.error('Some bulk mark-absents failed:', failures)
        return {
            success: false,
            error: `${failures.length} of ${cells.length} failed`,
            updated,
            skipped,
            failures
        }
    }

    return { success: true, updated, skipped }
}
