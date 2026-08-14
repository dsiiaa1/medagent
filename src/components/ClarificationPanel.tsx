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
            <div className="space-y-3">
              {data.questions.map((q, idx) => (
                <div key={idx} className="bg-white p-4 rounded-xl border border-amber-200">
                  <p className="text-sm font-semibold text-gray-800 mb-2">{q}</p>
                  {/* For simplicity, we just provide text inputs. A robust version would parse what vital sign is needed */}
                  <input
                    name={`answer_${idx}`}
                    type="text"
                    placeholder="Masukkan jawaban atau angka..."
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              ))}
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
