import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Mirror the DISABLE_CRON field definition from env.ts
// Uses explicit string transform instead of z.coerce.boolean() to avoid
// the JavaScript Boolean("false") === true pitfall.
const DisableCronSchema = z.object({
  DISABLE_CRON: z.string().default('false').transform((v) => v === 'true' || v === '1'),
});

describe('DISABLE_CRON env var', () => {
  it('defaults to false when not set', () => {
    const result = DisableCronSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.DISABLE_CRON).toBe(false);
  });

  it('parses "true" as true', () => {
    const result = DisableCronSchema.safeParse({ DISABLE_CRON: 'true' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.DISABLE_CRON).toBe(true);
  });

  it('parses "1" as true', () => {
    const result = DisableCronSchema.safeParse({ DISABLE_CRON: '1' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.DISABLE_CRON).toBe(true);
  });

  it('parses "false" as false', () => {
    const result = DisableCronSchema.safeParse({ DISABLE_CRON: 'false' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.DISABLE_CRON).toBe(false);
  });

  it('parses "0" as false', () => {
    const result = DisableCronSchema.safeParse({ DISABLE_CRON: '0' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.DISABLE_CRON).toBe(false);
  });

  it('parses empty string as false', () => {
    const result = DisableCronSchema.safeParse({ DISABLE_CRON: '' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.DISABLE_CRON).toBe(false);
  });
});
