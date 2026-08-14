/**
 * MedAgent-Alpha — Drug Interaction Agent (Pharma Module)
 *
 * Implements §4.4 of PRD v1.4.
 * Data source: curated subset from publicly available drug interaction references
 * (formularium nasional, standard pharmacology textbooks).
 * This dataset covers common emergency drugs used in Indonesian hospital settings.
 *
 * In DEMO_MODE or when no LLM key is available, runs entirely on the
 * static interaction database below — no network call needed.
 */

import type { DrugInteraction } from '@/lib/supabase';
import { callPharmaLLM, parseLLMJson } from '@/lib/llm';

// ── Static interaction database ──────────────────────────────────────────────
// Format: [drugA_normalized, drugB_normalized, severity, description]
// Drug names are lowercase and stripped of doses for matching.

type InteractionEntry = {
  drug_a: string;
  drug_b: string;
  severity: 'ringan' | 'sedang' | 'berat';
  description: string;
  source?: string;
};

const INTERACTION_DB: InteractionEntry[] = [
  {
    drug_a: 'warfarin',
    drug_b: 'aspirin',
    severity: 'berat',
    description: 'Kombinasi warfarin dan aspirin meningkatkan risiko perdarahan secara signifikan. Hindari bila memungkinkan; monitor INR ketat.',
  },
  {
    drug_a: 'warfarin',
    drug_b: 'ibuprofen',
    severity: 'berat',
    description: 'NSAID seperti ibuprofen menghambat agregasi trombosit dan meningkatkan efek antikoagulan warfarin → risiko perdarahan tinggi.',
  },
  {
    drug_a: 'digoksin',
    drug_b: 'amiodaron',
    severity: 'berat',
    description: 'Amiodaron menghambat eliminasi digoksin dan meningkatkan kadar plasma digoksin → risiko toksisitas digoksin (aritmia).',
  },
  {
    drug_a: 'metformin',
    drug_b: 'kontras iodine',
    severity: 'berat',
    description: 'Kontras iodinasi dapat menyebabkan gagal ginjal akut dan akumulasi metformin → risiko asidosis laktat. Hentikan metformin 48 jam sebelum prosedur kontras.',
  },
  {
    drug_a: 'captopril',
    drug_b: 'spironolakton',
    severity: 'sedang',
    description: 'Kombinasi ACE inhibitor dan diuretik hemat kalium meningkatkan risiko hiperkalemia, terutama pada pasien gagal ginjal.',
  },
  {
    drug_a: 'lisinopril',
    drug_b: 'spironolakton',
    severity: 'sedang',
    description: 'Kombinasi ACE inhibitor dan diuretik hemat kalium meningkatkan risiko hiperkalemia.',
  },
  {
    drug_a: 'metoprolol',
    drug_b: 'verapamil',
    severity: 'berat',
    description: 'Kombinasi beta-blocker dan calcium channel blocker non-dihidropiridin dapat menyebabkan bradikardi berat, blok AV, atau henti jantung.',
  },
  {
    drug_a: 'atenolol',
    drug_b: 'verapamil',
    severity: 'berat',
    description: 'Kombinasi beta-blocker dan verapamil → risiko bradikardi berat dan blok AV tingkat tinggi.',
  },
  {
    drug_a: 'tramadol',
    drug_b: 'ssri',
    severity: 'berat',
    description: 'Risiko sindrom serotonin bila tramadol dikombinasikan dengan SSRI (sertraline, fluoxetine, escitalopram). Gejala: agitasi, tremor, hipertermia.',
  },
  {
    drug_a: 'tramadol',
    drug_b: 'fluoxetine',
    severity: 'berat',
    description: 'Risiko sindrom serotonin dan kejang; tramadol menghambat reuptake serotonin secara sinergis dengan fluoxetine.',
  },
  {
    drug_a: 'clopidogrel',
    drug_b: 'omeprazol',
    severity: 'sedang',
    description: 'Omeprazol menghambat CYP2C19 dan mengurangi aktivasi clopidogrel menjadi metabolit aktifnya → penurunan efek antiplatelet.',
  },
  {
    drug_a: 'simvastatin',
    drug_b: 'amiodaron',
    severity: 'sedang',
    description: 'Amiodaron menghambat CYP3A4 dan meningkatkan kadar simvastatin → risiko miopati dan rabdomiolisis.',
  },
  {
    drug_a: 'simvastatin',
    drug_b: 'eritromisin',
    severity: 'sedang',
    description: 'Eritromisin menghambat CYP3A4 → peningkatan kadar simvastatin → risiko miopati.',
  },
  {
    drug_a: 'furosemid',
    drug_b: 'aminoglikosida',
    severity: 'berat',
    description: 'Kombinasi loop diuretik dan aminoglikosida meningkatkan risiko ototoksisitas (gangguan pendengaran permanen).',
  },
  {
    drug_a: 'heparin',
    drug_b: 'aspirin',
    severity: 'sedang',
    description: 'Kombinasi heparin dan aspirin meningkatkan risiko perdarahan. Perlu monitoring ketat bila keduanya diperlukan.',
  },
  {
    drug_a: 'insulin',
    drug_b: 'metoprolol',
    severity: 'sedang',
    description: 'Beta-blocker dapat menutupi tanda-tanda hipoglikemia (terutama takikardia dan tremor) pada pasien yang menerima insulin.',
  },
  {
    drug_a: 'phenytoin',
    drug_b: 'warfarin',
    severity: 'sedang',
    description: 'Phenytoin dapat meningkatkan atau menurunkan efek warfarin secara tidak terprediksi → monitor INR lebih sering.',
  },
  {
    drug_a: 'ciprofloxacin',
    drug_b: 'warfarin',
    severity: 'sedang',
    description: 'Fluorokuinolon menghambat CYP1A2 dan meningkatkan efek antikoagulan warfarin → monitor INR.',
  },
  {
    drug_a: 'amlodipine',
    drug_b: 'simvastatin',
    severity: 'ringan',
    description: 'Amlodipine dosis tinggi (≥10 mg) dapat meningkatkan kadar simvastatin. Batasi simvastatin ≤20 mg/hari bila dikombinasikan.',
  },
  {
    drug_a: 'dexamethasone',
    drug_b: 'insulin',
    severity: 'sedang',
    description: 'Kortikosteroid menyebabkan hiperglikemia dan meningkatkan kebutuhan insulin; perlu penyesuaian dosis insulin.',
  },
  {
    drug_a: 'morfin',
    drug_b: 'benzodiazepine',
    severity: 'berat',
    description: 'Kombinasi opioid dan benzodiazepine meningkatkan risiko depresi napas yang mengancam jiwa.',
  },
  {
    drug_a: 'morfin',
    drug_b: 'diazepam',
    severity: 'berat',
    description: 'Kombinasi opioid dan benzodiazepine → risiko depresi napas berat.',
  },
  {
    drug_a: 'ketorolac',
    drug_b: 'aspirin',
    severity: 'sedang',
    description: 'Penggunaan dua NSAID bersamaan meningkatkan risiko perdarahan saluran cerna dan komplikasi ginjal.',
    source: 'Pionas BPOM / Formularium Nasional',
  },
  // ── Additional interactions (expanded set) ──────────────────────────────────
  {
    drug_a: 'metronidazol',
    drug_b: 'warfarin',
    severity: 'berat',
    description: 'Metronidazol menghambat CYP2C9 sehingga meningkatkan kadar warfarin secara signifikan → risiko perdarahan berat. Monitor INR ketat dan pertimbangkan reduksi dosis warfarin.',
    source: 'Pionas BPOM / Formularium Nasional',
  },
  {
    drug_a: 'fluconazole',
    drug_b: 'warfarin',
    severity: 'berat',
    description: 'Flukonazol (antijamur) menghambat metabolisme warfarin → peningkatan INR drastis → risiko perdarahan serius. Hindari kombinasi atau monitor INR tiap 2 hari.',
    source: 'Pionas BPOM / Formularium Nasional',
  },
  {
    drug_a: 'ticagrelor',
    drug_b: 'aspirin',
    severity: 'sedang',
    description: 'Kombinasi ticagrelor + aspirin dosis tinggi (>100 mg/hari) meningkatkan risiko perdarahan tanpa manfaat klinis tambahan. Aspirin dosis maintenance harus ≤100 mg/hari bila dikombinasikan.',
    source: 'ESC Guidelines ACS 2020',
  },
  {
    drug_a: 'ramipril',
    drug_b: 'ibuprofen',
    severity: 'sedang',
    description: 'NSAID mengantagonis efek antihipertensi ACE inhibitor dan meningkatkan risiko gagal ginjal akut, terutama pada pasien lansia atau dehidrasi. Gunakan parasetamol sebagai alternatif analgesik.',
    source: 'Pionas BPOM / Formularium Nasional',
  },
  {
    drug_a: 'glibenklamid',
    drug_b: 'ciprofloxacin',
    severity: 'sedang',
    description: 'Fluorokuinolon dapat mempotentsiasi efek hipoglikemik sulfonilurea seperti glibenklamid → risiko hipoglikemia berat. Monitor gula darah lebih sering selama pemberian antibiotik.',
    source: 'Pionas BPOM / Formularium Nasional',
  },
  {
    drug_a: 'lithium',
    drug_b: 'ibuprofen',
    severity: 'berat',
    description: 'NSAID menurunkan ekskresi lithium oleh ginjal → akumulasi lithium → toksisitas (tremor, ataksia, konfusi, aritmia). Hindari kombinasi atau monitor kadar lithium serum ketat.',
    source: 'Meyler\'s Side Effects of Drugs, 16th Edition',
  },
  {
    drug_a: 'kolkisin',
    drug_b: 'klaritomisin',
    severity: 'berat',
    description: 'Klaritomisin menghambat P-glikoprotein dan CYP3A4, meningkatkan kadar kolkisin drastis → risiko toksisitas kolkisin (miopati, supresi sumsum tulang, gagal multiorgan). Kontraindikasi pada gagal ginjal.',
    source: 'FDA Drug Safety Communication',
  },
  {
    drug_a: 'statin',
    drug_b: 'fibrat',
    severity: 'sedang',
    description: 'Kombinasi statin dan fibrat (gemfibrozil, fenofibrat) meningkatkan risiko miopati dan rabdomiolisis. Fenofibrat lebih aman daripada gemfibrozil bila harus dikombinasikan. Monitor CK bila ada nyeri otot.',
    source: 'Pionas BPOM / Formularium Nasional',
  },
  {
    drug_a: 'tetrasiklin',
    drug_b: 'antasida',
    severity: 'sedang',
    description: 'Antasida mengandung kalsium, magnesium, atau aluminium yang mengikat tetrasiklin membentuk kelat tidak larut → absorpsi tetrasiklin berkurang drastis. Beri jarak ≥2 jam antara keduanya.',
    source: 'Pionas BPOM / Formularium Nasional',
  },
  {
    drug_a: 'ACE inhibitor',
    drug_b: 'kalium klorida',
    severity: 'sedang',
    description: 'ACE inhibitor mempertahankan kalium melalui penghambatan aldosteron. Suplementasi kalium tambahan bersamaan dapat menyebabkan hiperkalemia berbahaya, terutama pada pasien gagal ginjal.',
    source: 'Pionas BPOM / Formularium Nasional',
  },
];

// ── Normalization helper ──────────────────────────────────────────────────────

// Alias map untuk nama obat yang umum ditulis berbeda
const DRUG_ALIASES: Record<string, string> = {
  'aspirin': 'aspirin',
  'asam asetilsalisilat': 'aspirin',
  'aas': 'aspirin',
  'ibuprofen': 'ibuprofen',
  'brufen': 'ibuprofen',
  'cataflam': 'diklofenak',
  'voltaren': 'diklofenak',
  'warfarin': 'warfarin',
  'simarc': 'warfarin',
  'metformin': 'metformin',
  'glucophage': 'metformin',
  'digoxin': 'digoksin',
  'digoksin': 'digoksin',
  'amiodaron': 'amiodaron',
  'cordarone': 'amiodaron',
  'furosemide': 'furosemid',
  'furosemid': 'furosemid',
  'lasix': 'furosemid',
  'captopril': 'captopril',
  'lisinopril': 'lisinopril',
  'spironolactone': 'spironolakton',
  'spironolakton': 'spironolakton',
  'aldactone': 'spironolakton',
  'metoprolol': 'metoprolol',
  'seloken': 'metoprolol',
  'atenolol': 'atenolol',
  'verapamil': 'verapamil',
  'isoptin': 'verapamil',
  'tramadol': 'tramadol',
  'clopidogrel': 'clopidogrel',
  'plavix': 'clopidogrel',
  'omeprazole': 'omeprazol',
  'omeprazol': 'omeprazol',
  'omz': 'omeprazol',
  'simvastatin': 'simvastatin',
  'zocor': 'simvastatin',
  'heparin': 'heparin',
  'insulin': 'insulin',
  'novorapid': 'insulin',
  'lantus': 'insulin',
  'phenytoin': 'phenytoin',
  'dilantin': 'phenytoin',
  'ciprofloxacin': 'ciprofloxacin',
  'cipro': 'ciprofloxacin',
  'amlodipine': 'amlodipine',
  'norvasc': 'amlodipine',
  'dexamethasone': 'dexamethasone',
  'morphine': 'morfin',
  'morfin': 'morfin',
  'ms contin': 'morfin',
  'diazepam': 'diazepam',
  'valium': 'diazepam',
  'alprazolam': 'benzodiazepine',
  'lorazepam': 'benzodiazepine',
  'midazolam': 'benzodiazepine',
  'ketorolac': 'ketorolac',
  'toradol': 'ketorolac',
  'eritromisin': 'eritromisin',
  'erythromycin': 'eritromisin',
};

function normalizeDrug(name: string): string {
  const lower = name.toLowerCase().trim();
  return DRUG_ALIASES[lower] ?? lower;
}

// ── Static interaction checker ────────────────────────────────────────────────

function checkStaticInteractions(drugs: string[]): DrugInteraction[] {
  const normalized = drugs.map(normalizeDrug);
  const found: DrugInteraction[] = [];

  for (let i = 0; i < normalized.length; i++) {
    for (let j = i + 1; j < normalized.length; j++) {
      const a = normalized[i];
      const b = normalized[j];

      const match = INTERACTION_DB.find(
        (entry) =>
          (entry.drug_a === a && entry.drug_b === b) ||
          (entry.drug_a === b && entry.drug_b === a) ||
          // Handle cases where one drug is a category alias (e.g. 'benzodiazepine')
          (entry.drug_a === a && normalized.includes(entry.drug_b)) ||
          (entry.drug_b === a && normalized.includes(entry.drug_a))
      );

      if (match && !found.some((f) => f.drug_a === match.drug_a && f.drug_b === match.drug_b)) {
        found.push({
          drug_a: drugs[i],
          drug_b: drugs[j],
          severity: match.severity,
          description: match.description,
        });
      }
    }
  }

  return found;
}

// ── LLM-enhanced interaction check ───────────────────────────────────────────

async function checkWithLLM(drugs: string[], existingResults: DrugInteraction[], patientContext: any): Promise<DrugInteraction[]> {
  const prompt = `Kamu adalah apoteker klinis (clinical pharmacist) berpengalaman.
Daftar obat yang sedang dikonsumsi pasien: ${drugs.join(', ')}

Konteks Klinis Pasien Saat Ini:
- Keluhan: ${patientContext?.keluhan || 'Tidak ada data'}
- Tanda Vital: ${JSON.stringify(patientContext?.vitals || {})}

Dari basis data statis, interaksi berikut terdeteksi:
${existingResults.length > 0 ? existingResults.map(i => `- ${i.drug_a} + ${i.drug_b} (${i.severity}): ${i.description}`).join('\n') : '(tidak ada interaksi umum)'}

Tugas:
1. Evaluasi apakah interaksi tersebut SANGAT KRITIS dalam konteks tanda vital dan keluhan pasien ini.
2. Tambahkan peringatan atau instruksi klinis spesifik pada bagian \`description\`.
3. Bila ada obat dalam daftar yang berisiko memperburuk keluhan atau tanda vital (walaupun bukan interaksi antar obat, tapi drug-disease interaction), sertakan juga. (Beri \`drug_a\` nama obat, dan \`drug_b\` "KONDISI KLINIS").

Balas HANYA dalam format JSON array dengan struktur:
[{"drug_a": "...", "drug_b": "...", "severity": "ringan|sedang|berat", "description": "..."}]

Jika aman dan tidak ada catatan khusus, kembalikan array \`existingResults\` dengan deskripsinya.`;

  try {
    const raw = await callPharmaLLM([{ role: 'user', content: prompt }], {
      response_format: { type: 'json_object' },
      max_tokens: 512,
    });

    const parsed = parseLLMJson<DrugInteraction[] | { interactions: DrugInteraction[] }>(raw);
    if (!parsed) return existingResults;

    const items: DrugInteraction[] = Array.isArray(parsed)
      ? parsed
      : (parsed as { interactions: DrugInteraction[] }).interactions ?? [];

    const validItems = items.filter(
      (item) =>
        typeof item.drug_a === 'string' &&
        typeof item.drug_b === 'string' &&
        ['ringan', 'sedang', 'berat'].includes(item.severity) &&
        typeof item.description === 'string'
    );
    
    return validItems.length > 0 ? validItems : existingResults;
  } catch (err) {
    console.error('[Pharma] LLM analysis failed:', err);
    return existingResults;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface DrugCheckResult {
  interactions: DrugInteraction[];
  checked_drugs: string[];
  has_critical: boolean;
}

export async function checkDrugInteractions(
  drugs: string[],
  patientContext?: { keluhan?: string; vitals?: any }
): Promise<DrugCheckResult> {
  if (!drugs || drugs.length === 0) {
    return { interactions: [], checked_drugs: drugs ?? [], has_critical: false };
  }
  
  if (drugs.length === 1 && !patientContext) {
    return { interactions: [], checked_drugs: drugs, has_critical: false };
  }

  // Step 1: static database (always runs, no API call)
  const staticResults = checkStaticInteractions(drugs);

  // Step 2: LLM augmentation (Context-Aware Clinical Pharmacist)
  let allInteractions = staticResults;
  if (process.env.DEMO_MODE !== 'true' && patientContext) {
    allInteractions = await checkWithLLM(drugs, staticResults, patientContext);
  }

  // Sort by severity: berat → sedang → ringan
  const severityOrder: Record<string, number> = { berat: 0, sedang: 1, ringan: 2 };
  allInteractions.sort((a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3));

  return {
    interactions: allInteractions,
    checked_drugs: drugs,
    has_critical: allInteractions.some((i) => i.severity === 'berat'),
  };
}
