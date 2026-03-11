export enum DementiaStage {
  EARLY = 'Early Stage (Mild)',
  MIDDLE = 'Middle Stage (Moderate)',
  LATE = 'Late Stage (Severe)',
}

export type AvatarType = 'jellyfish' | 'panda' | 'axolotl';


// types.ts
export interface FamilyMember {
  name: string;
  relation: string;
}

export interface PatientProfile {
  patient_id: string; // Primary ID
  id?: string;        // Optional alias
  name: string;       // We'll use this for the UI
  avatarType: AvatarType;
  age: number;
  stage: DementiaStage;
  description: string;
  familyMembers: FamilyMember[]; // Required (initialize as empty array [])
  lifestyles: string[];          // Required
  triggers: string[];            // Required
  safeTopics: string[];          // Required
  aiSuggestionsLoaded: boolean;
}
  

export interface AISuggestionResponse {
  suggestedSafeTopics: string[];
  suggestedTriggers: string[];
  suggestedActivity: string;
}
export interface SessionLog {
  id: string;
  patientId: string;
  patientName: string;
  timestamp: string;
  transcript: string;
}

// types.ts
export type ViewState = 'LOGIN' | 'ROLE_SELECTION' | 'DASHBOARD' | 'PATIENT_DETAIL' | 'CONFIG' | 'CHAT' | 'LOGS' | 'PATIENT_PICKER';