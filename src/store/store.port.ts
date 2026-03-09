import { Result } from '../lib/result';
import { JobResult } from '../contracts/v1/job-result.schema';

export interface CommitSummaryInput {
  jobRunId: string;
  summaryDate: string;
  content: string;
  reposActive: string[];
  totalCommits: number;
}

export interface SocialContentComponent {
  componentType: 'caption' | 'hook' | 'cta' | 'thread' | 'video_script' | 'image_prompt' | 'hashtags';
  content: string;
  sortOrder: number;
}

export interface SocialContentInput {
  jobRunId: string;
  postDate: string;
  contentType: 'image_post' | 'carousel' | 'text' | 'short';
  shouldPost: boolean;
  reason: string;
  components: SocialContentComponent[];
  platforms: string[];
}

export interface StorePort {
  saveJobRun(result: JobResult): Promise<Result<{ id: string }>>;
  getLatestJobRun(jobName: string): Promise<Result<JobResult | null>>;
  listJobRuns(opts: { jobName?: string; limit?: number }): Promise<Result<JobResult[]>>;
  saveCommitSummary(input: CommitSummaryInput): Promise<Result<{ id: string }>>;
  saveSocialContent(input: SocialContentInput): Promise<Result<{ id: string }>>;
}
