/**
 * TypeScript shapes for the report payload.
 *
 * Mirrors schema/report.schema.json (v1.0.0). Keep in sync by hand for now;
 * the schema is the source of truth, this file is purely for editor IntelliSense.
 */

export type Verdict = "clean" | "suspicious" | "malicious" | "unknown";

export const VERDICTS: readonly Verdict[] = [
  "clean",
  "suspicious",
  "malicious",
  "unknown",
] as const;

export interface ScannerRun {
  workflow?: string;
  run_id?: string;
  run_url?: string;
  attempt?: number;
}

export interface Catalogue {
  owner: string;
  repo: string;
  ref: string;
  sha?: string;
}

export interface ScannerInfo {
  enabled?: boolean;
  version_pin?: string;
  signatures_age_hours?: number;
}

export interface ScannersBlock {
  skillspector?: ScannerInfo;
  // Multi-scanner ready: additional scanners can slot in here once they ship.
  [key: string]: ScannerInfo | undefined;
}

export interface VerdictCounts {
  clean: number;
  suspicious: number;
  malicious: number;
  unknown: number;
}

export interface Summary {
  total_skills: number;
  verdicts: VerdictCounts;
}

export interface FindingByRule {
  id: string;
  severity: string;
  count: number;
}

export interface SkillspectorSummary {
  crashed?: boolean;
  json_missing?: boolean;
  risk_score?: number;
  risk_severity?: string;
  risk_recommendation?: string;
  findings_by_severity?: Record<string, number>;
  findings_by_rule?: FindingByRule[];
}

export interface SkillScanners {
  skillspector?: SkillspectorSummary;
}

export interface SkillArtifacts {
  skillspector_json?: string;
  skillspector_sarif?: string;
}

export interface SkillEntry {
  namespace: string;
  slug: string;
  source_repo: string;
  source_ref: string;
  source_sha?: string;
  skill_path?: string;
  verdict: Verdict;
  reasons?: string[];
  scanners?: SkillScanners;
  artifacts?: SkillArtifacts;
}

export interface Report {
  schema_version: string;
  generated_at: string;
  scanner_run?: ScannerRun;
  catalogue?: Catalogue;
  scanners?: ScannersBlock;
  summary?: Summary;
  skills?: SkillEntry[];
}

export interface HistoryEntry {
  stamp: string; // "2026-06-10T22-17Z"
  generated_at: string; // ISO timestamp
  path: string; // "history/2026-06-10/2217.json"
  summary?: Summary;
}

export interface HistoryIndex {
  generated_at: string;
  entries: HistoryEntry[];
}
