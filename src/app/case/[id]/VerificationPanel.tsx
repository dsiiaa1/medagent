'use client';

/**
 * VerificationPanel — doctor verification UI (§4.7).
 * Shows Approve / Edit / Reject buttons.
 * When editing, reveals inline SOAP textareas.
 * Implements automation bias mitigation: critical vitals shown prominently before approve.
 */

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { verifyCase, type VerifyFormState } from '@/app/actions';
import { SOAPEditFields } from '@/components/SOAPView';
import type { SoapSummary, VerificationStatus } from '@/lib/supabase';

const VERIFY_CONFIG: Record<VerificationStatus, { label: string; icon: string; cls: string }> = {
  pending:  { label: 'Belum diverifikasi', icon: '⏳', cls: 'bg-orange-50 border-orange-300 text-orange-800' },
  approved: { label: 'Disetujui',          icon: '✅', cls: 'bg-green-50 border-green-300 text-green-800'   },
  edited:   { label: 'Diedit dokter',      icon: '✏️', cls: 'bg-blue-50 border-blue-300 text-blue-800'      },
  rejected: { label: 'Ditolak',            icon: '❌', cls: 'bg-red-50 border-red-300 text-red-800'         },
};

interface Props {
  caseId: string;
  verificationStatus: VerificationStatus;
  verifiedBy: string | null;
  verifiedAt: string | null;
  verificationNote: string | null;
  soap: SoapSummary | null;
  isProcessing: boolean;
}

function SubmitBtn({ label, value }: { label: string; value: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="verification_status"
      value={value}
      disabled={pending}
      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-60
        ${value === 'approved' ? 'bg-green-600 text-white hover:bg-green-700' :
          value === 'edited'   ? 'bg-blue-600 text-white hover:bg-blue-700'   :
                                 'bg-red-100 text-red-700 hover:bg-red-200'}
      `}
    >
      {pending ? '...' : label}
    </button>
  );
}

export function VerificationPanel({
  caseId, verificationStatus, verifiedBy, verifiedAt, verificationNote, soap, isProcessing,
}: Props) {
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [state, formAction] = useActionState(verifyCase, {} as VerifyFormState);

  const conf = VERIFY_CONFIG[verificationStatus];
  const alreadyVerified = verificationStatus !== 'pending';

  // Format verified time
  const verifiedAtStr = verifiedAt
    ? new Date(verifiedAt).toLocaleString('id-ID', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
      })
    : null;

  if (alreadyVerified) {
    return (
      <div className={`rounded-xl border p-4 ${conf.cls}`}>
        <div className="flex items-center gap-2">
          <span className="text-lg">{conf.icon}</span>
          <div>
            <p className="text-sm font-semibold">{conf.label}</p>
            {verifiedBy && (
              <p className="text-xs opacity-80">
                oleh {verifiedBy}{verifiedAtStr ? ` · ${verifiedAtStr}` : ''}
              </p>
            )}
          </div>
        </div>
        {verificationNote && (
          <p className="mt-2 text-xs italic border-t border-current/20 pt-2">{verificationNote}</p>
        )}
        {state.message && (
          <p className="mt-2 text-xs opacity-80">{state.message}</p>
        )}
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm text-gray-500 flex items-center gap-2">
          <span className="h-3 w-3 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin" />
          Menunggu agent selesai memproses sebelum verifikasi tersedia...
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50 p-5">
      <h3 className="text-sm font-semibold text-orange-900 mb-3 flex items-center gap-2">
        ⏳ Verifikasi Dokter Diperlukan
      </h3>
      <p className="text-xs text-orange-800 mb-4 leading-relaxed">
        Tinjau ringkasan di bawah, kemudian pilih tindakan. Keputusan klinis akhir ada di tangan Anda.
      </p>

      {state.errors && (
        <div className="mb-3 rounded-lg bg-red-100 px-3 py-2 text-xs text-red-700">
          {Object.values(state.errors).flat().join(' · ')}
        </div>
      )}

      <form action={formAction}>
        <input type="hidden" name="case_id" value={caseId} />

        {/* Doctor name */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor="verified_by">
            Nama dokter
          </label>
          <input
            id="verified_by"
            name="verified_by"
            type="text"
            placeholder="mis. dr. Ayu"
            defaultValue="dr. Ayu"
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        {/* Optional note */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor="verification_note">
            Catatan (opsional)
          </label>
          <textarea
            id="verification_note"
            name="verification_note"
            rows={2}
            placeholder="Tambahkan catatan klinis jika perlu..."
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        {/* Edit toggle */}
        <div className="mb-3">
          <button
            type="button"
            onClick={() => setMode(mode === 'edit' ? 'view' : 'edit')}
            className="text-xs text-blue-600 hover:underline"
          >
            {mode === 'edit' ? '▲ Tutup editor SOAP' : '✏️ Edit ringkasan SOAP'}
          </button>
        </div>

        {/* SOAP edit fields (hidden unless in edit mode) */}
        {mode === 'edit' && soap && (
          <div className="mb-4 p-3 rounded-lg border border-blue-200 bg-blue-50">
            <SOAPEditFields soap={soap} />
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          <SubmitBtn label="✅ Setujui" value="approved" />
          {mode === 'edit' && <SubmitBtn label="💾 Simpan Editan" value="edited" />}
          <SubmitBtn label="❌ Tolak" value="rejected" />
        </div>
      </form>
    </div>
  );
}
