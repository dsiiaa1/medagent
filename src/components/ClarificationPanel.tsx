'use client';

import { useState } from 'react';
import { submitClarification } from '@/app/actions';
import { AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import type { ClarificationData } from '@/lib/supabase';

interface Props {
  caseId: string;
  data: ClarificationData;
}

export function ClarificationPanel({ caseId, data }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const answers: Record<string, string> = {};
    formData.forEach((value, key) => {
      answers[key] = value.toString();
    });

    try {
      await submitClarification(caseId, answers);
    } catch (error) {
      console.error(error);
      alert('Gagal mengirim jawaban klarifikasi.');
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-6 shadow-sm mb-6">
      <div className="flex items-start gap-4">
        <div className="bg-amber-100 p-2 rounded-full">
          <AlertCircle className="w-6 h-6 text-amber-700" />
        </div>
        <div className="flex-grow">
          <h2 className="text-lg font-bold text-amber-900 mb-2">Klarifikasi Diperlukan</h2>
          <p className="text-sm text-amber-800 mb-4">
            Sistem membutuhkan data tambahan untuk memberikan skor ESI yang akurat.
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Pesan konteks dari AI */}
            <div className="bg-white p-4 rounded-xl border border-amber-200 mb-4">
              <h3 className="text-sm font-bold text-amber-900 mb-2">Pesan dari AI:</h3>
              <ul className="list-disc pl-5 space-y-1">
                {data.questions.map((q, idx) => (
                  <li key={idx} className="text-sm text-gray-800">{q}</li>
                ))}
              </ul>
            </div>

            {/* Input spesifik berdasarkan missingFields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.missingFields?.map((field) => {
                const HISTORY_FIELDS = ['kondisi_kronis', 'alergi', 'obat_dikonsumsi'];
                const isHistory = HISTORY_FIELDS.includes(field);
                const FIELD_LABELS: Record<string, string> = {
                  spo2: 'SpO2 (%)',
                  systolic: 'Tekanan Darah Sistolik (mmHg)',
                  diastolic: 'Tekanan Darah Diastolik (mmHg)',
                  heart_rate: 'Detak Jantung (bpm)',
                  respiratory_rate: 'Pernapasan (x/mnt)',
                  temperature: 'Suhu (°C)',
                  gcs: 'Skor GCS',
                  kondisi_kronis: 'Kondisi Kronis',
                  alergi: 'Alergi',
                  obat_dikonsumsi: 'Obat yang Sedang Dikonsumsi'
                };
                
                return (
                  <div key={field} className="space-y-1">
                    <label htmlFor={field} className="block text-sm font-semibold text-gray-800">
                      {FIELD_LABELS[field] || field}
                    </label>
                    {isHistory ? (
                      <input
                        id={field}
                        name={field}
                        type="text"
                        placeholder="Pisahkan dgn koma (isi 'Tidak ada' jika nihil)"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    ) : (
                      <input
                        id={field}
                        name={field}
                        type="number"
                        step="any"
                        placeholder="Masukkan angka..."
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                Kirim Klarifikasi & Lanjutkan
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
