/**
 * @fileoverview Port interface for Claude (Anthropic) completions.
 *
 * Adapters implementing this port provide access to Claude's messages API.
 * The production implementation is `ClaudeAdapter`; tests use a mock.
 *
 * @module claude/claude.port
 */

import { Result } from '../lib/result';

/** Input shape for a single-turn Claude completion request. */
export interface ClaudeRequest {
  /** System-level instructions prepended to the conversation. */
  systemPrompt: string;
  /** The user's message content. */
  userMessage: string;
  /** Claude model ID. Defaults to the value from `Env.CLAUDE_MODEL`. */
  model?: string;
  /** Maximum tokens in the response. Defaults to 4096. */
  maxTokens?: number;
}

/** Output shape returned from a successful Claude completion. */
export interface ClaudeResponse {
  /** Full text content extracted from all text blocks in the response. */
  content: string;
  /** The model ID that actually served the request (may differ from the requested model). */
  model: string;
  /** Number of tokens consumed by the prompt. */
  inputTokens: number;
  /** Number of tokens in the completion. */
  outputTokens: number;
}

/**
 * Port interface for Claude AI completions.
 *
 * Implementations must handle authentication, retries on 429/5xx, and must
 * return errors as `failure(...)` results rather than throwing.
 */
export interface ClaudePort {
  /**
   * Sends a single-turn completion request to Claude.
   *
   * @param request - System prompt, user message, and optional model/token overrides
   * @returns Result with the Claude response, or a failure with code 'CLAUDE_ERROR'
   */
  complete(request: ClaudeRequest): Promise<Result<ClaudeResponse>>;
}
