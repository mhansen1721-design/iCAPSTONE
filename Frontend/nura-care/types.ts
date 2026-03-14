export enum DementiaStage {
  EARLY = 'Early Stage (Mild)',
  MIDDLE = 'Middle Stage (Moderate)',
  LATE = 'Late Stage (Severe)',
}

export type AvatarType = 'jellyfish' | 'panda' | 'axolotl';

export interface FamilyMember {
  name: string;
  relation: string;
}

export interface PatientProfile {
  patient_id: string;           // Primary ID from backend
  id?: string;                  // Optional alias (kept for backward compat)
  name: string;                 // Display name used in UI
  full_name?: string;           // Backend field (mapped to name on load)
  avatarType: AvatarType;
  age: number;
  stage: DementiaStage;
  description: string;
  familyMembers: FamilyMember[];
  lifestyles: string[];
  triggers: string[];
  safeTopics: string[];
  aiSuggestionsLoaded: boolean;
  // Care Circle fields (populated by backend)
  access_code?: string;
  authorized_users?: string[];
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
  endReason: 'completed' | 'early'; // 'completed' = timer ended | 'early' = End Session button
}

export interface CareJournalPost {
  entry_id: string;
  author_name: string;
  author_email: string;
  content: string;
  type: 'update' | 'medication' | 'problem' | 'milestone';
  timestamp: string;
}

export interface HelpRequest {
  request_id: string;
  author_name: string;
  author_email: string;
  title: string;
  description: string;
  status: 'open' | 'claimed' | 'done';
  claimed_by: string | null;
  claimed_name: string | null;
  timestamp: string;
}

export interface MemoryPhoto {
  photo_id: string;
  filename: string;
  url: string;
  description: string;
  uploaded_by_email: string;
  uploaded_by_name: string;
  timestamp: string;
}

export interface CaregiverInfo {
  email: string;
  full_name: string;
}

// Added CARE_CENTER for the Care Circle Hub view
export type ViewState =
  | 'LOGIN'
  | 'ROLE_SELECTION'
  | 'DASHBOARD'
  | 'PATIENT_DETAIL'
  | 'CONFIG'
  | 'CHAT'
  | 'LOGS'
  | 'PATIENT_PICKER'
  | 'SETTINGS'
  | 'CARE_CENTER';

export interface AppSettings {
  fontSize: 'small' | 'medium' | 'large';
  colorPalette: 'deep-space' | 'serene-nature' | 'high-clarity' | 'twilight' | 'default';
  reducedMotion: boolean;
}