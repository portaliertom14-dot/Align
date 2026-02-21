/**
 * Types partagés — secteur/métier, undetermined, answersHash.
 */

export const SECTOR_UNDETERMINED = 'undetermined';
export const JOB_UNDETERMINED = 'undetermined';

export type SectorIdOrUndetermined = string;
export type JobIdOrUndetermined = string;

export interface SectorScore {
  secteurId: string;
  score: number;
}

export interface SectorResult {
  secteurId: string | typeof SECTOR_UNDETERMINED;
  secteurName: string;
  description: string;
  top3: SectorScore[];
  confidence: number;
  promptVersion?: string;
  whitelistVersion?: string;
}

export interface JobScore {
  jobId: string;
  score: number;
}

export interface JobResult {
  jobId: string | typeof JOB_UNDETERMINED;
  jobName?: string;
  description?: string;
  reasonShort?: string;
  undeterminedReason?: string;
  top3?: JobScore[];
  promptVersion?: string;
}

export function stableAnswersHash(answers: Record<string, unknown>): string {
  const str = JSON.stringify(answers);
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) + str.charCodeAt(i);
  return (h >>> 0).toString(16);
}
