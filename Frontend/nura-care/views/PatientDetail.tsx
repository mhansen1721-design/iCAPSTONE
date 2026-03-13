import React from 'react';
import type { PatientProfile, SessionLog } from '../types';
import { ChevronLeft } from 'lucide-react';
import { ConfigFlow } from './ConfigFlow';

interface PatientDetailProps {
  patient: PatientProfile;
  sessionLogs: SessionLog[];
  onBack: () => void;
  onSaveConfig: (updatedProfile: PatientProfile) => void;
  onStartChat: (mins: number) => void;
  onOpenSettings: () => void;
  caregiverEmail: string;
}

/**
 * PatientDetail — Configure-only view.
 *
 * Analytics and session logs are now consolidated inside CareCenter,
 * accessible via the Analytics and Logs top-level tabs with the
 * patient selector dropdown. This view is intentionally focused on
 * patient profile configuration only.
 */
export const PatientDetail: React.FC<PatientDetailProps> = ({
  patient,
  onBack,
  onSaveConfig,
  caregiverEmail,
}) => {
  return (
    <div className="w-full max-w-6xl mx-auto p-6 animate-in fade-in duration-700 pb-32">

      {/* Header */}
      <header className="mb-8 mt-4 flex items-center justify-between border-b border-white/5 pb-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-nura-accent/20 rounded-full transition-all bg-[var(--nura-card)] border-white/10"
        >
          <ChevronLeft size={44} className="text-indigo-200" />
        </button>
        <div className="flex-1 text-center">
          <p className="text-indigo-200/60 text-xs font-black uppercase tracking-widest mb-1">Configure</p>
          <h1 className="text-4xl font-extrabold text-[var(--nura-text)]">
            Edit {patient.name || patient.full_name}'s Details
          </h1>
        </div>
        {/* Spacer to keep title centred */}
        <div className="w-[60px]" />
      </header>

      {/* Configure content */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <ConfigFlow
          patient={patient}
          caregiverEmail={caregiverEmail}
          onSave={onSaveConfig}
          onBack={onBack}
          isSubView={true}
        />
      </div>
    </div>
  );
};
