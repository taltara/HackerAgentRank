import type { RuntimeCatalog, RuntimeName } from "./runtimes";

export type { RuntimeCatalog, RuntimeName } from "./runtimes";

export interface CategoryResult {
  key: string;
  label: string;
  icon: string;
  score: number;
  max: number;
  evidence: string;
}

export interface RoleEvaluation {
  role: string;
  position_title: string;
  categories: CategoryResult[];
  total_score: number;
  total_max: number;
  bonus_points: number;
  bonus_breakdown: string;
  deductions: number;
  deduction_reasons: string;
  key_strengths: string[];
  areas_for_improvement: string[];
  overall: number;
  max_final_score: number;
}

export interface EvaluationResult {
  candidate_name: string;
  model: string;
  github_enriched: boolean;
  resume: Record<string, unknown> | null;
  github: Record<string, unknown> | null;
  evaluations: RoleEvaluation[];
  runtime?: RuntimeName | string;
}

export interface RoleSummary {
  name: string;
  position_title: string;
  description: string;
  categories: { key: string; label: string; max: number; icon: string }[];
  bonus_max: number;
  max_final_score: number;
  department: string;
  source: string;
}

export interface ModelsInfo {
  default: string;
  available: string[];
  runtimes?: Record<string, RuntimeCatalog>;
}

export type StageStatus = "pending" | "running" | "done" | "skipped" | "error";

export interface PlannedStage {
  id: string;
  label: string;
}

export type PipelineEvent =
  | { type: "plan"; stages: PlannedStage[]; model: string; runtime?: string }
  | { type: "stage"; id: string; label: string; status: StageStatus; detail?: string | null }
  | { type: "partial"; evaluation: RoleEvaluation }
  | { type: "complete"; result: EvaluationResult }
  | { type: "error"; detail: string };
