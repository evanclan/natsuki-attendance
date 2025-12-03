require('dotenv').config({ path: './app/.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const employeesData = [
    { "name": "大川 早紀", "category": "full time", "job-type": "Chief Pathfinder(鎧)", "status": "Active" },
    { "name": "ビギンズ 洋美(Jess)", "category": "full time", "job-type": "Full time", "status": "Active" },
    { "name": "山下 美和", "category": "full time", "job-type": "Full time(RGA)", "status": "Active" },
    { "name": "丸田 れいら", "category": "part time", "job-type": "Mon,Thu,Fri 7:00-13:00; Tue,Wed 7:00-16:00", "status": "Active" },
    { "name": "外村 恵梨香", "category": "part time", "job-type": "Part-Timer", "status": "Active" },
    { "name": "日渡 己汰郎", "category": "full time", "job-type": "Full time (鎧)", "status": "Inactive" },
    { "name": "山永 芽依", "category": "full time", "job-type": "Full time", "status": "Inactive" },
    { "name": "髙崎 陸人", "category": "full time", "job-type": "Taniyama", "status": "Active" },
    { "name": "井手 ちひろ", "category": "part time", "job-type": "Taniyama", "status": "Inactive" },
    { "name": "Michael", "category": "part time", "job-type": "Part-Timer; *Fri Taniyama", "status": "Active" },
    { "name": "Shawn", "category": "full time", "job-type": "Full time", "status": "Active" },
    { "name": "Chris", "category": "full time", "job-type": "Full time(Pre&C-Lab); *Wed,Thu Taniyama", "status": "Active" },
    { "name": "Simon", "category": "full time", "job-type": "Full time (LEAP); *Tue Taniyama", "status": "Active" },
    { "name": "Eve(曲天娃)", "category": "part time", "job-type": "Part-Timer", "status": "Active" },
    { "name": "Aznieta", "category": "part time", "job-type": "Part-Timer", "status": "Active" },
    { "name": "納 麗子", "category": "part time", "job-type": "7:30-13:30; *Less than 30H/w", "status": "Active" },
    { "name": "尾崎 由香", "category": "part time", "job-type": "Part-Timer; 20H/w or 92H/m", "status": "Active" },
    { "name": "森内 菜月", "category": "full time", "job-type": "9:00-18:00", "status": "Active" },
    { "name": "堀川 真理子", "category": "full time", "job-type": "CEO's Secretary(鎧)", "status": "Active" },
    { "name": "岩重 友明", "category": "part time", "job-type": "Wed,Fri,Sat", "status": "Active" },
    { "name": "Evan", "category": "full time", "job-type": "IT manager(本社)", "status": "Active" },
    { "name": "髙木 璃瑚", "category": "part time", "job-type": "Part-Timer", "status": "Active" },
    { "name": "大迫 佳乃", "category": "part time", "job-type": "Part-Timer", "status": "Active" },
    { "name": "Junko", "category": "part time", "job-type": "Janitor", "status": "Active" }
];

async function registerEmployees() {
    console.log('Starting bulk registration for employees...');

    // 1. Fetch Categories
    const { data: categories, error: catError } = await supabase
        .from('categories')
        .select('id, name')
        .eq('for_role', 'employee');

    if (catError) {
        console.error('Error fetching categories:', catError);
        return;
    }

    const categoryMap = {};
    categories.forEach(c => categoryMap[c.name] = c.id);
    console.log('Category Map:', categoryMap);

    // Map user input to DB category names
    const inputCategoryMap = {
        'full time': 'fulltime',
        'part time': 'partime'
    };

    // 2. Get current max EMP code
    const { data: maxCodeData, error: maxCodeError } = await supabase
        .from('people')
        .select('code')
        .like('code', 'EMP%')
        .order('code', { ascending: false })
        .limit(1);

    let nextCodeNum = 1;
    if (maxCodeData && maxCodeData.length > 0) {
        const lastCode = maxCodeData[0].code;
        const numPart = parseInt(lastCode.replace('EMP', ''));
        if (!isNaN(numPart)) {
            nextCodeNum = numPart + 1;
        }
    }

    // 3. Insert Employees
    const employeesToInsert = [];

    for (const emp of employeesData) {
        const dbCategoryName = inputCategoryMap[emp.category];
        const categoryId = categoryMap[dbCategoryName];

        if (!categoryId) {
            console.warn(`Category ${emp.category} (mapped to ${dbCategoryName}) not found, skipping ${emp.name}.`);
            continue;
        }

        const code = `EMP${String(nextCodeNum).padStart(3, '0')}`;
        nextCodeNum++;

        employeesToInsert.push({
            code: code,
            full_name: emp.name,
            role: 'employee',
            category_id: categoryId,
            status: emp.status.toLowerCase(),
            job_type: emp['job-type'],
            registration_date: new Date().toISOString().split('T')[0]
        });
    }

    console.log(`Preparing to insert ${employeesToInsert.length} employees...`);

    const { data: insertData, error: insertError } = await supabase
        .from('people')
        .insert(employeesToInsert)
        .select();

    if (insertError) {
        console.error('Error inserting employees:', insertError);
    } else {
        console.log(`Successfully inserted ${insertData.length} employees.`);
    }
}

registerEmployees()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
