// Import Satasaurus students
require('dotenv').config({ path: './app/.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const STUDENTS_INPUT = `
Alan Taniguchi_谷口碧麗
Aoto Ozaki_尾崎蒼虎
Ena Miyahara_宮原英那
Hanna Rotter_ロッター華
Haru Kawakami_川上波留
Honoka Rotter_ロッター峰乃花
Ichika Kimiya_木宮一千花
Iroha Kawahara_川原彩蓮
Kinari Shinmura_新村生成
Luka Hombo_本坊琉華
Nana Fukuda_福田夏々
Natsuki Shimonosono_下之薗那月
Raina Take_武頼那
Rita Utsunomiya_宇都宮稜拓
Sana Sakakibara_榊原彩七
Sawa Oyama_大山紗和
Taito Yoneyama_米山大迪
Tomoaki Hidaka_日髙智覚
Touri Tokuda_德田桐李
Tsukika Iwaki_岩木月佳
Yusaku Noguchi_野口悠朔
Soma Shimonosono_下之薗湊真
Yuniji Iwaki_岩木夕虹
Aoi Hidaka_日高碧彩
Cocomi Matsumoto_松元心美
Cocona Mastumoto_松元心虹
MihiroTokuda_德田美寛
Aco Nakata_中田葵子
Arata Yamasaki_山崎新
Chiharu Tochigi_栃木千晴
Hikari Jin_仁ひかり
Himari Chuman_中馬一眞莉
Honoka Utsunomiya_宇都宮穂果
Ito Fukuyama_福山依利
Ito Takada_高多壱采
Kito Nakamata_中俣稀斗
Kyoka Utsunomiya_宇都宮京花
Niki Nakamata_中俣仁希
Rento Maeda_前田漣人
Rinka Jin_仁りんか
Riku Hidaka_日高理琥
Saki Kuwashiro_桑代彩生
Shu Hidaka_日高鷲
Shun Kirita_切田竣
Sosuke Sueshige_末重壮亮
Takara Tochigi_栃木崇良
Tao Inamori_稲盛太王
Towa Hidaka_日高翔和
Tsukuru Nakama_中間創
Waka Takada_高多笑叶
Yui Utsunomiya_宇都宮由依
Yui Oshita_尾下唯
Neo Kobayashi_小林仁彦
Itsuki Uehara_上原偉月
Hinano Takagi_髙木姫捺乃
Chihiro Yamasaki_山﨑千尋
Sannna Kamisasanuki_上笹貫珊凪
Nami Fukuyama_福山奈巳
`;

async function main() {
    console.log('Starting Satasaurus Import...');

    // 1. Get or Create Satasaurus Category
    let satasaurusId;
    const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('id')
        .ilike('name', '%satasaurus%')
        .single();

    if (catData) {
        satasaurusId = catData.id;
        console.log(`Found Satasaurus Category: ${satasaurusId}`);
    } else {
        console.log('Satasaurus category not found, creating...');
        const { data: newCat, error: createError } = await supabase
            .from('categories')
            .insert({ name: 'Satasaurus Class', for_role: 'student', is_active: true, sort_order: 100 })
            .select('id')
            .single();
        if (createError) {
            console.error('Failed to create category:', createError);
            return;
        }
        satasaurusId = newCat.id;
        console.log(`Created Satasaurus Category: ${satasaurusId}`);
    }

    // 2. Process list
    const entries = STUDENTS_INPUT.trim().split('\n').filter(line => line.trim());

    for (const entry of entries) {
        let [englishName, japaneseName] = entry.split('_').map(s => s.trim());
        if (!japaneseName) {
            // Handle cases where underscore might be missing or different format
            // Assuming format is strictly Name_JapaneseName
            console.warn(`Invalid entry format: ${entry}`);
            continue;
        }

        console.log(`Processing: ${englishName} (${japaneseName})`);

        // Check if exists by full_name or japanese_name
        const { data: existing, error: findError } = await supabase
            .from('people')
            .select('id, full_name, person_categories(category_id)')
            .or(`full_name.eq.${englishName},japanese_name.eq.${japaneseName}`)
            .single();

        let personId;

        if (existing) {
            personId = existing.id;
            console.log(`  Found existing student: ${existing.full_name}`);
        } else {
            // Create new student
            const { data: latest } = await supabase
                .from('people')
                .select('code')
                .like('code', 'STU%')
                .order('code', { ascending: false })
                .limit(1)
                .single();

            let newCode = 'STU001';
            if (latest && latest.code) {
                const num = parseInt(latest.code.replace('STU', ''));
                newCode = `STU${String(num + 1).padStart(3, '0')}`;
            }

            const { data: newPerson, error: createError } = await supabase
                .from('people')
                .insert({
                    code: newCode,
                    full_name: englishName,
                    japanese_name: japaneseName,
                    role: 'student',
                    status: 'active',
                    category_id: satasaurusId // Set primary/legacy category
                })
                .select('id')
                .single();

            if (createError) {
                console.error(`  Failed to create student ${englishName}:`, createError);
                continue;
            }
            personId = newPerson.id;
            console.log(`  Created new student: ${englishName} (${newCode})`);
        }

        // Add to Satasaurus category in person_categories
        const { error: linkError } = await supabase
            .from('person_categories')
            .insert({
                person_id: personId,
                category_id: satasaurusId
            })
            .select();

        if (linkError) {
            if (linkError.code === '23505') { // Unique violation
                console.log(`  Already in Satasaurus category.`);
            } else {
                console.error(`  Failed to add category:`, linkError);
            }
        } else {
            console.log(`  Added to Satasaurus category.`);
        }
    }
    console.log('Import completed.');
}

main()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
