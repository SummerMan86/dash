import type { EmisGeometryType } from '../../emis-geo';

// --- Run / Batch ---

export type ImportRunStatus = 'started' | 'fetching' | 'matching' | 'completed' | 'failed';

export type ImportRunSummary = {
	id: string;
	sourceCode: string;
	status: ImportRunStatus;
	startedAt: string;
	finishedAt: string | null;
	cntFetched: number;
	cntCandidates: number;
	cntPublished: number;
	cntHeld: number;
	cntErrors: number;
	actorId: string | null;
};

export type ImportRunDetail = ImportRunSummary & {
	params: Record<string, unknown>;
	errorSummary: Record<string, unknown>;
};

// --- Candidate ---

export type CandidateStatus =
	| 'pending'
	| 'matched'
	| 'published'
	| 'held'
	| 'rejected'
	| 'error';

export type CandidateResolution =
	| 'unique'
	| 'duplicate_with_clear_winner'
	| 'possible_duplicate_low_confidence'
	| 'invalid_or_unmapped';

export type ImportCandidateSummary = {
	id: string;
	runId: string;
	sourceCode: string;
	sourceRef: string;
	name: string | null;
	objectTypeCode: string | null;
	countryCode: string | null;
	geometryType: EmisGeometryType | null;
	status: CandidateStatus;
	resolution: CandidateResolution | null;
	promotedObjectId: string | null;
	createdAt: string;
};

export type ImportCandidateDetail = ImportCandidateSummary & {
	nameEn: string | null;
	rawPayload: Record<string, unknown>;
	mappedObjectTypeId: string | null;
	reviewedAt: string | null;
	reviewedBy: string | null;
	matches: CandidateMatch[];
};

// --- Match ---

export type CandidateMatch = {
	id: string;
	matchedObjectId: string;
	matchedObjectName: string;
	score: number | null;
	matchKind: string;
	matchDetails: Record<string, unknown>;
};

// --- Inputs ---

export type TriggerIngestionInput = {
	sourceCode: string;
	params?: Record<string, unknown>;
};

export type ResolveConflictInput = {
	resolution: CandidateResolution;
	targetObjectId?: string;
};

export type ListBatchesInput = {
	sourceCode?: string;
	status?: ImportRunStatus;
	limit?: number;
	offset?: number;
};

export type ListBatchObjectsInput = {
	status?: CandidateStatus;
	resolution?: CandidateResolution;
	limit?: number;
	offset?: number;
};

export type ConflictStatus = 'pending' | 'matched' | 'held' | 'error';

export type ListConflictsInput = {
	sourceCode?: string;
	status?: ConflictStatus;
	geometryType?: EmisGeometryType;
	mapped?: boolean;
	limit?: number;
	offset?: number;
};
