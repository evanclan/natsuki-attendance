'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { formatLocalDate } from '@/lib/utils'

export async function getDeadlineSetting() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'preferred_rest_deadline_day')
        .single()

    if (error) {
        console.error('Error fetching deadline setting:', error)
        // Return default of 21 if setting not found or error
        return { success: false, data: 21, error: error.message }
    }

    // Value is stored as JSONB, so it might be a number or string
    const day = Number(data.value) || 21
    return { success: true, data: day }
}

export async function updateDeadlineSetting(day: number) {
    const supabase = await createClient()

    if (day < 1 || day > 28) {
        return { success: false, error: 'Day must be between 1 and 28' }
    }

    const { error } = await supabase
        .from('app_settings')
        .upsert({
            key: 'preferred_rest_deadline_day',
            value: day, // optimized: supabase handles casting to jsonb
            description: 'Day of the month (1-28) when preferred rest submission closes'
        })

    if (error) {
        console.error('Error updating deadline setting:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/admin/settings/deadline')
    revalidatePath('/kiosk/employee/setdayoff')
    return { success: true }
}

export interface PreferredRestApplicant {
    personId: string
    fullName: string
    japaneseName: string | null
    code: string | null
    isActiveEmployee: boolean
    days: { date: string; memo: string | null }[]
    lastSubmittedAt: string | null
}

export interface PreferredRestNonApplicant {
    personId: string
    fullName: string
    japaneseName: string | null
    code: string | null
}

/**
 * Read-only summary of who submitted a preferred rest day for a given month.
 * `month` is 0-indexed (same convention as JS Date / the setdayoff page).
 */
export async function getPreferredRestApplicants(year: number, month: number) {
    try {
        const supabase = await createClient()

        const startDateStr = formatLocalDate(new Date(year, month, 1))
        const endDateStr = formatLocalDate(new Date(year, month + 1, 0))

        // 1. All preferred rest requests in the month
        const { data: shifts, error: shiftsError } = await supabase
            .from('shifts')
            .select('person_id, date, memo, created_at, updated_at')
            .eq('shift_type', 'preferred_rest')
            .gte('date', startDateStr)
            .lte('date', endDateStr)
            .order('date', { ascending: true })

        if (shiftsError) throw shiftsError

        // 2. Active employees (used for the "not yet submitted" list)
        const { data: activeEmployees, error: peopleError } = await supabase
            .from('people')
            .select('id, full_name, japanese_name, code')
            .eq('role', 'employee')
            .eq('status', 'active')
            .order('full_name', { ascending: true })

        if (peopleError) throw peopleError

        const rows = shifts || []
        const activeList = (activeEmployees || []) as {
            id: string
            full_name: string
            japanese_name: string | null
            code: string | null
        }[]
        const activeById = new Map(activeList.map((p) => [p.id, p]))

        // 3. Some applicants may be inactive or non-employees, so resolve any
        //    person id we saw that is not in the active employee list.
        const missingIds = [...new Set(rows.map((s) => s.person_id))].filter(
            (id) => id && !activeById.has(id)
        )

        const extraById = new Map<string, { id: string; full_name: string; japanese_name: string | null; code: string | null }>()
        if (missingIds.length > 0) {
            const { data: extraPeople, error: extraError } = await supabase
                .from('people')
                .select('id, full_name, japanese_name, code')
                .in('id', missingIds)

            if (extraError) throw extraError
            for (const p of (extraPeople || []) as typeof activeList) {
                extraById.set(p.id, p)
            }
        }

        // 4. Group requests by person
        const grouped = new Map<string, PreferredRestApplicant>()
        for (const row of rows) {
            if (!row.person_id) continue

            const person = activeById.get(row.person_id) || extraById.get(row.person_id)
            if (!person) continue // person was deleted; skip rather than show a blank row

            let entry = grouped.get(row.person_id)
            if (!entry) {
                entry = {
                    personId: row.person_id,
                    fullName: person.full_name,
                    japaneseName: person.japanese_name ?? null,
                    code: person.code ?? null,
                    isActiveEmployee: activeById.has(row.person_id),
                    days: [],
                    lastSubmittedAt: null,
                }
                grouped.set(row.person_id, entry)
            }

            entry.days.push({ date: row.date, memo: row.memo ?? null })

            const submittedAt = row.updated_at || row.created_at
            if (submittedAt && (!entry.lastSubmittedAt || submittedAt > entry.lastSubmittedAt)) {
                entry.lastSubmittedAt = submittedAt
            }
        }

        const applicants = [...grouped.values()].sort((a, b) =>
            a.fullName.localeCompare(b.fullName)
        )

        const notApplied: PreferredRestNonApplicant[] = activeList
            .filter((p) => !grouped.has(p.id))
            .map((p) => ({
                personId: p.id,
                fullName: p.full_name,
                japaneseName: p.japanese_name ?? null,
                code: p.code ?? null,
            }))

        return {
            success: true,
            data: {
                applicants,
                notApplied,
                totalActiveEmployees: activeList.length,
                totalRequests: rows.length,
            },
        }
    } catch (error: unknown) {
        console.error('Error fetching preferred rest applicants:', error)
        const message = error instanceof Error ? error.message : 'Failed to load applicants'
        return { success: false, error: message }
    }
}
