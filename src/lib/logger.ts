/**
 * @fileoverview Structured JSON logger facade for the orchestrator service.
 *
 * All log output is newline-delimited JSON, suitable for Railway log drains and
 * any structured log aggregator. Every entry includes a level, event name,
 * unix timestamp, and optional context fields.
 *
 * Usage: import { logger } from '../lib/logger';
 *
 * @module lib/logger
 */

/** Optional context object attached to every log entry. */
export interface LogContext {
  traceId?: string;
  [key: string]: unknown;
}

function format(level: string, event: string, ctx?: LogContext, error?: unknown): string {
  const entry: Record<string, unknown> = { level, event, ts: Date.now(), ...ctx };
  if (error instanceof Error) {
    entry.error = error.message;
    entry.stack = error.stack;
  } else if (error !== undefined) {
    entry.error = String(error);
  }
  return JSON.stringify(entry);
}

/**
 * Structured logger with info, warn, and error levels.
 *
 * All methods accept a snake_case event name and an optional context object.
 * The `error` method takes the thrown value as its second argument so that
 * Error message and stack are automatically serialized.
 *
 * @example
 * logger.info('job_started', { jobName: 'security-scan', traceId });
 * logger.warn('rate_limit_approaching', { remaining: 5 });
 * logger.error('github_api_failed', err, { repo: 'example.richi.solutions' });
 */
export const logger = {
  /**
   * Logs an informational event.
   *
   * @param event - Snake_case event identifier (e.g. 'job_started')
   * @param ctx - Optional structured context merged into the log entry
   */
  info(event: string, ctx?: LogContext): void {
    console.log(format('info', event, ctx));
  },

  /**
   * Logs a warning event (non-fatal, but worth investigating).
   *
   * @param event - Snake_case event identifier
   * @param ctx - Optional structured context merged into the log entry
   */
  warn(event: string, ctx?: LogContext): void {
    console.warn(format('warn', event, ctx));
  },

  /**
   * Logs an error event with the associated thrown value.
   *
   * @param event - Snake_case event identifier (e.g. 'github_api_failed')
   * @param error - The caught error (Error instance or any value)
   * @param ctx - Optional structured context merged into the log entry
   */
  error(event: string, error: unknown, ctx?: LogContext): void {
    console.error(format('error', event, ctx, error));
  },
};
