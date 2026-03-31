import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Daily cron endpoint that:
 * 1. Cleans up duplicate/stale open-ended periods (valid_until is null)
 *    when a more specific period exists for the same person
 * 2. Syncs people.status based on person_status_history for today
 */
export async function GET() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json(
                { error: 'Missing Supabase configuration' },
                { status: 500 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Get today's date in JST (UTC+9)
        const now = new Date();
        const jstOffset = 9 * 60 * 60 * 1000;
        const jstDate = new Date(now.getTime() + jstOffset);
        const today = jstDate.toISOString().split('T')[0];

        // ─── Step 1: Clean up stale open-ended periods ───
        // If a person has multiple records with the same valid_from,
        // and one has a valid_until date while another is null,
        // the null one is stale and should be closed or removed.
        const cleanedUp: string[] = [];

        const { data: allHistory } = await supabase
            .from('person_status_history')
            .select('id, person_id, status, valid_from, valid_until')
            .order('person_id')
            .order('valid_from', { ascending: false });

        if (allHistory) {
            // Group by person_id
            const byPerson: Record<string, typeof allHistory> = {};
            for (const h of allHistory) {
                if (!byPerson[h.person_id]) byPerson[h.person_id] = [];
                byPerson[h.person_id].push(h);
            }

            for (const [personId, periods] of Object.entries(byPerson)) {
                // Find open-ended periods (valid_until is null)
                const openPeriods = periods.filter(p => p.valid_until === null);
                // Find periods with specific end dates
                const closedPeriods = periods.filter(p => p.valid_until !== null);

                if (openPeriods.length > 1) {
                    // Multiple open-ended periods for same person — keep only the latest
                    const sorted = openPeriods.sort((a, b) => b.valid_from.localeCompare(a.valid_from));
                    for (let i = 1; i < sorted.length; i++) {
                        // Close the older open-ended period at its own valid_from (same day)
                        // or delete it if a closed period already covers this range
                        const stale = sorted[i];
                        const hasCovering = closedPeriods.some(
                            cp => cp.valid_from === stale.valid_from && cp.status === stale.status
                        );

                        if (hasCovering) {
                            // A specific period already covers this — delete the stale open-ended one
                            await supabase
                                .from('person_status_history')
                                .delete()
                                .eq('id', stale.id);
                            cleanedUp.push(`Deleted stale open period #${stale.id} for person ${personId}`);
                        } else {
                            // Close it at latest closed period's valid_until or today
                            const latestClosed = closedPeriods
                                .filter(cp => cp.valid_from <= stale.valid_from || cp.valid_from === stale.valid_from)
                                .sort((a, b) => b.valid_from.localeCompare(a.valid_from))[0];

                            const closeDate = latestClosed?.valid_until || today;
                            await supabase
                                .from('person_status_history')
                                .update({ valid_until: closeDate })
                                .eq('id', stale.id);
                            cleanedUp.push(`Closed stale open period #${stale.id} at ${closeDate} for person ${personId}`);
                        }
                    }
                }

                // Also check: if there's an open-ended period AND a closed period
                // with the same valid_from and status, the open-ended one is stale
                if (openPeriods.length === 1 && closedPeriods.length > 0) {
                    const openP = openPeriods[0];
                    const duplicate = closedPeriods.find(
                        cp => cp.valid_from === openP.valid_from && cp.status === openP.status
                    );
                    if (duplicate) {
                        // The closed period is more specific — delete the open-ended duplicate
                        await supabase
                            .from('person_status_history')
                            .delete()
                            .eq('id', openP.id);
                        cleanedUp.push(`Deleted duplicate open period #${openP.id} (covered by #${duplicate.id}) for person ${personId}`);
                    }
                }
            }
        }

        // ─── Step 2: Sync people.status based on today's date ───
        const { data: allPeople, error: peopleError } = await supabase
            .from('people')
            .select('id, status, full_name');

        if (peopleError) {
            return NextResponse.json({ error: peopleError.message }, { status: 500 });
        }

        const changes: { name: string; from: string; to: string }[] = [];

        for (const person of allPeople || []) {
            const { data: currentPeriod } = await supabase
                .from('person_status_history')
                .select('status')
                .eq('person_id', person.id)
                .lte('valid_from', today)
                .or(`valid_until.is.null,valid_until.gte.${today}`)
                .order('valid_from', { ascending: false })
                .limit(1)
                .single();

            const expectedStatus = currentPeriod?.status || 'inactive';

            if (person.status !== expectedStatus) {
                await supabase
                    .from('people')
                    .update({ status: expectedStatus, updated_at: new Date().toISOString() })
                    .eq('id', person.id);

                changes.push({
                    name: person.full_name,
                    from: person.status,
                    to: expectedStatus
                });
            }
        }

        // ─── Step 3: Sync student categories from category history ───
        let categorySyncResult = { synced: 0, changes: [] as any[] };
        try {
            // Inline category sync (using same supabase client with service role)
            const { data: students } = await supabase
                .from('people')
                .select('id')
                .eq('role', 'student');

            if (students) {
                for (const student of students) {
                    // Check if this student has any category history
                    const { data: historyCheck } = await supabase
                        .from('person_category_history')
                        .select('id')
                        .eq('person_id', student.id)
                        .limit(1);

                    if (!historyCheck || historyCheck.length === 0) continue;

                    // Get current person_categories
                    const { data: oldCats } = await supabase
                        .from('person_categories')
                        .select('category_id, categories(name)')
                        .eq('person_id', student.id);

                    const oldCatNames = (oldCats || []).map((c: any) => c.categories?.name || '').filter(Boolean);

                    // Find the period that covers today
                    const { data: currentPeriod } = await supabase
                        .from('person_category_history')
                        .select('id')
                        .eq('person_id', student.id)
                        .lte('valid_from', today)
                        .or(`valid_until.is.null,valid_until.gte.${today}`)
                        .order('valid_from', { ascending: false })
                        .limit(1)
                        .single();

                    // Delete current person_categories
                    await supabase
                        .from('person_categories')
                        .delete()
                        .eq('person_id', student.id);

                    if (currentPeriod) {
                        const { data: periodCats } = await supabase
                            .from('person_category_history_categories')
                            .select('category_id, categories(name)')
                            .eq('history_id', currentPeriod.id);

                        if (periodCats && periodCats.length > 0) {
                            const inserts = periodCats.map((pc: any) => ({
                                person_id: student.id,
                                category_id: pc.category_id
                            }));

                            await supabase
                                .from('person_categories')
                                .insert(inserts);

                            await supabase
                                .from('people')
                                .update({ category_id: periodCats[0].category_id })
                                .eq('id', student.id);

                            const newCatNames = periodCats.map((c: any) => c.categories?.name || '').filter(Boolean);
                            const oldSorted = [...oldCatNames].sort().join(',');
                            const newSorted = [...newCatNames].sort().join(',');
                            if (oldSorted !== newSorted) {
                                categorySyncResult.changes.push({
                                    personId: student.id,
                                    oldCats: oldCatNames,
                                    newCats: newCatNames
                                });
                            }
                        }
                    }

                    categorySyncResult.synced++;
                }
            }
        } catch (catSyncError: any) {
            console.error('Category sync error:', catSyncError);
        }

        return NextResponse.json({
            message: 'Status & category sync completed',
            timestamp: new Date().toISOString(),
            today,
            totalPeople: allPeople?.length || 0,
            cleanedUp,
            cleanedUpCount: cleanedUp.length,
            changes,
            changesCount: changes.length,
            categorySync: {
                studentsProcessed: categorySyncResult.synced,
                categoryChanges: categorySyncResult.changes,
                categoryChangesCount: categorySyncResult.changes.length
            }
        });
    } catch (error: any) {
        console.error('Status sync error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
