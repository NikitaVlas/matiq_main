export interface AthleteProfileInput {
  disciplines: string[];
  experienceYears: number;
  trainingSessionsPerWeek: number;
  goals: string[];
}

export function profileIsComplete(profile: AthleteProfileInput): boolean {
  return (
    profile.disciplines.length > 0 &&
    profile.experienceYears >= 0 &&
    profile.trainingSessionsPerWeek > 0 &&
    profile.goals.length > 0
  );
}
