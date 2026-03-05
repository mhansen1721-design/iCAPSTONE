export enum DementiaStage {
  EARLY = 'Early Stage (Mild)',
  MIDDLE = 'Middle Stage (Moderate)',
  LATE = 'Late Stage (Severe)',
}

export type AvatarType = 'jellyfish' | 'panda' | 'axolotl';

// Added ViewState with 'CHAT' to fix the App.tsx squiggle
export type ViewState = 'LOGIN' | 'DASHBOARD' | 'CONFIG' | 'CHAT';

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
