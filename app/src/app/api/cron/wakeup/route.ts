import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json(
                { error: 'Missing Supabase configuration' },
                { status: 500 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Perform a lightweight query to wake up the database
        // "employees" table is a good candidate, selecting just 1 row
        const { data, error } = await supabase
            .from('people')
            .select('id')
            .limit(1);

        if (error) {
            console.error('Wakeup query failed:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            message: 'Wakeup successful',
            timestamp: new Date().toISOString(),
            data
        });
    } catch (error) {
        console.error('Wakeup error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
