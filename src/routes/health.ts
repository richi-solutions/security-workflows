/**
 * @fileoverview Health check endpoint.
 *
 * GET /health returns { ok: true, data: { status, uptime } }.
 * No authentication required. Used by Railway health checks.
 *
 * @module routes/health
 */

import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  res.json({
    ok: true,
    data: {
      status: 'healthy',
      uptime: Math.floor(process.uptime()),
    },
  });
});
