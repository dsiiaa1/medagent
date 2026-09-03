'use client';

/**
 * /input — Nurse intake form for new patient registration.
 * ER Cockpit redesign:
 *   - Split-pane layout (2 columns on desktop) to eliminate scroll fatigue.
 *   - Quick Chips for common symptoms to minimize typing.
 *   - Voice dictation (Web Speech API) for keluhan & riwayat fields.
 *   - Solid card design (no glassmorphism), high-contrast for readability.
 */

import { useActionState, useState, useRef, useCallback } from 'react';
import { useFormStatus } from 'react-dom';
import { submitIntake, type IntakeFormState } from '@/app/actions';
import {
  Siren, TriangleAlert, User, Stethoscope, Activity,
  FileText, BrainCircuit, ChevronRight, Mic, MicOff, Plus
} from 'lucide-react';

const initialState: IntakeFormState = {};

/* ── Quick Chips data ─────────────────────────────────────────────────────── */
const QUICK_SYMPTOMS = [
  'Nyeri Dada', 'Sesak Napas', 'Penurunan Kesadaran', 'Nyeri Perut Akut',
  'Kejang', 'Trauma / Kecelakaan', 'Perdarahan', 'Demam Tinggi',
  'Lemas / Pingsan', 'Nyeri Kepala Hebat',
];

/* ── Voice Dictation Hook (Web Speech API) ────────────────────────────────── */
function useVoiceDictation() {
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startDictation = useCallback((
    onResult: (text: string) => void,
    onEnd?: () => void,
  ) => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const SpeechGrammarList =
      (window as any).SpeechGrammarList || (window as any).webkitSpeechGrammarList;

    if (!SpeechRecognition) {
      alert('Browser Anda tidak mendukung Speech Recognition. Gunakan Chrome/Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'id-ID';
    recognition.interimResults = false;
    recognition.continuous = true;

    if (SpeechGrammarList) {
      const medicalTerms = [
        'trauma', 'kecelakaan', 'sesak', 'napas', 'nyeri', 'dada', 'perut', 'kepala', 
        'hebat', 'lemas', 'pingsan', 'darah', 'perdarahan', 'demam', 'tinggi', 'kejang',
        'penurunan', 'kesadaran', 'akut', 'hipertensi', 'diabetes', 'jantung', 'alergi',
        'mual', 'muntah', 'batuk', 'pilek', 'pusing', 'luka'
      ];
      const grammar = '#JSGF V1.0; grammar terms; public <term> = ' + medicalTerms.join(' | ') + ' ;';
      const speechRecognitionList = new SpeechGrammarList();
      speechRecognitionList.addFromString(grammar, 1);
      recognition.grammars = speechRecognitionList;
    }

    recognition.onresult = (event: any) => {
      let newText = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          newText += event.results[i][0].transcript + ' ';
        }
      }
      if (newText.trim()) {
        onResult(newText.trim());
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      onEnd?.();
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        console.error('Speech recognition error', event.error);
      }
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, []);

  const stopDictation = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  }, []);

  return { isRecording, startDictation, stopDictation };
}

/* ── Shared sub-components ────────────────────────────────────────────────── */

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      id="submit-intake"
      disabled={pending}
      className="w-full rounded-xl px-6 py-4 text-sm font-bold text-white transition-all duration-200 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-2"
      style={{
        background: pending
          ? '#9ca3af'
          : '#dc2626',
        boxShadow: pending ? 'none' : '0 4px 16px rgba(220, 38, 38, 0.35)',
      }}
    >
      {pending ? (
        <>
          <span className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          <span>Memproses Data Pasien...</span>
        </>
      ) : (
        <>
          <Siren className="w-5 h-5" />
          <span>Daftarkan Pasien &amp; Mulai Triase</span>
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

function SectionHeader({
  icon: Icon,
  title,
  color,
}: {
  icon: React.ElementType;
  title: string;
  color: string;
}) {
  return (
    <div
      className="flex items-center gap-2.5 pb-3 mb-4"
      style={{ borderBottom: '2px solid var(--border-default)' }}
    >
      <div
        className="flex h-8 w-8 items-center justify-center rounded-lg text-white shrink-0"
        style={{ background: color }}
      >
        <Icon className="w-4 h-4" />
      </div>
      <h2 className="text-base font-bold tracking-tight" style={{ color: 'var(--fg-primary)' }}>
        {title}
      </h2>
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
      {required && <span className="ml-1" style={{ color: '#dc2626' }}>*</span>}
      {hint && (
        <span className="ml-2 font-normal text-xs px-1.5 py-0.5 rounded" style={{ color: 'var(--fg-muted)', background: 'var(--bg-subtle)' }}>
          {hint}
        </span>
      )}
    </label>
  );
}

const baseInputCls = 'w-full rounded-lg px-3 py-2.5 text-sm transition-all';

function Input({ hasError, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }) {
  return (
    <input
      {...props}
      className={`${baseInputCls} ${hasError ? 'ring-2 ring-red-500/30' : ''}`}
      style={{
        background: 'var(--bg-input)',
        border: `1.5px solid ${hasError ? '#dc2626' : 'var(--border-default)'}`,
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
        border: '1.5px solid var(--border-default)',
        color: 'var(--fg-primary)',
      }}
    />
  );
}

/* ── Voice Button Component ───────────────────────────────────────────────── */
function VoiceButton({
  isRecording,
  onToggle,
}: {
  isRecording: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`voice-btn ${isRecording ? 'recording' : ''}`}
      title={isRecording ? 'Hentikan dikte' : 'Mulai dikte suara'}
      aria-label={isRecording ? 'Hentikan dikte suara' : 'Mulai dikte suara'}
    >
      {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
    </button>
  );
}

/* ── Main Page ────────────────────────────────────────────────────────────── */

export default function InputPage() {
  const [state, formAction] = useActionState(submitIntake, initialState);
  const [keluhanText, setKeluhanText] = useState('');
  const [kondisiText, setKondisiText] = useState('');
  const [alergiText, setAlergiText] = useState('');
  const [obatText, setObatText] = useState('');
  const keluhanRef = useRef<HTMLTextAreaElement>(null);

  const keluhanVoice = useVoiceDictation();
  const kondisiVoice = useVoiceDictation();
  const alergiVoice = useVoiceDictation();
  const obatVoice = useVoiceDictation();

  // Quick chip handler — append symptom text to keluhan
  const handleChipClick = (symptom: string) => {
    setKeluhanText(prev => {
      const trimmed = prev.trim();
      if (trimmed.toLowerCase().includes(symptom.toLowerCase())) return prev;
      return trimmed ? `${trimmed}, ${symptom}` : symptom;
    });
    keluhanRef.current?.focus();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-10">
      {/* Page header — compact */}
      <div className="mb-6 pb-4" style={{ borderBottom: '2px solid var(--border-default)' }}>
        <div className="flex items-center gap-3 mb-1">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg text-white"
            style={{ background: '#dc2626' }}
          >
            <Siren className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--fg-primary)' }}>
            Input Pasien Baru
          </h1>
        </div>
        <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>
          Isi data pasien untuk memulai analisis otomatis.
          Field bertanda <span style={{ color: '#dc2626' }} className="font-bold">*</span> wajib diisi.
          Gunakan tombol 🎤 untuk dikte suara.
        </p>
      </div>

      {/* Global error */}
      {state.message && (
        <div
          className="mb-4 flex gap-3 rounded-lg p-3 text-sm"
          style={{
            background: 'var(--triage-merah-bg)',
            border: '1.5px solid #dc2626',
            color: '#dc2626',
          }}
        >
          <TriangleAlert className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="font-semibold">{state.message}</p>
        </div>
      )}

      <form action={formAction}>
        {/* ── SPLIT-PANE LAYOUT ──────────────────────────────────── */}
        <div className="grid gap-5 lg:grid-cols-2">

          {/* ── LEFT COLUMN: Identitas + Keluhan ──────────────────── */}
          <div className="space-y-5">

            {/* Identity */}
            <div className="solid-medical-card rounded-xl p-5">
              <SectionHeader icon={User} title="Identitas Pasien" color="#2563eb" />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="nama" required>Nama / ID RM</Label>
                  <Input
                    id="nama"
                    name="nama"
                    type="text"
                    placeholder="Nama lengkap pasien..."
                    hasError={!!state.errors?.nama}
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
                      placeholder="—"
                      className="flex-1 rounded-lg px-3 py-2.5 text-sm"
                      style={{
                        background: 'var(--bg-input)',
                        border: `1.5px solid ${state.errors?.age_value ? '#dc2626' : 'var(--border-default)'}`,
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
            </div>

            {/* Keluhan Utama */}
            <div className="solid-medical-card rounded-xl p-5">
              <SectionHeader icon={Stethoscope} title="Keluhan Utama" color="#d97706" />

              {/* Quick Chips */}
              <div className="mb-3">
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--fg-muted)' }}>
                  Klik gejala untuk input cepat:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_SYMPTOMS.map(symptom => (
                    <button
                      key={symptom}
                      type="button"
                      className={`quick-chip ${keluhanText.toLowerCase().includes(symptom.toLowerCase()) ? 'active' : ''}`}
                      onClick={() => handleChipClick(symptom)}
                    >
                      <Plus className="w-3 h-3" />
                      {symptom}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea + Voice */}
              <Label htmlFor="keluhan_utama" required>Deskripsi Keluhan</Label>
              <div className="flex gap-2 items-start">
                <textarea
                  ref={keluhanRef}
                  id="keluhan_utama"
                  name="keluhan_utama"
                  rows={3}
                  value={keluhanText}
                  onChange={e => setKeluhanText(e.target.value)}
                  placeholder="Deskripsikan keluhan pasien... atau tekan 🎤"
                  className={`${baseInputCls} resize-y flex-1 ${state.errors?.keluhan_utama ? 'ring-2 ring-red-500/30' : ''}`}
                  style={{
                    background: 'var(--bg-input)',
                    border: `1.5px solid ${state.errors?.keluhan_utama ? '#dc2626' : 'var(--border-default)'}`,
                    color: 'var(--fg-primary)',
                  }}
                />
                <VoiceButton
                  isRecording={keluhanVoice.isRecording}
                  onToggle={() => {
                    if (keluhanVoice.isRecording) {
                      keluhanVoice.stopDictation();
                    } else {
                      keluhanVoice.startDictation((text) => {
                        setKeluhanText(prev => prev ? `${prev} ${text}` : text);
                      });
                    }
                  }}
                />
              </div>
              <FieldError errors={state.errors?.keluhan_utama} />
              <p className="mt-2 text-xs flex items-center gap-1.5" style={{ color: 'var(--fg-muted)' }}>
                <BrainCircuit className="w-3.5 h-3.5" />
                Akan diproses AI untuk ekstraksi fitur klinis dan retrieval referensi medis.
              </p>
            </div>
          </div>

          {/* ── RIGHT COLUMN: Tanda Vital + Riwayat ───────────────── */}
          <div className="space-y-5">

            {/* Tanda Vital */}
            <div className="solid-medical-card rounded-xl p-5">
              <SectionHeader icon={Activity} title="Tanda Vital" color="#dc2626" />
              <p className="text-xs mb-4 -mt-1" style={{ color: 'var(--fg-muted)' }}>
                Kosongkan jika belum diukur. Data vital menentukan skor ESI.
              </p>

              <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
                {[
                  { id: 'spo2',             label: 'SpO2',         unit: '%',     hint: '95–100',    min: 0,   max: 100, step: 1,   err: state.errors?.spo2 },
                  { id: 'systolic',         label: 'Sistolik',     unit: 'mmHg',  hint: '90–120',    min: 0,   max: 300, step: 1,   err: undefined },
                  { id: 'diastolic',        label: 'Diastolik',    unit: 'mmHg',  hint: '60–80',     min: 0,   max: 200, step: 1,   err: undefined },
                  { id: 'heart_rate',       label: 'HR',           unit: 'bpm',   hint: '60–100',    min: 0,   max: 300, step: 1,   err: state.errors?.heart_rate },
                  { id: 'respiratory_rate', label: 'RR',           unit: 'x/mnt', hint: '12–20',     min: 0,   max: 100, step: 1,   err: undefined },
                  { id: 'temperature',      label: 'Suhu',         unit: '°C',    hint: '36.5–37.5', min: 20,  max: 45,  step: 0.1, err: undefined },
                  { id: 'gcs',              label: 'GCS',          unit: '',      hint: '3–15',      min: 3,   max: 15,  step: 1,   err: undefined },
                ].map(({ id, label, unit, hint, min, max, step, err }) => (
                  <div key={id}>
                    <div className="flex items-baseline gap-1 mb-1">
                      <label htmlFor={id} className="text-xs font-bold" style={{ color: 'var(--fg-secondary)' }}>
                        {label}
                      </label>
                      <span className="text-[10px] font-medium" style={{ color: 'var(--fg-muted)' }}>
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
                        placeholder="—"
                        className="w-full rounded-lg px-3 py-2 text-sm pr-10"
                        style={{
                          background: 'var(--bg-input)',
                          border: `1.5px solid ${err ? '#dc2626' : 'var(--border-default)'}`,
                          color: 'var(--fg-primary)',
                        }}
                      />
                      {unit && (
                        <span
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold pointer-events-none"
                          style={{ color: 'var(--fg-muted)' }}
                        >
                          {unit}
                        </span>
                      )}
                    </div>
                    {err && <FieldError errors={err} />}
                  </div>
                ))}
              </div>

              {/* Hard override reminder */}
              <div
                className="mt-4 flex gap-2 rounded-lg p-2.5 text-xs font-semibold"
                style={{
                  background: 'var(--triage-merah-bg)',
                  border: '1.5px solid #dc2626',
                  color: '#dc2626',
                }}
              >
                <Activity className="w-4 h-4 shrink-0" />
                <span>
                  <strong>ESI-1 otomatis:</strong> SpO2 &lt;90% · Sistol &lt;90 · GCS &lt;9 · HR &lt;40 / &gt;150
                </span>
              </div>
            </div>

            {/* Riwayat Medis & Obat */}
            <div className="solid-medical-card rounded-xl p-5">
              <SectionHeader icon={FileText} title="Riwayat Medis & Obat" color="#059669" />
              <div className="space-y-4">
                <div>
                  <Label htmlFor="kondisi_kronis" hint="Pisahkan dengan koma">Kondisi Kronis</Label>
                  <div className="flex gap-2 items-start">
                    <Input
                      id="kondisi_kronis"
                      name="kondisi_kronis"
                      type="text"
                      value={kondisiText}
                      onChange={(e) => setKondisiText(e.target.value)}
                      placeholder="Hipertensi, DM tipe 2, Gagal Jantung..."
                    />
                    <VoiceButton
                      isRecording={kondisiVoice.isRecording}
                      onToggle={() => {
                        if (kondisiVoice.isRecording) {
                          kondisiVoice.stopDictation();
                        } else {
                          kondisiVoice.startDictation((text) => {
                            setKondisiText(prev => prev ? `${prev}, ${text}` : text);
                          });
                        }
                      }}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="alergi" hint="Pisahkan dengan koma">Alergi</Label>
                  <div className="flex gap-2 items-start">
                    <Input
                      id="alergi"
                      name="alergi"
                      type="text"
                      value={alergiText}
                      onChange={(e) => setAlergiText(e.target.value)}
                      placeholder="Penisilin, Makanan Laut, Kontras..."
                    />
                    <VoiceButton
                      isRecording={alergiVoice.isRecording}
                      onToggle={() => {
                        if (alergiVoice.isRecording) {
                          alergiVoice.stopDictation();
                        } else {
                          alergiVoice.startDictation((text) => {
                            setAlergiText(prev => prev ? `${prev}, ${text}` : text);
                          });
                        }
                      }}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="obat_dikonsumsi" hint="Pisahkan dengan koma">Obat yang Dikonsumsi</Label>
                  <div className="flex gap-2 items-start">
                    <Input
                      id="obat_dikonsumsi"
                      name="obat_dikonsumsi"
                      type="text"
                      value={obatText}
                      onChange={(e) => setObatText(e.target.value)}
                      placeholder="Metformin 500mg, Warfarin, Amlodipine..."
                    />
                    <VoiceButton
                      isRecording={obatVoice.isRecording}
                      onToggle={() => {
                        if (obatVoice.isRecording) {
                          obatVoice.stopDictation();
                        } else {
                          obatVoice.startDictation((text) => {
                            setObatText(prev => prev ? `${prev}, ${text}` : text);
                          });
                        }
                      }}
                    />
                  </div>
                  <p className="mt-2 text-xs flex items-center gap-1.5" style={{ color: 'var(--fg-muted)' }}>
                    <BrainCircuit className="w-3.5 h-3.5" />
                    Otomatis dicek oleh <strong>agent farmasi paralel</strong> untuk interaksi obat.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Disclaimer + Submit (full width below) ──────────────── */}
        <div className="mt-5 space-y-4">
          <div
            className="flex gap-3 rounded-lg p-4"
            style={{
              background: '#fffbeb',
              borderLeft: '4px solid #f59e0b',
              border: '1px solid #fde68a',
              borderLeftWidth: '4px',
              borderLeftColor: '#f59e0b',
            }}
          >
            <TriangleAlert className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="text-sm text-amber-900">
              <p className="font-bold mb-0.5">Disclaimer Klinis</p>
              <p className="leading-relaxed opacity-90">
                Sistem ini adalah <strong>decision support tool</strong>, bukan pengganti keputusan medis.
                Setiap output harus diverifikasi oleh dokter sebelum ditindaklanjuti.
              </p>
            </div>
          </div>

          <SubmitButton />
        </div>
      </form>
    </div>
  );
}
