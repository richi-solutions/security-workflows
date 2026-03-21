/**
 * @fileoverview Port interface for persistent storage of job results.
 *
 * Defines the contract for persisting job runs, commit summaries,
 * and social content. The production adapter uses Supabase.
 *
 * @module store/store.port
 */

import { Result } from '../lib/result';
import { JobResult } from '../contracts/v1/job-result.schema';

/** Input for upserting a project profile (README + metadata from project.yaml). */
export interface ProjectProfileInput {
  repoName: string;
  readmeContent: string | null;
  readmeSha: string | null;
  tagline: string | null;
  description: string | null;
  techStack: string[];
  demoVideoUrl: string | null;
  logoUrl: string | null;
  projectUrl: string | null;
  isPublic: boolean;
}

/** Stored project profile as returned from the database. */
export interface ProjectProfile extends ProjectProfileInput {
  id: string;
  lastSyncedAt: string;
  createdAt: string;
  updatedAt: string;
}

/** Input for persisting a daily commit summary. */
export interface CommitSummaryInput {
  jobRunId: string;
  summaryDate: string;
  content: string;
  reposActive: string[];
  totalCommits: number;
}

/** A single component of a social media content piece. */
export interface SocialContentComponent {
  componentType: 'caption' | 'hook' | 'cta' | 'thread' | 'video_script' | 'image_prompt' | 'hashtags';
  content: string;
  sortOrder: number;
}

/** Input for persisting a social media content piece with components and platform mappings. */
export interface SocialContentInput {
  jobRunId: string;
  postDate: string;
  contentType: 'image_post' | 'carousel' | 'text' | 'short';
  shouldPost: boolean;
  reason: string;
  components: SocialContentComponent[];
  platforms: string[];
}

/**
 * Port interface for persistent job result storage.
 *
 * Implementations persist job runs, commit summaries, and social content
 * to a database. All methods return Result envelopes, never throw.
 */
export interface StorePort {
  /** Persists a completed job run to the `job_runs` table. */
  saveJobRun(result: JobResult): Promise<Result<{ id: string }>>;

  /** Retrieves the most recent job run by name, or null if none exists. */
  getLatestJobRun(jobName: string): Promise<Result<JobResult | null>>;

  /** Lists job runs, optionally filtered by name, ordered by most recent first. */
  listJobRuns(opts: { jobName?: string; limit?: number }): Promise<Result<JobResult[]>>;

  /** Persists a daily commit summary linked to a job run. */
  saveCommitSummary(input: CommitSummaryInput): Promise<Result<{ id: string }>>;

  /** Persists social content with its components and platform mappings. */
  saveSocialContent(input: SocialContentInput): Promise<Result<{ id: string }>>;

  /** Upserts a project profile (insert or update on repo_name conflict). */
  upsertProjectProfile(input: ProjectProfileInput): Promise<Result<{ id: string }>>;

  /** Lists all project profiles, ordered by repo name. */
  listProjectProfiles(): Promise<Result<ProjectProfile[]>>;
}
