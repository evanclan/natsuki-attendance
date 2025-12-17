
import { createAdminClient } from './src/utils/supabase/admin';
import fs from 'fs';
import path from 'path';

// Manual simple env parser
try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        envContent.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^["']|["']$/g, ''); // Remove quotes if any
                process.env[key] = value;
            }
        });
    } else {
        console.warn('.env.local not found at', envPath);
    }
} catch (e) {
    console.error('Error loading env:', e);
}

async function inspect() {
    console.log('Using URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    // Don't log the key

    const supabase = createAdminClient();

    const code = 'EMP018';
    console.log(`Fetching person with code: ${code}`);

    const { data: person, error: personError } = await supabase
        .from('people')
        .select('id, full_name')
        .eq('code', code)
        .single();

    if (personError) {
        console.error('Error fetching person:', personError);
        return;
    }

    console.log('Person:', person);

    const date = '2025-12-12';
    console.log(`Fetching attendance for: ${date}`);

    const { data: attendance, error: attendanceError } = await supabase
        .from('attendance_days')
        .select('*')
        .eq('person_id', person.id)
        .eq('date', date)
        .single();

    if (attendanceError) {
        console.error('Error fetching attendance:', attendanceError);
        return;
    }

    console.log('Attendance Record:', attendance);

    // Also fetch shift
    const { data: shift, error: shiftError } = await supabase
        .from('shifts')
        .select('*')
        .eq('person_id', person.id)
        .eq('date', date)
        .single();

    console.log('Shift:', shift);
}

inspect();
