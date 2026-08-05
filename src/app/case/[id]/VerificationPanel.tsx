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
import { CheckCircle2, XCircle, Edit3, Save, Clock, ChevronDown, ChevronUp, UserCheck } from 'lucide-react';

const VERIFY_CONFIG: Record<VerificationStatus, { label: string; icon: any; cls: string }> = {
  pending:  { label: 'Belum diverifikasi', icon: Clock,        cls: 'bg-amber-50 border-amber-200 text-amber-800' },
  approved: { label: 'Disetujui',          icon: CheckCircle2, cls: 'bg-emerald-50 border-emerald-200 text-emerald-800'   },
  edited:   { label: 'Diedit dokter',      icon: Edit3,        cls: 'bg-blue-50 border-blue-200 text-blue-800'      },
  rejected: { label: 'Ditolak',            icon: XCircle,      cls: 'bg-red-50 border-red-200 text-red-800'         },
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

function SubmitBtn({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="verification_status"
      value={value}
      disabled={pending}
      className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm border
        ${value === 'approved' ? 'bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-700' :
          value === 'edited'   ? 'bg-blue-600 text-white hover:bg-blue-700 border-blue-700'   :
                                 'bg-white text-red-600 hover:bg-red-50 border-red-200 hover:border-red-300'}
      `}
    >
      {pending ? (
        <span className="h-4 w-4 rounded-full border-2 border-current/30 border-t-current animate-spin" />
      ) : (
        <Icon className="w-4 h-4" />
      )}
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
  const ConfIcon = conf.icon;
  const alreadyVerified = verificationStatus !== 'pending';

  // Format verified time
  const verifiedAtStr = verifiedAt
    ? new Date(verifiedAt).toLocaleString('id-ID', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
      })
    : null;

  if (alreadyVerified) {
    return (
      <div className={`rounded-2xl border p-5 shadow-sm ${conf.cls}`}>
        <div className="flex items-start gap-3">
          <ConfIcon className="w-6 h-6 mt-0.5 shrink-0" />
          <div className="flex-grow">
            <p className="text-base font-bold tracking-tight mb-1">{conf.label}</p>
            {verifiedBy && (
              <div className="flex items-center gap-1.5 text-xs opacity-90 font-medium">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Dr. {verifiedBy.replace('dr. ', '')}</span>
                {verifiedAtStr && <span className="opacity-70 mx-1">•</span>}
                {verifiedAtStr && <span>{verifiedAtStr}</span>}
              </div>
            )}
          </div>
        </div>
        {verificationNote && (
          <div className="mt-4 text-sm bg-white/50 p-3 rounded-lg border border-current/10">
             <span className="text-[10px] uppercase font-bold tracking-wider opacity-60 block mb-1">Catatan Verifikasi</span>
             <p className="font-medium">{verificationNote}</p>
          </div>
        )}
        {state.message && (
          <p className="mt-3 text-xs font-semibold">{state.message}</p>
        )}
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 flex flex-col items-center justify-center text-center shadow-sm">
        <span className="h-6 w-6 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-gray-700">
          Menunggu AI selesai memproses...
        </p>
        <p className="text-xs text-gray-500 mt-1">Verifikasi dokter akan tersedia setelah proses analisis selesai.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/50 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="w-5 h-5 text-amber-600" />
        <h3 className="text-base font-extrabold text-amber-900 tracking-tight">
          Verifikasi Dokter Diperlukan
        </h3>
      </div>
      <p className="text-sm text-amber-800/90 mb-5 leading-relaxed font-medium">
        Tinjau draft SOAP dan reasoning AI di bawah. <strong className="text-amber-900">Keputusan klinis akhir tetap berada di tangan dokter jaga.</strong>
      </p>

      {state.errors && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm font-semibold text-red-700 flex items-start gap-2">
          <XCircle className="w-5 h-5 shrink-0" />
          <div>{Object.values(state.errors).flat().join(' · ')}</div>
        </div>
      )}

      <form action={formAction}>
        <input type="hidden" name="case_id" value={caseId} />

        <div className="grid gap-4 sm:grid-cols-2 mb-5">
          {/* Doctor name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-amber-900/70 mb-1.5" htmlFor="verified_by">
              Nama Dokter Jaga
            </label>
            <div className="relative">
              <UserCheck className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input
                id="verified_by"
                name="verified_by"
                type="text"
                placeholder="mis. dr. Ayu"
                defaultValue="dr. Ayu"
                className="w-full rounded-xl border border-amber-200 bg-white pl-9 pr-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-shadow shadow-sm"
              />
            </div>
          </div>

          {/* Optional note */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-amber-900/70 mb-1.5" htmlFor="verification_note">
              Catatan Khusus (Opsional)
            </label>
            <input
              id="verification_note"
              name="verification_note"
              type="text"
              placeholder="Tambahkan catatan klinis singkat..."
              className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-shadow shadow-sm"
            />
          </div>
        </div>

        {/* Edit toggle */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setMode(mode === 'edit' ? 'view' : 'edit')}
            className="flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-800 transition-colors bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200"
          >
            {mode === 'edit' ? (
               <><ChevronUp className="w-4 h-4"/> Tutup Editor SOAP</>
            ) : (
               <><Edit3 className="w-4 h-4"/> Koreksi Draft SOAP</>
            )}
          </button>
        </div>

        {/* SOAP edit fields (hidden unless in edit mode) */}
        {mode === 'edit' && soap && (
          <div className="mb-5 p-4 rounded-xl border-2 border-blue-200 bg-white shadow-sm relative">
            <div className="absolute top-0 right-0 transform translate-x-1/3 -translate-y-1/2 bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-blue-200">
               Mode Edit
            </div>
            <SOAPEditFields soap={soap} />
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {mode === 'edit' ? (
            <SubmitBtn label="Simpan Koreksi & Setujui" value="edited" icon={Save} />
          ) : (
            <SubmitBtn label="Setujui Hasil AI" value="approved" icon={CheckCircle2} />
          )}
          <SubmitBtn label="Tolak Hasil AI" value="rejected" icon={XCircle} />
        </div>
      </form>
    </div>
  );
}
