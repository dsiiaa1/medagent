'use client';

/**
 * /input — Nurse intake form for new patient registration.
 * Uses useActionState (React 19) with the submitIntake Server Action.
 */

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { submitIntake, type IntakeFormState } from '@/app/actions';

const initialState: IntakeFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? (
        <span className="flex items-center justify-center gap-2">
          <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          Memproses...
        </span>
      ) : (
        '🚑 Daftarkan Pasien'
      )}
    </button>
  );
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1 text-xs text-red-600">{errors[0]}</p>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="col-span-full text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200 pb-1 mb-1">
      {children}
    </h2>
  );
}

function Label({ htmlFor, children, required }: { htmlFor: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1">
      {children} {required && <span className="text-red-500">*</span>}
    </label>
  );
}

const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent';
const inputErrCls = 'w-full rounded-lg border border-red-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400';

export default function InputPage() {
  const [state, formAction] = useActionState(submitIntake, initialState);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Input Pasien Baru</h1>
        <p className="mt-1 text-sm text-gray-500">
          Isi data pasien untuk memulai proses triase otomatis. Field bertanda{' '}
          <span className="text-red-500 font-medium">*</span> wajib diisi.
        </p>
      </div>

      {/* Global error */}
      {state.message && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.message}
        </div>
      )}

      <form action={formAction} className="space-y-6">
        {/* ── Identitas Pasien ────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <SectionTitle>Identitas Pasien</SectionTitle>

            {/* Nama */}
            <div className="sm:col-span-2">
              <Label htmlFor="nama" required>Nama / ID Pasien</Label>
              <input
                id="nama"
                name="nama"
                type="text"
                placeholder="Nama lengkap atau ID rekam medis"
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
                  className={`flex-1 rounded-lg border ${state.errors?.age_value ? 'border-red-400' : 'border-gray-300'} px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400`}
                />
                <select
                  name="age_unit"
                  defaultValue="Tahun"
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-400"
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

            {/* Keluhan utama */}
            <div className="sm:col-span-2">
              <Label htmlFor="keluhan_utama" required>Keluhan Utama</Label>
              <textarea
                id="keluhan_utama"
                name="keluhan_utama"
                rows={3}
                placeholder="Deskripsikan keluhan pasien secara singkat dan jelas..."
                className={`${state.errors?.keluhan_utama ? inputErrCls : inputCls} resize-y`}
              />
              <FieldError errors={state.errors?.keluhan_utama} />
            </div>
          </div>
        </div>

        {/* ── Tanda Vital ─────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-3">
            <SectionTitle>Tanda Vital</SectionTitle>
            <p className="col-span-full -mt-2 text-xs text-gray-400">
              Isi sebanyak mungkin. Lebih banyak data = akurasi skor lebih tinggi.
            </p>

            <div>
              <Label htmlFor="spo2">SpO2 (%)</Label>
              <input id="spo2" name="spo2" type="number" min={0} max={100} placeholder="mis. 98" className={inputCls} />
              <FieldError errors={state.errors?.spo2} />
            </div>

            <div>
              <Label htmlFor="systolic">Tek. Darah Sistol (mmHg)</Label>
              <input id="systolic" name="systolic" type="number" min={0} max={300} placeholder="mis. 120" className={inputCls} />
            </div>

            <div>
              <Label htmlFor="diastolic">Tek. Darah Diastol (mmHg)</Label>
              <input id="diastolic" name="diastolic" type="number" min={0} max={200} placeholder="mis. 80" className={inputCls} />
            </div>

            <div>
              <Label htmlFor="heart_rate">Detak Jantung (bpm)</Label>
              <input id="heart_rate" name="heart_rate" type="number" min={0} max={300} placeholder="mis. 88" className={inputCls} />
              <FieldError errors={state.errors?.heart_rate} />
            </div>

            <div>
              <Label htmlFor="respiratory_rate">Laju Napas (x/mnt)</Label>
              <input id="respiratory_rate" name="respiratory_rate" type="number" min={0} max={100} placeholder="mis. 18" className={inputCls} />
            </div>

            <div>
              <Label htmlFor="temperature">Suhu (°C)</Label>
              <input id="temperature" name="temperature" type="number" min={20} max={45} step={0.1} placeholder="mis. 37.2" className={inputCls} />
            </div>

            <div>
              <Label htmlFor="gcs">GCS (3–15)</Label>
              <input id="gcs" name="gcs" type="number" min={3} max={15} placeholder="mis. 15" className={inputCls} />
            </div>
          </div>
        </div>

        {/* ── Riwayat Medis ───────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4">
            <SectionTitle>Riwayat Medis</SectionTitle>
            <p className="col-span-full -mt-2 text-xs text-gray-400">
              Pisahkan beberapa nilai dengan koma. Contoh: Hipertensi, Diabetes Mellitus
            </p>

            <div>
              <Label htmlFor="kondisi_kronis">Kondisi Kronis / Penyakit Latar</Label>
              <input
                id="kondisi_kronis"
                name="kondisi_kronis"
                type="text"
                placeholder="mis. Hipertensi, DM tipe 2, Gagal ginjal kronik"
                className={inputCls}
              />
            </div>

            <div>
              <Label htmlFor="alergi">Alergi</Label>
              <input
                id="alergi"
                name="alergi"
                type="text"
                placeholder="mis. Penisilin, Aspirin"
                className={inputCls}
              />
            </div>

            <div>
              <Label htmlFor="obat_dikonsumsi">Obat yang Sedang Dikonsumsi</Label>
              <input
                id="obat_dikonsumsi"
                name="obat_dikonsumsi"
                type="text"
                placeholder="mis. Metformin 500mg, Amlodipine 5mg, Warfarin"
                className={inputCls}
              />
              <p className="mt-1 text-xs text-gray-400">
                Digunakan untuk deteksi interaksi obat otomatis.
              </p>
            </div>
          </div>
        </div>

        {/* ── Disclaimer ──────────────────────────────────────────── */}
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-xs text-yellow-800">
          ⚠️ <strong>Penting:</strong> Sistem ini adalah <em>decision support</em> — setiap output harus diverifikasi
          oleh dokter sebelum ditindaklanjuti. Skor tidak menggantikan penilaian visual langsung terhadap pasien.
        </div>

        <SubmitButton />
      </form>
    </div>
  );
}
