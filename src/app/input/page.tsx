'use client';

/**
 * /input — Nurse intake form for new patient registration.
 * Redesigned: premium themed sections, dark/light adaptive inputs,
 * step-by-step visual flow, range hints, animated submit button.
 */

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { submitIntake, type IntakeFormState } from '@/app/actions';
import {
  Siren, TriangleAlert, User, Stethoscope, Activity,
  FileText, BrainCircuit, ChevronRight
} from 'lucide-react';

const initialState: IntakeFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      id="submit-intake"
      disabled={pending}
      className="w-full rounded-xl px-6 py-4 text-sm font-bold text-white transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-2"
      style={{
        background: pending
          ? '#9ca3af'
          : 'linear-gradient(135deg, #c0392b 0%, #e74c3c 100%)',
        boxShadow: pending ? 'none' : '0 6px 20px rgba(192,57,43,0.35)',
      }}
    >
      {pending ? (
        <>
          <span className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          Memproses Data Pasien...
        </>
      ) : (
        <>
          <Siren className="w-5 h-5" />
          Daftarkan Pasien &amp; Mulai Triase
          <ChevronRight className="w-4 h-4" />
        </>
      )}
    </button>
  );
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <p className="mt-1.5 text-xs font-medium flex items-center gap-1 text-red-500">
      <TriangleAlert className="w-3 h-3 inline" />
      {errors[0]}
    </p>
  );
}

function StepHeader({
  icon: Icon,
  title,
  step,
  color,
}: {
  icon: React.ElementType;
  title: string;
  step: number;
  color: string;
}) {
  return (
    <div
      className="flex items-center gap-3 pb-4 mb-5"
      style={{ borderBottom: '1px solid var(--border-subtle)' }}
    >
      <div
        className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black text-white shadow-sm shrink-0"
        style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)` }}
      >
        {step}
      </div>
      <div className="flex items-center gap-2" style={{ color: 'var(--fg-primary)' }}>
        <Icon className="w-5 h-5" style={{ color }} />
        <h2 className="text-base font-bold">{title}</h2>
      </div>
    </div>
  );
}

function Label({
  htmlFor,
  children,
  required,
  hint,
}: {
  htmlFor: string;
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--fg-secondary)' }}>
      {children}
      {required && <span className="ml-1" style={{ color: 'var(--brand-red)' }}>*</span>}
      {hint && (
        <span className="ml-2 font-normal text-xs px-1.5 py-0.5 rounded" style={{ color: 'var(--fg-muted)', background: 'var(--bg-subtle)' }}>
          {hint}
        </span>
      )}
    </label>
  );
}

const baseInputCls = 'w-full rounded-xl px-4 py-2.5 text-sm transition-all themed-input';

function Input({ hasError, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }) {
  return (
    <input
      {...props}
      className={`${baseInputCls} ${hasError ? 'ring-2 ring-red-500/30' : ''}`}
      style={{
        background: 'var(--bg-input)',
        border: `1px solid ${hasError ? 'var(--brand-red)' : 'var(--border-default)'}`,
        color: 'var(--fg-primary)',
      }}
    />
  );
}

function Select({ ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={baseInputCls}
      style={{
        background: 'var(--bg-input)',
        border: '1px solid var(--border-default)',
        color: 'var(--fg-primary)',
      }}
    />
  );
}

function Textarea({ hasError, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { hasError?: boolean }) {
  return (
    <textarea
      {...props}
      className={`${baseInputCls} resize-y ${hasError ? 'ring-2 ring-red-500/30' : ''}`}
      style={{
        background: 'var(--bg-input)',
        border: `1px solid ${hasError ? 'var(--brand-red)' : 'var(--border-default)'}`,
        color: 'var(--fg-primary)',
      }}
    />
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-6"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {children}
    </div>
  );
}

export default function InputPage() {
  const [state, formAction] = useActionState(submitIntake, initialState);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">
      {/* Page header */}
      <div className="mb-8 pb-6" style={{ borderBottom: '1px solid var(--border-default)' }}>
        <div className="flex items-center gap-3 mb-2">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-md"
            style={{ background: 'linear-gradient(135deg, #c0392b, #e74c3c)' }}
          >
            <Siren className="w-5 h-5" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--fg-primary)' }}>
            Input Pasien Baru
          </h1>
        </div>
        <p className="mt-1" style={{ color: 'var(--fg-secondary)' }}>
          Isi data awal pasien untuk memulai proses analisis otomatis (RAG + ESI scoring).{' '}
          Field bertanda <span style={{ color: 'var(--brand-red)' }} className="font-bold">*</span> wajib diisi.
        </p>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mt-5 text-xs font-semibold">
          {[
            { num: 1, label: 'Identitas', color: '#3b82f6' },
            { num: 2, label: 'Keluhan', color: '#f59e0b' },
            { num: 3, label: 'Tanda Vital', color: '#ef4444' },
            { num: 4, label: 'Riwayat Medis', color: '#10b981' },
          ].map((s, i) => (
            <div key={s.num} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full text-white text-[11px] font-black"
                  style={{ background: s.color }}
                >
                  {s.num}
                </span>
                <span style={{ color: 'var(--fg-secondary)' }}>{s.label}</span>
              </div>
              {i < 3 && <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--fg-muted)' }} />}
            </div>
          ))}
        </div>
      </div>

      {/* Global error */}
      {state.message && (
        <div
          className="mb-6 flex gap-3 rounded-xl p-4 text-sm shadow-sm"
          style={{
            background: 'var(--triage-merah-bg)',
            border: '1px solid var(--brand-red-muted)',
            color: 'var(--triage-merah-text)',
          }}
        >
          <TriangleAlert className="h-5 w-5 shrink-0 mt-0.5" />
          <p>{state.message}</p>
        </div>
      )}

      <form action={formAction} className="space-y-5">

        {/* ── Step 1: Identitas Pasien ─────────────────────────────────────── */}
        <SectionCard>
          <StepHeader step={1} icon={User} title="Identitas Pasien" color="#3b82f6" />
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="nama" required>Nama Lengkap / ID Rekam Medis</Label>
              <Input
                id="nama"
                name="nama"
                type="text"
                placeholder="Masukkan nama lengkap pasien..."
                hasError={!!state.errors?.nama}
                aria-describedby="nama-error"
              />
              <FieldError errors={state.errors?.nama} />
            </div>

            <div>
              <Label htmlFor="age_value" required>Usia</Label>
              <div className="flex gap-2">
                <input
                  id="age_value"
                  name="age_value"
                  type="number"
                  min={1}
                  placeholder="Angka"
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm transition-all"
                  style={{
                    background: 'var(--bg-input)',
                    border: `1px solid ${state.errors?.age_value ? 'var(--brand-red)' : 'var(--border-default)'}`,
                    color: 'var(--fg-primary)',
                  }}
                />
                <Select name="age_unit" defaultValue="Tahun">
                  <option value="Tahun">Tahun</option>
                  <option value="Bulan">Bulan</option>
                </Select>
              </div>
              <FieldError errors={state.errors?.age_value} />
            </div>

            <div>
              <Label htmlFor="jenis_kelamin" required>Jenis Kelamin</Label>
              <Select id="jenis_kelamin" name="jenis_kelamin" defaultValue="Laki-laki">
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </Select>
            </div>
          </div>
        </SectionCard>

        {/* ── Step 2: Keluhan Utama ────────────────────────────────────────── */}
        <SectionCard>
          <StepHeader step={2} icon={Stethoscope} title="Keluhan Utama" color="#f59e0b" />
          <div>
            <Label htmlFor="keluhan_utama" required>Deskripsi Keluhan</Label>
            <Textarea
              id="keluhan_utama"
              name="keluhan_utama"
              rows={4}
              placeholder="Deskripsikan keluhan pasien secara rinci (gejala, durasi, lokasi nyeri, dll)..."
              hasError={!!state.errors?.keluhan_utama}
            />
            <FieldError errors={state.errors?.keluhan_utama} />
            <p className="mt-2 text-xs flex items-center gap-1.5" style={{ color: 'var(--fg-muted)' }}>
              <BrainCircuit className="w-3.5 h-3.5" />
              Keluhan ini akan diproses oleh AI untuk ekstraksi fitur klinis dan retrieval referensi medis.
            </p>
          </div>
        </SectionCard>

        {/* ── Step 3: Tanda Vital ──────────────────────────────────────────── */}
        <SectionCard>
          <StepHeader step={3} icon={Activity} title="Tanda Vital" color="#ef4444" />
          <p className="text-sm mb-6 -mt-2" style={{ color: 'var(--fg-muted)' }}>
            Data vital sangat menentukan skor ESI secara otomatis. Kosongkan jika belum diukur.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { id: 'spo2',             label: 'SpO2',           unit: '%',    hint: 'normal: 95–100',  min: 0,   max: 100, step: 1,   err: state.errors?.spo2 },
              { id: 'systolic',         label: 'TD Sistolik',    unit: 'mmHg', hint: 'normal: 90–120',  min: 0,   max: 300, step: 1,   err: undefined },
              { id: 'diastolic',        label: 'TD Diastolik',   unit: 'mmHg', hint: 'normal: 60–80',   min: 0,   max: 200, step: 1,   err: undefined },
              { id: 'heart_rate',       label: 'Detak Jantung',  unit: 'bpm',  hint: 'normal: 60–100',  min: 0,   max: 300, step: 1,   err: state.errors?.heart_rate },
              { id: 'respiratory_rate', label: 'Laju Napas',     unit: 'x/mnt',hint: 'normal: 12–20',   min: 0,   max: 100, step: 1,   err: undefined },
              { id: 'temperature',      label: 'Suhu',           unit: '°C',   hint: 'normal: 36.5–37.5',min: 20, max: 45,  step: 0.1, err: undefined },
              { id: 'gcs',              label: 'GCS',            unit: '3–15', hint: 'normal: 15',       min: 3,  max: 15,  step: 1,   err: undefined },
            ].map(({ id, label, unit, hint, min, max, step, err }) => (
              <div key={id}>
                <div className="flex items-baseline gap-2 mb-1.5">
                  <label htmlFor={id} className="text-sm font-semibold" style={{ color: 'var(--fg-secondary)' }}>
                    {label}
                  </label>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ color: 'var(--fg-muted)', background: 'var(--bg-subtle)' }}>
                    {hint}
                  </span>
                </div>
                <div className="relative">
                  <input
                    id={id}
                    name={id}
                    type="number"
                    min={min}
                    max={max}
                    step={step}
                    placeholder={`mis. —`}
                    className="w-full rounded-xl px-4 py-2.5 text-sm transition-all pr-14"
                    style={{
                      background: 'var(--bg-input)',
                      border: `1px solid ${err ? 'var(--brand-red)' : 'var(--border-default)'}`,
                      color: 'var(--fg-primary)',
                    }}
                  />
                  <span
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold pointer-events-none"
                    style={{ color: 'var(--fg-muted)' }}
                  >
                    {unit}
                  </span>
                </div>
                {err && <FieldError errors={err} />}
              </div>
            ))}
          </div>

          {/* Critical threshold guide */}
          <div
            className="mt-5 flex gap-3 rounded-xl p-3 text-xs"
            style={{
              background: 'var(--triage-merah-bg)',
              border: '1px solid var(--brand-red-muted)',
              color: 'var(--triage-merah-text)',
            }}
          >
            <Activity className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong>Ambang Hard Override (ESI-1 otomatis):</strong>
              {' '}SpO2 &lt;90% · Sistol &lt;90 mmHg · GCS &lt;9 · HR &lt;40 atau &gt;150 bpm
            </div>
          </div>
        </SectionCard>

        {/* ── Step 4: Riwayat Medis ───────────────────────────────────────── */}
        <SectionCard>
          <StepHeader step={4} icon={FileText} title="Riwayat Medis &amp; Obat" color="#10b981" />
          <div className="grid gap-5">
            <div>
              <Label htmlFor="kondisi_kronis" hint="Pisahkan dengan koma">Kondisi Kronis / Penyakit Latar</Label>
              <Input
                id="kondisi_kronis"
                name="kondisi_kronis"
                type="text"
                placeholder="mis. Hipertensi, DM tipe 2, Gagal Jantung..."
              />
            </div>

            <div>
              <Label htmlFor="alergi" hint="Pisahkan dengan koma">Alergi</Label>
              <Input
                id="alergi"
                name="alergi"
                type="text"
                placeholder="mis. Penisilin, Makanan Laut, Kontras..."
              />
            </div>

            <div>
              <Label htmlFor="obat_dikonsumsi" hint="Pisahkan dengan koma">Obat yang Sedang Dikonsumsi</Label>
              <Input
                id="obat_dikonsumsi"
                name="obat_dikonsumsi"
                type="text"
                placeholder="mis. Metformin 500mg, Warfarin, Amlodipine 5mg..."
              />
              <div
                className="mt-2 flex items-start gap-2 text-xs rounded-lg p-2.5"
                style={{
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--fg-muted)',
                }}
              >
                <BrainCircuit className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Data obat ini akan otomatis dicek oleh <strong>agent farmasi paralel</strong> untuk deteksi interaksi obat berbahaya.</span>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* ── Disclaimer ────────────────────────────────────────────────── */}
        <div
          className="flex gap-4 rounded-xl p-5 shadow-sm"
          style={{
            background: '#fffbeb',
            borderTop: '1px solid #fde68a',
            borderBottom: '1px solid #fde68a',
            borderRight: '1px solid #fde68a',
            borderLeft: '4px solid #f59e0b',
          }}
        >
          <TriangleAlert className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="text-sm text-amber-900">
            <p className="font-bold mb-1">Disclaimer Klinis</p>
            <p className="leading-relaxed opacity-90">
              Sistem ini adalah <strong>decision support tool</strong>, bukan pengganti keputusan medis.
              Setiap output harus diverifikasi oleh dokter sebelum ditindaklanjuti.
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
