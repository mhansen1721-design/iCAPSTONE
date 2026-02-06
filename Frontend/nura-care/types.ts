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
  name: string;
  avatarType: AvatarType;
  age: number;
  stage: DementiaStage;
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

export type ViewState = 'LOGIN' | 'DASHBOARD' | 'CONFIG';
