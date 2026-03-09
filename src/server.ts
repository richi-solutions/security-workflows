import 'dotenv/config';
import express from 'express';
import path from 'path';
import { loadEnv } from './config/env';
import { loadSchedule } from './config/schedule';
import { logger } from './lib/logger';

// Adapters
import { GitHubAdapter } from './github/github.adapter';
import { ClaudeAdapter } from './claude/claude.adapter';
import { SupabaseStoreAdapter } from './store/supabase-store.adapter';
import { GitHubDiscoveryAdapter } from './discovery/github-discovery.adapter';

// Executor + Handlers
import { Executor } from './executor/executor';
import { SweepHandler } from './executor/handlers/sweep.handler';
import { AggregateHandler } from './executor/handlers/aggregate.handler';
import { ChainHandler } from './executor/handlers/chain.handler';
import { ProvisionHandler } from './executor/handlers/provision.handler';

// Scheduler
import { Scheduler } from './scheduler/scheduler';

// Routes
import { healthRouter } from './routes/health';
import { createTriggerRouter } from './routes/trigger';

// --- Composition Root ---
const env = loadEnv();
const schedule = loadSchedule(env.SCHEDULE_PATH);
const agentsDir = path.resolve(process.cwd(), 'agents');

// Instantiate adapters
const github = new GitHubAdapter(env.GITHUB_TOKEN);
const claude = new ClaudeAdapter(env.ANTHROPIC_API_KEY, env.CLAUDE_MODEL);
const store = new SupabaseStoreAdapter(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
const discovery = new GitHubDiscoveryAdapter(github, env.GITHUB_ORG);

// Instantiate handlers
const sweepHandler = new SweepHandler(discovery, claude, agentsDir);
const aggregateHandler = new AggregateHandler(discovery, github, claude, store, env.GITHUB_ORG, agentsDir);
const chainHandler = new ChainHandler(store, claude, agentsDir);
const provisionHandler = new ProvisionHandler(discovery);

// Instantiate executor
const executor = new Executor(sweepHandler, aggregateHandler, chainHandler, provisionHandler);

// Job execution pipeline
async function executeJob(jobName: string, jobDef: import('./contracts/v1/schedule.schema').JobDefinition): Promise<void> {
  const result = await executor.execute(jobName, jobDef);

  if (result.ok) {
    const storeResult = await store.saveJobRun(result.data);
    if (storeResult.ok) {
      logger.info('job_completed_and_stored', { jobName, status: result.data.status, id: storeResult.data.id });

      // Save to use-case-specific tables
      if (result.data._commitMeta) {
        const summaryContent = result.data.results.find((r) => r.output)?.output ?? result.data.summary ?? '';
        await store.saveCommitSummary({
          jobRunId: storeResult.data.id,
          summaryDate: new Date().toISOString().split('T')[0],
          content: summaryContent,
          reposActive: result.data._commitMeta.reposActive,
          totalCommits: result.data._commitMeta.totalCommits,
        });
      }

      if (result.data._socialMeta) {
        for (const item of result.data._socialMeta.contents) {
          await store.saveSocialContent({
            jobRunId: storeResult.data.id,
            postDate: new Date().toISOString().split('T')[0],
            contentType: item.contentType as 'image_post' | 'carousel' | 'text' | 'short',
            shouldPost: item.shouldPost,
            reason: item.reason,
            components: item.components.map((c) => ({
              componentType: c.componentType as 'caption' | 'hook' | 'cta' | 'thread' | 'video_script' | 'image_prompt' | 'hashtags',
              content: c.content,
              sortOrder: c.sortOrder,
            })),
            platforms: item.platforms,
          });
        }
      }
    } else {
      logger.error('job_store_failed', new Error(storeResult.error.message), { jobName });
    }
  } else {
    logger.error('job_execution_failed', new Error(result.error.message), { jobName, traceId: result.traceId });
  }
}

// Instantiate scheduler
const scheduler = new Scheduler(schedule, executeJob);

// --- Express App ---
const app = express();
app.use(express.json());
app.use(healthRouter);
app.use(createTriggerRouter(scheduler));

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({
    ok: false,
    error: { code: 'NOT_FOUND', message: 'Endpoint not found.' },
  });
});

// --- Start ---
const server = app.listen(env.PORT, () => {
  logger.info('server_started', { port: env.PORT, env: env.NODE_ENV });
  scheduler.start();
});

// Graceful shutdown
function shutdown(signal: string): void {
  logger.info('shutdown_initiated', { signal });
  scheduler.stop();
  server.close(() => {
    logger.info('server_closed');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
