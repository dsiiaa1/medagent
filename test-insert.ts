import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ovfvujocyukgkznipimd.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error("Please provide SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

async function run() {
  const { data, error } = await admin
    .from('cases')
    .insert({
      nama: 'Test Patient',
      age_value: 30,
      age_unit: 'Tahun',
      age_months: 360,
      jenis_kelamin: 'Laki-laki',
      keluhan_utama: 'Sakit perut',
      vital_signs: {},
      riwayat_medis: {
        kondisi_kronis: [],
        alergi: [],
        obat_dikonsumsi: [],
      },
      current_node: 'intake',
    })
    .select('id')
    .single();

  if (error) {
    console.error("Insert Error:", error);
  } else {
    console.log("Success:", data);
  }
}

run();
