export type Discipline = 'BJJ_GI' | 'NO_GI_GRAPPLING';
export type Belt = 'WHITE' | 'BLUE' | 'PURPLE' | 'BROWN' | 'BLACK';
export type AthleteGoal = 'GENERAL_DEVELOPMENT' | 'COMPETITION' | 'RETURN_AFTER_BREAK';

export interface PublicUser {
  id: string;
  email: string;
  emailVerified: boolean;
  athleteProfileCompleted: boolean;
}

export interface AthleteProfile {
  disciplines: Discipline[];
  belt?: Belt;
  experienceYears: number;
  trainingSessionsPerWeek: number;
  competitionExperience: boolean;
  goals: AthleteGoal[];
}

export type { AdminApiPath, UserApiPath } from './openapi-paths.js';
