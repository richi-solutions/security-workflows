import { z } from 'zod';

export const TargetResultSchema = z.object({
  target: z.string(),
  status: z.enum(['success', 'failure', 'skipped']),
  output: z.string().optional(),
  error: z.string().optional(),
});

export const JobResultSchema = z.object({
  jobName: z.string(),
  jobType: z.string(),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime(),
  durationMs: z.number(),
  status: z.enum(['success', 'partial', 'failure']),
  targets: z.array(z.string()),
  results: z.array(TargetResultSchema),
  summary: z.string().optional(),
  // Optional metadata for result-table storage (not persisted in job_runs)
  _commitMeta: z.object({
    reposActive: z.array(z.string()),
    totalCommits: z.number(),
  }).optional(),
  _socialMeta: z.object({
    contents: z.array(z.object({
      contentType: z.string(),
      shouldPost: z.boolean(),
      reason: z.string(),
      platforms: z.array(z.string()),
      components: z.array(z.object({
        componentType: z.string(),
        content: z.string(),
        sortOrder: z.number(),
      })),
    })),
  }).optional(),
});

export type TargetResult = z.infer<typeof TargetResultSchema>;
export type JobResult = z.infer<typeof JobResultSchema>;
