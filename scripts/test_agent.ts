import { getSupabaseAdmin } from '../src/lib/supabase';
import { runOrchestrator } from '../src/lib/orchestrator';

async function main() {
  console.log('🚀 Memulai Uji Coba Agentic AI (End-to-End)...');
  const admin = getSupabaseAdmin();

  // 1. Buat data pasien yang kompleks
  // Pasien dengan nyeri dada (SKA) dan potensi interaksi obat (Sildenafil + Nitrat/Amlodipine)
  const dummyCase = {
    nama: 'Bpk. Budi Test-Agent',
    age_value: 55,
    age_unit: 'Tahun',
    age_months: 55 * 12,
    jenis_kelamin: 'Laki-laki',
    keluhan_utama: 'Dada terasa ampek seperti ditimpa beban berat, menjalar ke rahang dan keringat dingin sejak 1 jam lalu.',
    vital_signs: {
      spo2: 92,
      systolic: 95,
      diastolic: 60,
      heart_rate: 110,
      respiratory_rate: 24,
      temperature: 36.5,
      gcs: 15
    },
    riwayat_medis: {
      kondisi_kronis: ['Hipertensi', 'Disfungsi Ereksi'],
      obat_dikonsumsi: ['Amlodipine', 'Sildenafil', 'Aspirin'] // sengaja dimasukkan sildenafil untuk test pharma
    },
    current_node: 'intake'
  };

  console.log('📥 1. Mendaftarkan pasien simulasi ke IGD (Database)...');
  const { data: newCase, error: insertErr } = await admin
    .from('cases')
    .insert(dummyCase as any)
    .select('id')
    .single();

  if (insertErr || !newCase) {
    console.error('❌ Gagal insert pasien:', insertErr);
    return;
  }

  const caseId = newCase.id;
  console.log(`✅ Pasien terdaftar dengan ID: ${caseId}`);

  console.log('⚙️ 2. Membangunkan Orchestrator Agent (proses ini akan memakan waktu)...');
  const startTime = Date.now();
  await runOrchestrator(caseId);
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`✅ Orchestrator selesai bekerja dalam ${duration} detik.`);

  console.log('📊 3. Mengambil Hasil Akhir dari Database...');
  const { data: finalCase, error: fetchErr } = await admin
    .from('cases')
    .select('*')
    .eq('id', caseId)
    .single();

  if (fetchErr || !finalCase) {
    console.error('❌ Gagal fetch data akhir:', fetchErr);
    return;
  }

  // Tampilkan Ringkasan Hasil
  console.log('\n======================================================');
  console.log('🏥 HASIL KEPUTUSAN AGEN KLINIS (TRIAGE & DIAGNOSTIC)');
  console.log('======================================================');
  console.log(`- Nama Pasien   : ${finalCase.nama}`);
  console.log(`- Status ESI    : Level ${finalCase.esi_score} (${finalCase.triage_warna})`);
  console.log(`- Confidence    : ${finalCase.confidence_level}`);
  console.log(`- Node Terakhir : ${finalCase.current_node}`);
  
  console.log('\n📚 4. HASIL ITERATIVE RAG (Referensi Ditemukan):');
  const ragRefs = finalCase.rag_references || [];
  if (ragRefs.length > 0) {
    ragRefs.forEach((r: any, i: number) => {
      console.log(`   [${i+1}] ${r.title} (Sumber: ${r.source})`);
    });
  } else {
    console.log('   (Tidak ada referensi RAG)');
  }

  console.log('\n💊 5. HASIL CONTEXT-AWARE PHARMA CHECK (Interaksi Obat):');
  const pharma = finalCase.drug_interactions || [];
  if (pharma.length > 0) {
    pharma.forEach((p: any) => {
      console.log(`   ⚠️ [${p.severity.toUpperCase()}] ${p.drug_a} + ${p.drug_b}`);
      console.log(`      Ket: ${p.description}`);
    });
  } else {
    console.log('   (Aman, tidak ada interaksi berbahaya)');
  }

  console.log('\n📝 6. DRAFT SOAP OLEH AGENT (Post Self-Critique):');
  const soap = finalCase.soap_summary;
  if (soap) {
    console.log(`   S: ${soap.subjective}`);
    console.log(`   O: ${soap.objective}`);
    console.log(`   A: ${soap.assessment}`);
    console.log(`   P: ${soap.plan}`);
  } else {
    console.log('   (Gagal men-generate SOAP)');
  }
  
  console.log('\n💬 7. CLARIFICATION LOOP (Bila ada pertanyaan untuk perawat):');
  if (finalCase.clarification_data && finalCase.clarification_data.questions) {
    finalCase.clarification_data.questions.forEach((q: string, i: number) => {
      console.log(`   [Q${i+1}] ${q}`);
    });
  } else {
    console.log('   (Tidak ada pertanyaan tambahan, data dinilai cukup)');
  }

  console.log('======================================================\n');
}

main().catch(console.error);
