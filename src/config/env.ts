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

export function getEnv(): Env {
  if (!_env) return loadEnv();
  return _env;
}
