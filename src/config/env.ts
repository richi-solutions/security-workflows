/**
 * @fileoverview Typed, fail-fast environment configuration loader.
 *
 * Validates all required environment variables at startup using Zod.
 * The process exits with a descriptive error if any variable is missing or
 * invalid, preventing silent misconfiguration in production.
 *
 * Consumers should call `loadEnv()` once at startup (e.g. in server.ts) and
 * then use `getEnv()` throughout the application to access the cached result.
 *
 * @module config/env
 */

import { z } from 'zod';

const EnvSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // GitHub
  GITHUB_ORG: z.string().default('richi-solutions'),
  GITHUB_TOKEN: z.string().min(1),

  // Anthropic
  ANTHROPIC_API_KEY: z.string().min(1),
  CLAUDE_MODEL: z.string().default('claude-sonnet-4-6'),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_KEY: z.string().min(1),

  // Auth
  SERVICE_API_KEY: z.string().min(1),

  // Schedule
  SCHEDULE_PATH: z.string().default('./schedule.yaml'),
  DISABLE_CRON: z.string().default('false').transform((v) => v === 'true' || v === '1'),
});

export type Env = z.infer<typeof EnvSchema>;

let _env: Env | null = null;

/**
 * Parses and validates all environment variables against `EnvSchema`.
 *
 * Exits the process immediately (`process.exit(1)`) if any required variable
 * is missing or fails validation, printing a structured error to stderr.
 *
 * The result is cached after the first call — subsequent calls return the
 * same object without re-parsing.
 *
 * @returns Validated and typed environment object
 *
 * @example
 * // In server.ts (composition root):
 * const env = loadEnv();
 * const github = new GitHubAdapter(env.GITHUB_TOKEN);
 */
export function loadEnv(): Env {
  if (_env) return _env;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('[config] Invalid environment:', JSON.stringify(parsed.error.format(), null, 2));
    process.exit(1);
  }
  _env = parsed.data;
  return _env;
}

/**
 * Returns the cached environment object, calling `loadEnv()` on first access.
 *
 * Prefer `getEnv()` inside adapters and middleware where the composition root
 * has already called `loadEnv()` at startup.
 *
 * @returns Validated and typed environment object
 */
export function getEnv(): Env {
  if (!_env) return loadEnv();
  return _env;
}
