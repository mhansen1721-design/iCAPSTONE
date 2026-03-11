export enum DementiaStage {
  EARLY = 'Early Stage (Mild)',
  MIDDLE = 'Middle Stage (Moderate)',
  LATE = 'Late Stage (Severe)',
}

export type AvatarType = 'jellyfish' | 'panda' | 'axolotl';


export interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  photo?: string;
  notes?: string;
}

export interface PatientProfile {
  id: string;
  patient_id?: string; // Critical: Fixes the 'patient_id does not exist' error
  name: string;
  full_name?: string;  // Added for backend compatibility
  avatarType: AvatarType;
  age: number;
  stage: DementiaStage;
  dementia_stage?: string; // Added for backend compatibility
  description: string;
  
  // Personalization
  familyMembers: FamilyMember[];
  lifestyles: string[]; // Hobbies & Career
  mediaDocs: string[]; // Scanned letters, albums
  triggers: string[]; // Known confusion/stress topics
  safeTopics: string[]; // Approved topics
  
  // AI Suggestions Status
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

export type ViewState = 'LOGIN' | 'ROLE_SELECTION' | 'DASHBOARD' | 'PATIENT_DETAIL' | 'CONFIG' | 'CHAT' | 'SESSION_LOGS';