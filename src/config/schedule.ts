/**
 * @fileoverview Schedule configuration loader.
 *
 * Reads a YAML schedule file from disk, validates it against `ScheduleConfigSchema`,
 * and returns a typed `ScheduleConfig` object. The process exits immediately if the
 * file does not exist or fails schema validation.
 *
 * @module config/schedule
 */

import fs from 'fs';
import { parse } from 'yaml';
import { ScheduleConfigSchema, ScheduleConfig } from '../contracts/v1/schedule.schema';
import { logger } from '../lib/logger';

/**
 * Loads and validates the YAML schedule file at the given path.
 *
 * Exits the process (`process.exit(1)`) if the file is not found or if
 * the YAML does not match `ScheduleConfigSchema`. This is intentional —
 * a broken schedule at startup is a fatal misconfiguration.
 *
 * @param path - Absolute or relative path to the `schedule.yaml` file
 * @returns Validated schedule configuration
 *
 * @example
 * const schedule = loadSchedule(env.SCHEDULE_PATH);
 * // schedule.jobs['security-scan'].cron === '0 2 * * *'
 */
export function loadSchedule(path: string): ScheduleConfig {
  if (!fs.existsSync(path)) {
    logger.error('schedule_not_found', new Error(`Schedule file not found: ${path}`));
    process.exit(1);
  }

  const raw = fs.readFileSync(path, 'utf-8');
  const parsed = parse(raw);
  const result = ScheduleConfigSchema.safeParse(parsed);

  if (!result.success) {
    logger.error('schedule_invalid', result.error, { path });
    process.exit(1);
  }

  logger.info('schedule_loaded', { path, jobCount: Object.keys(result.data.jobs).length });
  return result.data;
}
