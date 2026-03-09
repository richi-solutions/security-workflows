import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { JobDefinition } from '../../contracts/v1/schedule.schema';
import { JobResult } from '../../contracts/v1/job-result.schema';
import { StorePort } from '../../store/store.port';
import { ClaudePort } from '../../claude/claude.port';
import { Result, success, failure } from '../../lib/result';
import { logger } from '../../lib/logger';

const MAX_WAIT_MS = 30 * 60 * 1000; // 30 minutes
const POLL_INTERVAL_MS = 60 * 1000; // 1 minute

export class ChainHandler {
  constructor(
    private store: StorePort,
    private claude: ClaudePort,
    private agentsDir: string,
  ) {}

  async run(jobName: string, jobDef: JobDefinition): Promise<Result<JobResult>> {
    const traceId = uuidv4();
    const startedAt = new Date().toISOString();

    if (!jobDef.depends_on) {
      return failure('EXECUTOR_ERROR', `Chain job ${jobName} has no depends_on`, traceId);
    }

    // Wait for dependency result from today
    const dependencyResult = await this.waitForDependency(jobDef.depends_on, traceId);
    if (!dependencyResult.ok) return dependencyResult;

    const upstream = dependencyResult.data;
    if (!upstream) {
      return failure('EXECUTOR_ERROR', `No result found for dependency: ${jobDef.depends_on}`, traceId);
    }

    logger.info('chain_dependency_resolved', { traceId, jobName, dependency: jobDef.depends_on, upstreamStatus: upstream.status });

    // Load agent prompt
    const agentName = jobDef.agent ?? jobName;
    const promptPath = path.resolve(this.agentsDir, `${agentName}.md`);
    let systemPrompt: string;
    try {
      systemPrompt = fs.readFileSync(promptPath, 'utf-8');
    } catch {
      return failure('EXECUTOR_ERROR', `Agent prompt not found: ${promptPath}`, traceId);
    }

    // Build input from upstream results
    const upstreamOutput = upstream.results
      .map((r) => r.output ?? '')
      .filter(Boolean)
      .join('\n\n');

    const claudeResult = await this.claude.complete({
      systemPrompt,
      userMessage: `Based on the output of the "${jobDef.depends_on}" job:\n\n${upstreamOutput}`,
      maxTokens: 4096,
    });

    const completedAt = new Date().toISOString();

    if (!claudeResult.ok) {
      return success({
        jobName,
        jobType: 'chain',
        startedAt,
        completedAt,
        durationMs: new Date(completedAt).getTime() - new Date(startedAt).getTime(),
        status: 'failure',
        targets: [jobDef.depends_on],
        results: [{ target: jobDef.depends_on, status: 'failure', error: claudeResult.error.message }],
      });
    }

    // Try to parse structured JSON output for social content
    const rawContent = claudeResult.data.content;
    const socialMeta = this.parseSocialOutput(rawContent);

    return success({
      jobName,
      jobType: 'chain',
      startedAt,
      completedAt,
      durationMs: new Date(completedAt).getTime() - new Date(startedAt).getTime(),
      status: 'success',
      targets: [jobDef.depends_on],
      results: [{ target: jobDef.depends_on, status: 'success', output: rawContent }],
      summary: rawContent.substring(0, 500),
      ...(socialMeta ? { _socialMeta: socialMeta } : {}),
    });
  }

  private parseSocialOutput(raw: string): { contents: Array<{ contentType: string; shouldPost: boolean; reason: string; platforms: string[]; components: Array<{ componentType: string; content: string; sortOrder: number }> }> } | null {
    try {
      // Strip markdown code fences if present
      const cleaned = raw.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim();
      const parsed = JSON.parse(cleaned);

      if (!parsed.contents || !Array.isArray(parsed.contents)) return null;

      return {
        contents: parsed.contents.map((c: Record<string, unknown>) => ({
          contentType: String(c.content_type ?? ''),
          shouldPost: Boolean(c.should_post),
          reason: String(c.reason ?? ''),
          platforms: Array.isArray(c.platforms) ? c.platforms.map(String) : [],
          components: Array.isArray(c.components)
            ? (c.components as Array<Record<string, unknown>>).map((comp) => ({
                componentType: String(comp.component_type ?? ''),
                content: String(comp.content ?? ''),
                sortOrder: Number(comp.sort_order ?? 0),
              }))
            : [],
        })),
      };
    } catch {
      logger.warn('chain_social_parse_failed', { raw: raw.substring(0, 200) });
      return null;
    }
  }

  private async waitForDependency(depName: string, traceId: string): Promise<Result<JobResult | null>> {
    const today = new Date().toISOString().split('T')[0];
    const deadline = Date.now() + MAX_WAIT_MS;

    while (Date.now() < deadline) {
      const result = await this.store.getLatestJobRun(depName);
      if (!result.ok) return result;

      if (result.data && result.data.completedAt.startsWith(today)) {
        return success(result.data);
      }

      logger.info('chain_waiting', { traceId, dependency: depName, nextCheckIn: POLL_INTERVAL_MS });
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }

    return success(null);
  }
}
