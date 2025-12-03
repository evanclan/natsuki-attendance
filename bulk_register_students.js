require('dotenv').config({ path: './app/.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const studentsData = {
    "Academy": [
        { "full_name": "Alan Taniguchi", "japanese_name": "谷口碧麗" },
        { "full_name": "Aoi Hidaka", "japanese_name": "日高碧彩" },
        { "full_name": "Aoto Ozaki", "japanese_name": "尾崎蒼虎" },
        { "full_name": "Ena Miyahara", "japanese_name": "宮原英那" },
        { "full_name": "Hanna Rotter", "japanese_name": "ロッター華" },
        { "full_name": "Haru Kawakami", "japanese_name": "川上波留" },
        { "full_name": "Honoka Rotter", "japanese_name": "ロッター峰乃花" },
        { "full_name": "Ichika Kimiya", "japanese_name": "木宮一千花" },
        { "full_name": "Iroha Kawahara", "japanese_name": "川原彩蓮" },
        { "full_name": "Kanoa Matsuoka", "japanese_name": "松岡叶空" },
        { "full_name": "Kinari Shinmura", "japanese_name": "新村生成" },
        { "full_name": "Lui Takeuchi", "japanese_name": "竹内琉偉" },
        { "full_name": "Luka Hombo", "japanese_name": "本坊琉華" },
        { "full_name": "Mico Niwa", "japanese_name": "丹羽美心" },
        { "full_name": "Minori Takahashi", "japanese_name": "髙橋みのり" },
        { "full_name": "Nana Fukuda", "japanese_name": "福田夏々" },
        { "full_name": "Nana Takeda", "japanese_name": "竹田成花" },
        { "full_name": "Natsuki Shimonosono", "japanese_name": "下之薗那月" },
        { "full_name": "Oto Kinoshita", "japanese_name": "木之下愛采" },
        { "full_name": "Raina Take", "japanese_name": "武頼那" },
        { "full_name": "Rita Utsunomiya", "japanese_name": "宇都宮稜拓" },
        { "full_name": "Rui Matsuura", "japanese_name": "松浦潤" },
        { "full_name": "Sana Sakakibara", "japanese_name": "榊原彩七" },
        { "full_name": "Sawa Oyama", "japanese_name": "大山紗和" },
        { "full_name": "Taito Yoneyama", "japanese_name": "米山大迪" },
        { "full_name": "Tomoaki Hidaka", "japanese_name": "日髙智覚" },
        { "full_name": "Touri Tokuda", "japanese_name": "德田桐李" },
        { "full_name": "Tsukika Iwaki", "japanese_name": "岩木月佳" },
        { "full_name": "Yusaku Noguchi", "japanese_name": "野口悠朔" }
    ],
    "Ex": [
        { "full_name": "Soma Shimonosono", "japanese_name": "下之薗湊真" },
        { "full_name": "Yuniji Iwaki", "japanese_name": "岩木夕虹" }
    ],
    "C-Lab": [
        { "full_name": "Akihito Takeda", "japanese_name": "竹田章人" },
        { "full_name": "Camellie Fukushima", "japanese_name": "福島かめり" },
        { "full_name": "Chie Hirata", "japanese_name": "平田千瑛" },
        { "full_name": "Chihiro Tokunaga", "japanese_name": "徳永千尋" },
        { "full_name": "Cocomi Matsumoto", "japanese_name": "松元心美" },
        { "full_name": "Cocona Matsumoto", "japanese_name": "松元心虹" },
        { "full_name": "Konoka Hirata", "japanese_name": "平田このか" },
        { "full_name": "Makoto Mitsuzno", "japanese_name": "満薗一" },
        { "full_name": "Miharu Hori", "japanese_name": "堀心榛" },
        { "full_name": "Mihiro Tokuda", "japanese_name": "德田美寛" },
        { "full_name": "Mio Kohara", "japanese_name": "小原澪" },
        { "full_name": "Nao Takeda", "japanese_name": "竹田奈央" },
        { "full_name": "Rin Kohara", "japanese_name": "小原凜" },
        { "full_name": "Safca Fukushima", "japanese_name": "福島紗玄" },
        { "full_name": "Taiju Eto", "japanese_name": "衛藤大珠" },
        { "full_name": "Yoshiki Nakashima", "japanese_name": "中島慶極" },
        { "full_name": "Aoi Nakashima", "japanese_name": "中島碧唯" }
    ]
};

async function registerStudents() {
    console.log('Starting bulk registration...');

    // 1. Fetch Categories
    const { data: categories, error: catError } = await supabase
        .from('categories')
        .select('id, name')
        .in('name', ['Academy', 'Ex', 'C-Lab']);

    if (catError) {
        console.error('Error fetching categories:', catError);
        return;
    }

    const categoryMap = {};
    categories.forEach(c => categoryMap[c.name] = c.id);
    console.log('Category Map:', categoryMap);

    // 2. Get current max STU code
    const { data: maxCodeData, error: maxCodeError } = await supabase
        .from('people')
        .select('code')
        .like('code', 'STU%')
        .order('code', { ascending: false })
        .limit(1);

    let nextCodeNum = 1;
    if (maxCodeData && maxCodeData.length > 0) {
        const lastCode = maxCodeData[0].code;
        const numPart = parseInt(lastCode.replace('STU', ''));
        if (!isNaN(numPart)) {
            nextCodeNum = numPart + 1;
        }
    }

    // 3. Insert Students
    const studentsToInsert = [];

    for (const [categoryName, students] of Object.entries(studentsData)) {
        const categoryId = categoryMap[categoryName];
        if (!categoryId) {
            console.warn(`Category ${categoryName} not found, skipping students.`);
            continue;
        }

        for (const student of students) {
            const code = `STU${String(nextCodeNum).padStart(3, '0')}`;
            nextCodeNum++;

            studentsToInsert.push({
                code: code,
                full_name: student.full_name,
                japanese_name: student.japanese_name,
                role: 'student',
                category_id: categoryId,
                status: 'active',
                registration_date: new Date().toISOString().split('T')[0]
            });
        }
    }

    console.log(`Preparing to insert ${studentsToInsert.length} students...`);

    // Insert in batches or one by one to handle potential errors gracefully?
    // Let's do one big insert for now, it's not that many records (around 50).
    const { data: insertData, error: insertError } = await supabase
        .from('people')
        .insert(studentsToInsert)
        .select();

    if (insertError) {
        console.error('Error inserting students:', insertError);
    } else {
        console.log(`Successfully inserted ${insertData.length} students.`);
        // console.log(insertData);
    }
}

registerStudents()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
