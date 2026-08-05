'use client';

/**
 * /input — Nurse intake form for new patient registration.
 * Uses useActionState (React 19) with the submitIntake Server Action.
 */

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { submitIntake, type IntakeFormState } from '@/app/actions';
import { Siren, TriangleAlert, User, Stethoscope, Activity, FileText, BrainCircuit } from 'lucide-react';

const initialState: IntakeFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-red-600 px-6 py-4 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm flex items-center justify-center gap-2"
    >
      {pending ? (
        <>
          <span className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          Memproses Data Pasien...
        </>
      ) : (
        <>
          <Siren className="w-5 h-5" />
          Daftarkan Pasien & Mulai Triase
        </>
      )}
    </button>
  );
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1.5 text-xs font-medium text-red-600">{errors[0]}</p>;
}

function SectionTitle({ icon, title, step }: { icon: React.ReactNode, title: string, step: number }) {
  return (
    <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-5">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-500">
        {step}
      </div>
      <div className="flex items-center gap-2 text-gray-900 font-semibold">
        {icon}
        <h2 className="text-base">{title}</h2>
      </div>
    </div>
  );
}

function Label({ htmlFor, children, required, hint }: { htmlFor: string; children: React.ReactNode; required?: boolean, hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-semibold text-gray-700 mb-1.5">
      {children} 
      {required && <span className="text-red-500 ml-1">*</span>}
      {hint && <span className="ml-2 font-normal text-xs text-gray-400">{hint}</span>}
    </label>
  );
}

const inputCls = 'w-full rounded-lg border border-gray-300 bg-gray-50/50 px-4 py-2.5 text-sm transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500';
const inputErrCls = 'w-full rounded-lg border border-red-400 bg-red-50/30 px-4 py-2.5 text-sm transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500';

export default function InputPage() {
  const [state, formAction] = useActionState(submitIntake, initialState);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">
      {/* Page header */}
      <div className="mb-8 border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">Input Pasien Baru</h1>
        <p className="text-gray-500">
          Isi data awal pasien untuk memulai proses analisis otomatis (RAG + ESI). 
          Field bertanda <span className="text-red-500 font-bold">*</span> wajib diisi.
        </p>
      </div>

      {/* Global error */}
      {state.message && (
        <div className="mb-6 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-sm">
          <TriangleAlert className="h-5 w-5 shrink-0 text-red-500" />
          <p>{state.message}</p>
        </div>
      )}

      <form action={formAction} className="space-y-8">
        
        {/* ── Langkah 1: Identitas Pasien ────────────────────────────────────── */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <SectionTitle step={1} icon={<User className="w-5 h-5 text-blue-500" />} title="Identitas Pasien" />
          <div className="grid gap-5 sm:grid-cols-2">
            {/* Nama */}
            <div className="sm:col-span-2">
              <Label htmlFor="nama" required>Nama Lengkap / ID Rekam Medis</Label>
              <input
                id="nama"
                name="nama"
                type="text"
                placeholder="Masukkan nama lengkap pasien..."
                className={state.errors?.nama ? inputErrCls : inputCls}
                aria-describedby="nama-error"
              />
              <FieldError errors={state.errors?.nama} />
            </div>

            {/* Usia */}
            <div>
              <Label htmlFor="age_value" required>Usia</Label>
              <div className="flex gap-2">
                <input
                  id="age_value"
                  name="age_value"
                  type="number"
                  min={1}
                  placeholder="Angka"
                  className={`flex-1 rounded-lg border ${state.errors?.age_value ? 'border-red-400 bg-red-50/30' : 'border-gray-300 bg-gray-50/50'} px-4 py-2.5 text-sm transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500`}
                />
                <select
                  name="age_unit"
                  defaultValue="Tahun"
                  className="rounded-lg border border-gray-300 bg-gray-50/50 px-4 py-2.5 text-sm transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                >
                  <option value="Tahun">Tahun</option>
                  <option value="Bulan">Bulan</option>
                </select>
              </div>
              <FieldError errors={state.errors?.age_value} />
            </div>

            {/* Jenis Kelamin */}
            <div>
              <Label htmlFor="jenis_kelamin" required>Jenis Kelamin</Label>
              <select
                id="jenis_kelamin"
                name="jenis_kelamin"
                defaultValue="Laki-laki"
                className={inputCls}
              >
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Langkah 2: Keluhan Utama ───────────────────────────────────────── */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <SectionTitle step={2} icon={<Stethoscope className="w-5 h-5 text-amber-500" />} title="Keluhan Utama" />
          <div>
            <Label htmlFor="keluhan_utama" required>Deskripsi Keluhan</Label>
            <textarea
              id="keluhan_utama"
              name="keluhan_utama"
              rows={4}
              placeholder="Deskripsikan keluhan pasien secara rinci..."
              className={`${state.errors?.keluhan_utama ? inputErrCls : inputCls} resize-y`}
            />
            <FieldError errors={state.errors?.keluhan_utama} />
          </div>
        </div>

        {/* ── Langkah 3: Tanda Vital ─────────────────────────────────────────── */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between mb-2">
            <SectionTitle step={3} icon={<Activity className="w-5 h-5 text-red-500" />} title="Tanda Vital" />
          </div>
          <p className="text-sm text-gray-500 mb-6 -mt-3 ml-11">
            Data vital sangat menentukan skor ESI secara otomatis. Kosongkan jika belum diukur.
          </p>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label htmlFor="spo2" hint="(normal: 95-100%)">SpO2 (%)</Label>
              <input id="spo2" name="spo2" type="number" min={0} max={100} placeholder="mis. 98" className={inputCls} />
              <FieldError errors={state.errors?.spo2} />
            </div>

            <div>
              <Label htmlFor="systolic" hint="(normal: 90-120)">Tek. Sistol (mmHg)</Label>
              <input id="systolic" name="systolic" type="number" min={0} max={300} placeholder="mis. 120" className={inputCls} />
            </div>

            <div>
              <Label htmlFor="diastolic" hint="(normal: 60-80)">Tek. Diastol (mmHg)</Label>
              <input id="diastolic" name="diastolic" type="number" min={0} max={200} placeholder="mis. 80" className={inputCls} />
            </div>

            <div>
              <Label htmlFor="heart_rate" hint="(normal: 60-100)">Detak Jantung (bpm)</Label>
              <input id="heart_rate" name="heart_rate" type="number" min={0} max={300} placeholder="mis. 88" className={inputCls} />
              <FieldError errors={state.errors?.heart_rate} />
            </div>

            <div>
              <Label htmlFor="respiratory_rate" hint="(normal: 12-20)">Laju Napas (x/mnt)</Label>
              <input id="respiratory_rate" name="respiratory_rate" type="number" min={0} max={100} placeholder="mis. 18" className={inputCls} />
            </div>

            <div>
              <Label htmlFor="temperature" hint="(normal: 36.5-37.5)">Suhu (°C)</Label>
              <input id="temperature" name="temperature" type="number" min={20} max={45} step={0.1} placeholder="mis. 37.2" className={inputCls} />
            </div>

            <div>
              <Label htmlFor="gcs" hint="(normal: 15)">GCS (3–15)</Label>
              <input id="gcs" name="gcs" type="number" min={3} max={15} placeholder="mis. 15" className={inputCls} />
            </div>
          </div>
        </div>

        {/* ── Langkah 4: Riwayat Medis ───────────────────────────────────────── */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <SectionTitle step={4} icon={<FileText className="w-5 h-5 text-emerald-500" />} title="Riwayat Medis & Obat" />
          
          <div className="grid gap-5">
            <div>
              <Label htmlFor="kondisi_kronis" hint="(Pisahkan dengan koma)">Kondisi Kronis / Penyakit Latar</Label>
              <input
                id="kondisi_kronis"
                name="kondisi_kronis"
                type="text"
                placeholder="mis. Hipertensi, DM tipe 2"
                className={inputCls}
              />
            </div>

            <div>
              <Label htmlFor="alergi" hint="(Pisahkan dengan koma)">Alergi</Label>
              <input
                id="alergi"
                name="alergi"
                type="text"
                placeholder="mis. Penisilin, Makanan Laut"
                className={inputCls}
              />
            </div>

            <div>
              <Label htmlFor="obat_dikonsumsi" hint="(Pisahkan dengan koma)">Obat yang Sedang Dikonsumsi</Label>
              <input
                id="obat_dikonsumsi"
                name="obat_dikonsumsi"
                type="text"
                placeholder="mis. Metformin 500mg, Warfarin"
                className={inputCls}
              />
              <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                <BrainCircuit className="w-3 h-3"/> Data obat ini akan otomatis dicek oleh agent farmasi untuk deteksi interaksi obat.
              </p>
            </div>
          </div>
        </div>

        {/* ── Disclaimer ──────────────────────────────────────────── */}
        <div className="flex gap-4 rounded-xl border-y border-r border-l-4 border-l-amber-500 border-y-amber-200 border-r-amber-200 bg-amber-50 p-5 shadow-sm mt-4">
          <TriangleAlert className="h-6 w-6 text-amber-600 shrink-0" />
          <div className="text-sm text-amber-900">
            <p className="font-bold mb-1">Disclaimer Klinis</p>
            <p className="leading-relaxed opacity-90">
              Sistem ini adalah <strong>decision support tool</strong>, bukan pengganti keputusan medis. Setiap output harus diverifikasi
              oleh dokter sebelum ditindaklanjuti. Skor ESI tidak menggantikan penilaian visual langsung terhadap pasien.
            </p>
          </div>
        </div>

        <div className="pt-2 pb-12">
          <SubmitButton />
        </div>
      </form>
    </div>
  );
}
